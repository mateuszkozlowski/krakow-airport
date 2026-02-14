import React, { useState, useRef, useEffect } from 'react';
import type { ForecastChange } from '@/lib/types/weather';
import { adjustToWarsawTime } from '@/lib/utils/time';
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle, Waves, CloudRain, CloudLightning, Snowflake, CloudSnow, Wind, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMediaQuery } from '@/hooks/use-media-query';

interface HourlyPeriod {
  time: string;
  hour: Date;
  riskLevel: 1 | 2 | 3 | 4;
  riskTitle: string;
  phenomena: string[];
  visibility?: number;
  warnings: string[];
  isProbable?: boolean;
  probability?: number;
  dayLabel?: string; // "today" | "tomorrow" | "day after"
}

interface PhenomenaBar {
  label: string;
  startHour: number;
  endHour: number;
  color: string;
  priority: number; // For smart grouping
}

interface HourlyBreakdownProps {
  forecast: ForecastChange[];
  language: 'en' | 'pl';
}

function splitIntoHourlyPeriods(forecast: ForecastChange[], hoursCount: number = 48): HourlyPeriod[] {
  const now = adjustToWarsawTime(new Date());
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  
  const dayAfterStart = new Date(todayStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 2);
  
  const hours: HourlyPeriod[] = [];
  
  for (let i = 0; i < hoursCount; i++) {
    const hourTime = new Date(now);
    hourTime.setMinutes(0, 0, 0);
    hourTime.setHours(hourTime.getHours() + i);
    
    // Determine day label
    let dayLabel: string | undefined;
    if (hourTime >= dayAfterStart) {
      dayLabel = 'day_after';
    } else if (hourTime >= tomorrowStart) {
      dayLabel = 'tomorrow';
    }
    
    // Find the period that covers this hour
    // Note: p.from and p.to are already adjusted to Warsaw time in getAirportWeather
    // If multiple periods cover this hour (e.g., BASE + TEMPO), prioritize TEMPO/PROB or highest risk
    const matchingPeriods = forecast.filter(p => {
      return hourTime >= p.from && hourTime < p.to;
    });
    
    // Select period: prioritize TEMPO/PROB (they have more specific conditions)
    // Then by highest risk level
    const period = matchingPeriods.sort((a, b) => {
      // TEMPO/PROB first
      if (a.isTemporary && !b.isTemporary) return -1;
      if (!a.isTemporary && b.isTemporary) return 1;
      // Then by risk level
      return b.riskLevel.level - a.riskLevel.level;
    })[0];
    
    // Only add hour if period exists - Open-Meteo extension will happen in lib/weather.ts
    if (period) {
      
      // Clean phenomena - remove emoji and filter out "good conditions" messages
      const cleanPhenomena = period.conditions.phenomena
        .filter(p => p && typeof p === 'string') // Filter out undefined/null
        .filter(p => 
          !p.includes('Dobre warunki') && 
          !p.includes('Good conditions') &&
          !p.includes('No significant') &&
          !p.includes('Brak znaczących')
        )
        .map(p => {
          // Remove ALL emoji and variation selectors more thoroughly
          return p
            .replace(/[\u{1F000}-\u{1F9FF}]/gu, '') // All emoji
            .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
            .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
            .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
            .replace(/[\u{E0000}-\u{E007F}]/gu, '') // Tags
            .trim();
        })
        .filter(p => p.length > 0); // Remove empty strings after cleaning
      
      // Clean warnings - filter out undefined/null
      const cleanWarnings = (period.operationalImpacts || [])
        .filter(w => w && typeof w === 'string');
      
      hours.push({
        time: hourTime.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }).slice(0, 5),
        hour: hourTime,
        riskLevel: period.riskLevel.level,
        riskTitle: period.riskLevel.title,
        phenomena: cleanPhenomena,
        visibility: period.visibility?.meters ?? undefined, // Ensure we get undefined if meters doesn't exist
        warnings: cleanWarnings,
        isProbable: period.isTemporary,
        probability: period.probability,
        dayLabel
      });
    }
  }
  
  return hours;
}

function extractPhenomenaBars(hours: HourlyPeriod[]): PhenomenaBar[] {
  const bars: PhenomenaBar[] = [];
  const processedPhenomena = new Set<string>();
  
  // Priority map for phenomena (higher = more important)
  // MUST match the priority in mobile view!
  const priorityMap: Record<string, number> = {
    'Freezing': 10,
    'Marznąc': 10,
    'FZFG': 10,
    'FZRA': 10,
    'Thunderstorm': 9,
    'Burza': 9,
    'TS': 9,
    'TSRA': 9,
    'Snow': 8, // Increased! Snow higher than fog
    'snow': 8,
    'Śnieg': 8,
    'śnieg': 8,
    // Note: 'Opady' removed - too generic, matches rain/showers incorrectly
    'Rain': 7, // Increased! Rain higher than fog
    'Deszcz': 7,
    'deszcz': 7,
    'Fog': 6, // Decreased
    'Mgła': 6,
    'FG': 6,
    'Mist': 5, // Decreased
    'Zamglenie': 5,
    'BR': 5,
  };
  
  // For each unique phenomenon, find all its ranges
  hours.forEach(hour => {
    hour.phenomena.forEach(phenomenon => {
      // Skip invalid or "No significant weather" messages
      if (!phenomenon || typeof phenomenon !== 'string') return;
      if (phenomenon.includes('No significant') || 
          phenomenon.includes('Brak znaczących') ||
          phenomenon.includes('Dobre warunki') ||
          phenomenon.includes('Good conditions')) {
        return;
      }
      
      if (!processedPhenomena.has(phenomenon)) {
        processedPhenomena.add(phenomenon);
        
        // Calculate priority
        let priority = 0;
        Object.entries(priorityMap).forEach(([key, value]) => {
          if (phenomenon.includes(key)) {
            priority = Math.max(priority, value);
          }
        });
        
        // Find all consecutive ranges for this phenomenon
        let inRange = false;
        let rangeStart = 0;
        
        hours.forEach((h, idx) => {
          const hasPhenomenon = h.phenomena.includes(phenomenon);
          
          if (hasPhenomenon && !inRange) {
            // Start new range
            inRange = true;
            rangeStart = idx;
          } else if (!hasPhenomenon && inRange) {
            // End range
            bars.push(createPhenomenaBar(phenomenon, rangeStart, idx - 1, priority));
            inRange = false;
          }
        });
        
        // Close any open range
        if (inRange) {
          bars.push(createPhenomenaBar(phenomenon, rangeStart, hours.length - 1, priority));
        }
      }
    });
  });
  
  // Sort by priority and return top 4
  return bars.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

function createPhenomenaBar(phenomenon: string, start: number, end: number, priority: number): PhenomenaBar {
  // Simple gray bar, no color coding
  const color = 'bg-slate-600';
  
  return {
    label: phenomenon,
    startHour: start,
    endHour: end + 1, // Make it inclusive
    color,
    priority
  };
}

function getCardColors(level: number): { bg: string; border: string; text: string; accent: string } {
  switch (level) {
    case 4:
      return {
        bg: 'bg-gradient-to-br from-red-900/30 to-red-950/20',
        border: 'border-red-600/60',
        text: 'text-red-300',
        accent: 'bg-red-500/10 border-red-500/20'
      };
    case 3:
      return {
        bg: 'bg-gradient-to-br from-orange-900/30 to-orange-950/20',
        border: 'border-orange-600/60',
        text: 'text-orange-300',
        accent: 'bg-orange-500/10 border-orange-500/20'
      };
    case 2:
      return {
        bg: 'bg-gradient-to-br from-yellow-900/25 to-yellow-950/15',
        border: 'border-yellow-600/50',
        text: 'text-yellow-300',
        accent: 'bg-yellow-500/10 border-yellow-500/20'
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-emerald-900/20 to-emerald-950/10',
        border: 'border-emerald-700/40',
        text: 'text-emerald-300',
        accent: 'bg-emerald-500/10 border-emerald-500/20'
      };
  }
}

function getDayLabel(dayLabel: string | undefined, language: 'en' | 'pl'): string | null {
  if (!dayLabel) return null;
  
  if (language === 'pl') {
    switch (dayLabel) {
      case 'tomorrow': return 'jutro';
      case 'day_after': return 'pojutrze';
      default: return null;
    }
  } else {
    switch (dayLabel) {
      case 'tomorrow': return 'tomorrow';
      case 'day_after': return 'day after';
      default: return null;
    }
  }
}

// Helper to get phenomena icon - shared across component
const getPhenomenaIcon = (label: string, size: string = 'w-4 h-4') => {
  const lower = label.toLowerCase();
  
  // Check for phenomena - order matters! Check more specific first
  if (lower.includes('freez') || lower.includes('marzn')) return <Waves className={`${size} text-cyan-300`} />; // Freezing fog - cyan waves
  if (lower.includes('snow') || lower.includes('śnieg') || lower.includes('snieg')) return <Snowflake className={`${size} text-blue-300`} />; // Snow
  if (lower.includes('rain') || lower.includes('deszcz')) return <CloudRain className={`${size} text-blue-400`} />;
  if (lower.includes('fog') || lower.includes('mgła')) return <Waves className={`${size} text-slate-400`} />;
  if (lower.includes('mist') || lower.includes('zamgle') || lower.includes('zamglenie')) return <Waves className={`${size} text-slate-400`} />;
  if (lower.includes('hail') || lower.includes('grad')) return <CloudSnow className={`${size} text-cyan-400`} />;
  if (lower.includes('thunder') || lower.includes('burz')) return <CloudLightning className={`${size} text-purple-400`} />;
  if (lower.includes('wind') || lower.includes('wiatr')) return <Wind className={`${size} text-slate-400`} />;
  return <Waves className={`${size} text-slate-400`} />;
};

// Helper to get risk icon
const getRiskIcon = (level: number, size: string = 'w-7 h-7') => {
  const strokeWidth = 2.5;
  switch (level) {
    case 4: return <XCircle className={`${size} text-red-400`} strokeWidth={strokeWidth} />;
    case 3: return <AlertTriangle className={`${size} text-orange-400`} strokeWidth={strokeWidth} />;
    case 2: return <AlertCircle className={`${size} text-yellow-400`} strokeWidth={strokeWidth} />;
    default: return <CheckCircle2 className={`${size} text-green-400`} strokeWidth={strokeWidth} />;
  }
};

// Prioritize and simplify phenomena - remove redundancies
function prioritizePhenomena(phenomena: string[], language: 'en' | 'pl'): string[] {
  if (phenomena.length === 0) return [];
  
  // Filter out generic descriptions - keep only specific weather phenomena
  const filtered = phenomena.filter(p => {
    const lower = p.toLowerCase();
    
    // Remove generic visibility/ceiling descriptions (they're shown in header or warnings)
    if (lower.includes('widoczność') || lower.includes('visibility')) return false;
    if (lower.includes('podstawa chmur poniżej') || lower.includes('ceiling below')) return false;
    if (lower.includes('bardzo niska podstawa') || lower.includes('very low ceiling')) return false;
    if (lower.includes('niska podstawa') || lower.includes('low ceiling')) return false;
    
    return true;
  });
  
  // Priority map - higher = more important
  const priorityMap: Record<string, number> = {
    // Freezing conditions - highest priority
    'marznąc': 100, 'freezing': 100, 'fzfg': 100, 'fzra': 100, 'fzdz': 100,
    // Thunderstorms
    'burz': 95, 'thunder': 95, 'ts': 95,
    // Severe precipitation
    'heavy': 85, 'silny': 85, 'obfity': 85,
    // Snow
    'śnieg': 80, 'snow': 80, 'sn': 80,
    // Rain
    'deszcz': 70, 'rain': 70, 'ra': 70,
    // Fog/mist - lower priority (less specific than freezing fog)
    'mgła': 60, 'fog': 60, 'fg': 60,
    'zamglenie': 50, 'mist': 50, 'br': 50,
    'haze': 45, 'hmg': 45
  };
  
  // Calculate priority for each phenomenon
  const withPriority = filtered.map(p => {
    let priority = 0;
    const lower = p.toLowerCase();
    
    for (const [key, value] of Object.entries(priorityMap)) {
      if (lower.includes(key)) {
        priority = Math.max(priority, value);
      }
    }
    
    return { phenomenon: p, priority };
  });
  
  // Remove duplicates based on type (e.g., "Mgła marznąca" supersedes "Mgła")
  const deduplicated: typeof withPriority = [];
  const seen = new Set<string>();
  
  // Sort by priority descending
  withPriority.sort((a, b) => b.priority - a.priority);
  
  for (const item of withPriority) {
    const lower = item.phenomenon.toLowerCase();
    
    // Check if this is a more specific version of something we already have
    let isDuplicate = false;
    
    // If we have "Mgła marznąca", skip plain "Mgła"
    if (lower.includes('mgła') || lower.includes('fog')) {
      if (seen.has('freezing-fog') && !lower.includes('marzn') && !lower.includes('freez')) {
        isDuplicate = true;
      }
      if (lower.includes('marzn') || lower.includes('freez')) {
        seen.add('freezing-fog');
      } else {
        seen.add('fog');
      }
    }
    
    // If we have "Deszcz marznący", skip plain "Deszcz"
    if (lower.includes('deszcz') || lower.includes('rain')) {
      if (seen.has('freezing-rain') && !lower.includes('marzn') && !lower.includes('freez')) {
        isDuplicate = true;
      }
      if (lower.includes('marzn') || lower.includes('freez')) {
        seen.add('freezing-rain');
      } else {
        seen.add('rain');
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(item);
    }
  }
  
  // Return top 4 most important phenomena
  return deduplicated
    .slice(0, 4)
    .map(item => item.phenomenon);
}

export function HourlyBreakdown({ forecast, language }: HourlyBreakdownProps) {
  const allHours = splitIntoHourlyPeriods(forecast, 48);
  const hours = allHours;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0])); // First card expanded by default
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  const toggleCard = (idx: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
      return next;
    });
  };
  
  // Check if scrolled to end - only for desktop
  useEffect(() => {
    if (!isDesktop) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const checkScroll = () => {
      // Generous threshold (200px) to ensure arrow disappears well before blocking last hours
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const threshold = 200;
      const maxScroll = scrollWidth - clientWidth;
      const isAtEnd = scrollLeft >= (maxScroll - threshold);
      
      setShowScrollHint(!isAtEnd);
    };
    
    // Delay initial check to ensure DOM is fully rendered
    const timer = setTimeout(checkScroll, 200);
    
    container.addEventListener('scroll', checkScroll);
    
    return () => {
      clearTimeout(timer);
      container.removeEventListener('scroll', checkScroll);
    };
  }, [hours.length, isDesktop]); // Re-run when number of hours changes or desktop/mobile switches
  
  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };
  
  if (allHours.length === 0) {
    return (
      <div className="space-y-3 md:space-y-4">
        {/* Mobile skeleton */}
        {!isDesktop && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 bg-slate-700/50 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-16 bg-slate-700/50 rounded animate-pulse mb-2" />
                    <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-slate-700/50 rounded-lg animate-pulse" />
                  <div className="h-8 w-28 bg-slate-700/50 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Desktop skeleton */}
        {isDesktop && (
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 rounded-xl border border-slate-700/40 p-4">
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-1 min-w-[50px] flex flex-col items-center gap-2">
                  <div className="h-4 w-8 bg-slate-700/50 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-slate-700/50 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Message */}
        <div className="text-slate-400 text-sm text-center py-4">
          {language === 'pl' ? 'Ładowanie prognozy godzinowej...' : 'Loading hourly forecast...'}
        </div>
      </div>
    );
  }

  // Extract phenomena bars for visualization (use all hours, not just first 12)
  const phenomenaBars = extractPhenomenaBars(hours); // Show all phenomena in timeline
  
  // Extract critical periods (risk level 3 or 4) - grouped
  const criticalPeriods: Array<{
    timeRange: string;
    riskLevel: 1 | 2 | 3 | 4;
    riskTitle: string;
    visibility?: number;
    phenomena: string[];
    warnings: string[];
    startDayLabel?: string;
    endDayLabel?: string;
  }> = [];
  
  let currentGroup: typeof criticalPeriods[0] | null = null;
  
  for (const h of hours) {
    if (h.riskLevel >= 2) { // Show Level 2+ (not just 3-4)
      if (!currentGroup) {
        // Start new group
        currentGroup = {
          timeRange: h.time,
          riskLevel: h.riskLevel,
          riskTitle: h.riskTitle,
          visibility: h.visibility,
          phenomena: [...h.phenomena],
          warnings: [...h.warnings],
          startDayLabel: h.dayLabel,
          endDayLabel: h.dayLabel
        };
      } else {
        // Extend current group
        currentGroup.timeRange = `${currentGroup.timeRange.split(' - ')[0]} - ${h.time}`;
        currentGroup.riskLevel = Math.max(currentGroup.riskLevel, h.riskLevel) as 1 | 2 | 3 | 4;
        currentGroup.endDayLabel = h.dayLabel;
        
        // Merge phenomena (unique)
        for (const ph of h.phenomena) {
          if (!currentGroup.phenomena.includes(ph)) {
            currentGroup.phenomena.push(ph);
          }
        }
        
        // Merge warnings (unique)
        for (const w of h.warnings) {
          if (!currentGroup.warnings.includes(w)) {
            currentGroup.warnings.push(w);
          }
        }
        
        // Update visibility (worst case)
        if (h.visibility !== undefined) {
          if (currentGroup.visibility === undefined || h.visibility < currentGroup.visibility) {
            currentGroup.visibility = h.visibility;
          }
        }
      }
    } else {
      // End current group if any
      if (currentGroup) {
        criticalPeriods.push(currentGroup);
        currentGroup = null;
      }
    }
  }
  
  // Push last group if any
  if (currentGroup) {
    criticalPeriods.push(currentGroup);
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-3 md:space-y-4">
        {/* Timeline - Same for desktop and mobile */}
        {isDesktop ? (
          // Desktop: Timeline with tooltips
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 rounded-xl border border-slate-700/40 shadow-xl backdrop-blur-sm relative group/timeline">
          {/* Fade affordances on edges */}
          <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-slate-800/80 to-transparent pointer-events-none z-10 rounded-l-xl" />
          
          {/* Scroll hint - clickable, hides when at end */}
          {showScrollHint && (
            <button
              onClick={handleScrollRight}
              className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-slate-800/80 to-transparent z-10 rounded-r-xl flex items-center justify-end pr-2 cursor-pointer hover:from-slate-800/95 transition-all group"
              aria-label={language === 'pl' ? 'Przewiń w prawo' : 'Scroll right'}
            >
              <div className="text-sm text-slate-400 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all hidden sm:block">
                →
              </div>
            </button>
          )}
          
          {/* Right fade when at end */}
          {!showScrollHint && (
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-slate-800/80 to-transparent pointer-events-none z-10 rounded-r-xl" />
          )}
          
          <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-custom">
            <div className="min-w-[800px]">
              <div className="flex gap-[2px] p-2">
              {hours.map((h, i) => {
                const isDayChange = i > 0 && h.dayLabel !== hours[i - 1].dayLabel;
                const dayLabelText = getDayLabel(h.dayLabel, language);
                
                // Use direct phenomena from this hour (not aggregated bars)
                // This ensures we show the actual phenomena for each specific hour
                const priorityMap: Record<string, number> = {
                  'Freez': 9, 'Marzn': 9,
                  'Thunder': 8, 'Burz': 8,
                  'Snow': 8, 'Śnieg': 8,
                  'Rain': 7, 'Deszcz': 7,
                  'Fog': 6, 'Mgła': 6,
                  'Mist': 5, 'Zamglenie': 5,
                  'Hail': 7, 'Grad': 7,
                  'Wind': 4, 'Wiatr': 4
                };
                
                const hourPhenomena = h.phenomena
                  .map(label => {
                    const lower = label.toLowerCase();
                    let priority = 0;
                    for (const [key, val] of Object.entries(priorityMap)) {
                      if (lower.includes(key.toLowerCase())) {
                        priority = Math.max(priority, val);
                      }
                    }
                    return { label, priority };
                  })
                  .sort((a, b) => b.priority - a.priority); // Sort by priority descending
                
                return (
                  <React.Fragment key={`desktop-${i}-${h.hour.getTime()}`}>
                    {/* Day separator */}
                    {isDayChange && (
                      <div className="flex flex-col items-center justify-center px-3">
                        <div className="w-px h-20 bg-gradient-to-b from-transparent via-slate-500 to-transparent" />
                        <span className="text-[10px] text-slate-400 font-semibold mt-2 whitespace-nowrap">
                          {dayLabelText}
                        </span>
                      </div>
                    )}
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          tabIndex={0}
                          className="flex-1 bg-slate-800/40 rounded-lg p-2 md:p-3 hover:bg-slate-700/30 focus:bg-slate-700/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-w-[50px] flex flex-col group relative cursor-pointer"
                          style={{ minHeight: '110px' }}
                        >
                        {/* Hour */}
                        <div className="text-xs md:text-sm text-slate-200 font-semibold text-center mb-3">
                          {h.time.split(':')[0]}
                        </div>
                        
                        {/* Phenomena icons - fixed space - show top 2 */}
                        <div className="flex-1 flex justify-center items-center gap-1.5 mb-2 min-h-[20px]">
                          {hourPhenomena.length > 0 ? (
                            <>
                              {/* Always show highest priority */}
                              <div className="transition-transform group-hover:scale-110">
                                {getPhenomenaIcon(hourPhenomena[0].label)}
                              </div>
                              {/* Show second if different type (not just intensity variant) */}
                              {hourPhenomena.length > 1 && (() => {
                                const first = hourPhenomena[0].label.toLowerCase();
                                const second = hourPhenomena[1].label.toLowerCase();
                                
                                // Check if they're different types (not just "Snow" vs "Light Snow")
                                const isDifferentType = 
                                  (first.includes('snow') || first.includes('śnieg')) !==
                                  (second.includes('snow') || second.includes('śnieg')) ||
                                  (first.includes('rain') || first.includes('deszcz')) !==
                                  (second.includes('rain') || second.includes('deszcz')) ||
                                  (first.includes('fog') || first.includes('mgła')) !==
                                  (second.includes('fog') || second.includes('mgła'));
                                
                                if (isDifferentType) {
                                  return (
                                    <div className="transition-transform group-hover:scale-110">
                                      {getPhenomenaIcon(hourPhenomena[1].label)}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          ) : h.warnings.length > 0 ? (
                            // Show wind icon if no phenomena but there are warnings (likely wind-related)
                            <div className="transition-transform group-hover:scale-110">
                              <Wind className="w-4 h-4 text-slate-400" />
                            </div>
                          ) : null}
                        </div>
                        
                        {/* Risk icon */}
                        <div className="flex justify-center transition-all group-hover:scale-110">
                          {getRiskIcon(h.riskLevel)}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top"
                      sideOffset={8}
                      className="bg-slate-900/95 border-slate-700 shadow-2xl backdrop-blur-xl max-w-xs p-3 z-[100]"
                    >
                      {(() => {
                        // Use h.phenomena directly for tooltip (not phenomenaBars which may miss items in gaps)
                        const tooltipPhenomena = h.phenomena.map(label => ({
                          label: label,
                          priority: 0 // Not needed for tooltip
                        }));
                        
                        // Deduplicate warnings and remove trailing/leading spaces from emoji
                        const uniqueWarnings = Array.from(new Set(
                          h.warnings
                            .filter(w => w && typeof w === 'string')
                            .map(w => w.trim().replace(/\s+/g, ' ')) // Normalize spaces
                        ));
                        
                        const hasCleanPhenomena = tooltipPhenomena.some(p => p && p.label && typeof p.label === 'string');
                        const hasCleanWarnings = uniqueWarnings.length > 0;
                        const hasAdditionalContent = hasCleanPhenomena || hasCleanWarnings || h.probability;
                        
                        // Clean phenomena labels - remove emoji
                        const cleanPhenomena = tooltipPhenomena
                          .filter(p => p && p.label && typeof p.label === 'string')
                          .map(p => ({
                            ...p,
                            label: p.label.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
                          }))
                          .filter(p => p.label.length > 0);
                        
                        return (
                          <div className="space-y-2">
                            {/* Time & Risk Level */}
                            <div className={`flex items-center gap-2 ${hasAdditionalContent ? 'pb-2 border-b border-slate-700/50' : ''}`}>
                              <span className="text-sm font-bold text-white">{h.time}</span>
                              <div className="flex items-center gap-1.5">
                                {getRiskIcon(h.riskLevel, 'w-4 h-4')}
                                <span className="text-sm text-slate-300">{h.riskTitle}</span>
                              </div>
                            </div>
                            
                            {/* Phenomena */}
                            {cleanPhenomena.length > 0 && (
                              <div className="space-y-1.5">
                                {cleanPhenomena.map((phen, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    {getPhenomenaIcon(phen.label, 'w-3.5 h-3.5')}
                                    <span className="text-xs text-slate-300">{phen.label}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Warnings */}
                            {uniqueWarnings.length > 0 && (
                              <div className={`space-y-1 ${cleanPhenomena.length > 0 ? 'pt-2 border-t border-slate-700/50' : ''}`}>
                                {uniqueWarnings.map((warning, idx) => (
                                  <div key={idx} className="text-xs text-orange-300 flex items-start gap-1.5">
                                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span>{warning}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Probability */}
                            {h.probability && (
                              <div className="text-[10px] text-slate-400 pt-1">
                                {language === 'pl' ? 'Prawdopodobieństwo' : 'Probability'}: {h.probability}%
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </TooltipContent>
                  </Tooltip>
                  </React.Fragment>
                );
              })}
              </div>
            </div>
          </div>
          </div>
        ) : (
          // Mobile: Horizontal Timeline (no tooltips) with snap scrolling
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 rounded-xl border border-slate-700/40 shadow-lg relative">
            {/* Scroll indicators */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-800/90 to-transparent pointer-events-none z-10 rounded-l-xl" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-800/90 to-transparent pointer-events-none z-10 rounded-r-xl flex items-center justify-end pr-2">
              {/* Subtle scroll hint */}
              <svg className="w-4 h-4 text-slate-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="overflow-x-auto scrollbar-custom snap-x snap-mandatory p-4" style={{ scrollPaddingLeft: '1rem' }}>
              <div className="flex gap-2 min-w-max">
                {hours.map((h, i) => {
                  const isDayChange = i > 0 && h.dayLabel !== hours[i - 1].dayLabel;
                  const dayLabelText = getDayLabel(h.dayLabel, language);
                  
                  return (
                    <React.Fragment key={`mobile-${i}-${h.hour.getTime()}`}>
                      {/* Day separator */}
                      {isDayChange && (
                        <div className="flex flex-col items-center justify-center px-2">
                          <div className="h-16 w-px bg-gradient-to-b from-transparent via-slate-500 to-transparent" />
                          <span className="text-[10px] text-slate-400 font-semibold mt-1 whitespace-nowrap">
                            {dayLabelText}
                          </span>
          </div>
        )}

                      {/* Hour cell - with snap point */}
                      <div className="flex flex-col items-center gap-1.5 min-w-[60px] snap-start">
                        <span className="text-xs font-semibold text-slate-300">
                          {h.time.split(':')[0]}
                        </span>
                        {getRiskIcon(h.riskLevel, 'w-9 h-9')}
                        {h.phenomena.length > 0 && (() => {
                          // Find highest priority phenomenon - prioritize precipitation over visibility
                          const priorityMap: Record<string, number> = {
                            'Freezing': 10, 'Marznąc': 10, 'FZFG': 10, 'FZRA': 10,
                            'Thunderstorm': 9, 'Burza': 9, 'TS': 9, 'TSRA': 9,
                            'Snow': 8, 'snow': 8, 'Śnieg': 8, 'śnieg': 8,
                            'Rain': 7, 'Deszcz': 7, 'deszcz': 7,
                            'Fog': 6, 'Mgła': 6, 'FG': 6,
                            'Mist': 5, 'Zamglenie': 5, 'BR': 5,
                          };
                          
                          let highestPriority = 0;
                          let topPhenomenon = h.phenomena[0];
                          
                          for (const phenomenon of h.phenomena) {
                            for (const [key, priority] of Object.entries(priorityMap)) {
                              if (phenomenon.includes(key) && priority > highestPriority) {
                                highestPriority = priority;
                                topPhenomenon = phenomenon;
                              }
                            }
                          }
                          
                          return getPhenomenaIcon(topPhenomenon, 'w-5 h-5 text-slate-400');
                        })()}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Smart Highlights - Same for desktop and mobile */}
        {(() => {
          // Find noteworthy periods (level 2+)
          const noteworthyHours = hours.filter(h => h.riskLevel >= 2);
          
          if (noteworthyHours.length === 0) {
            return (
              <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 rounded-xl border border-green-700/30 p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-green-300 mb-1">
                      {language === 'pl' ? 'Sprzyjające warunki pogodowe' : 'Favorable weather conditions'}
                    </h3>
                    <p className="text-sm md:text-base text-slate-300">
                      {language === 'pl' 
                        ? 'Prognoza nie wskazuje na istotne utrudnienia w najbliższych 24 godzinach' 
                        : 'Forecast shows no significant disruptions in the next 24 hours'}
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          
          if (noteworthyHours.length > 0) {
            // Group consecutive noteworthy hours
            const noteworthyGroups: Array<{ start: HourlyPeriod; end: HourlyPeriod; hours: HourlyPeriod[] }> = [];
            let currentGroup: HourlyPeriod[] = [];
            
            noteworthyHours.forEach((hour, idx) => {
              if (currentGroup.length === 0) {
                currentGroup.push(hour);
              } else {
                const lastHour = currentGroup[currentGroup.length - 1];
                const timeDiff = hour.hour.getTime() - lastHour.hour.getTime();
                const oneHour = 60 * 60 * 1000;
                
                // Group consecutive hours (allow different risk levels if they're close)
                // Don't merge across gaps - it's confusing for users!
                // Ensure the entire group spans at most 1 risk level (e.g., 2-3 or 3-4, but not 2-4)
                const minRiskInGroup = Math.min(...currentGroup.map(h => h.riskLevel));
                const maxRiskInGroup = Math.max(...currentGroup.map(h => h.riskLevel));
                const newMinRisk = Math.min(minRiskInGroup, hour.riskLevel);
                const newMaxRisk = Math.max(maxRiskInGroup, hour.riskLevel);
                const groupSpan = newMaxRisk - newMinRisk;
                
                if (timeDiff <= oneHour && groupSpan <= 1) {
                  currentGroup.push(hour);
                } else {
                  noteworthyGroups.push({
                    start: currentGroup[0],
                    end: currentGroup[currentGroup.length - 1],
                    hours: [...currentGroup]
                  });
                  currentGroup = [hour];
                }
              }
              
              // Push last group
              if (idx === noteworthyHours.length - 1 && currentGroup.length > 0) {
                noteworthyGroups.push({
                  start: currentGroup[0],
                  end: currentGroup[currentGroup.length - 1],
                  hours: [...currentGroup]
                });
              }
            });
            
            return (
              <div className="space-y-3 md:space-y-4">
                {noteworthyGroups.map((group, idx) => {
                  // Use max risk level from group for colors and display
                  const maxRiskLevel = Math.max(...group.hours.map(h => h.riskLevel));
                  const colors = getCardColors(maxRiskLevel);
                  
                  // Collect and prioritize phenomena - remove redundancies
                  const rawPhenomena = [...new Set(group.hours.flatMap(h => h.phenomena))];
                  const allPhenomena = prioritizePhenomena(rawPhenomena, language);
                  
                  const allWarnings = [...new Set(group.hours.flatMap(h => h.warnings))];
                  const isExpanded = expandedCards.has(idx);
                  
                  // Calculate duration
                  const durationHours = group.hours.length;
                  const durationText = language === 'pl' 
                    ? `${durationHours}${durationHours === 1 ? 'h' : 'h'}`
                    : `${durationHours}h`;
                  
                  // Calculate end time (add 1 hour since each hour represents an hour-long period)
                  const endHourDate = new Date(group.end.hour);
                  endHourDate.setHours(endHourDate.getHours() + 1);
                  const endTime = endHourDate.toLocaleTimeString('pl-PL', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZone: 'Europe/Warsaw'
                  }).slice(0, 5);
                  
                  // Calculate day labels for start and actual end
                  const startDayLabel = getDayLabel(group.start.dayLabel, language);
                  
                  // Determine end day label based on actual end time
                  const now = adjustToWarsawTime(new Date());
                  const todayStart = new Date(now);
                  todayStart.setHours(0, 0, 0, 0);
                  const tomorrowStart = new Date(todayStart);
                  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
                  const dayAfterStart = new Date(todayStart);
                  dayAfterStart.setDate(dayAfterStart.getDate() + 2);
                  
                  let endDayLabelRaw: string | undefined;
                  if (endHourDate >= dayAfterStart) {
                    endDayLabelRaw = 'day_after';
                  } else if (endHourDate >= tomorrowStart) {
                    endDayLabelRaw = 'tomorrow';
                  }
                  const endDayLabel = getDayLabel(endDayLabelRaw, language);
                  
                  // Format day display - show both if different, otherwise just one
                  const dayDisplay = startDayLabel && endDayLabel && startDayLabel !== endDayLabel
                    ? `${startDayLabel} – ${endDayLabel}`
                    : (endDayLabel || startDayLabel);
                  
                  // Get min visibility across the period
                  const visibilities = group.hours
                    .map(h => h.visibility)
                    .filter((v): v is number => v !== undefined);
                  const minVisibility = visibilities.length > 0 ? Math.min(...visibilities) : undefined;
                  
                  // Friendly description based on max risk level in the group
                  // (maxRiskLevel is already calculated above at line 927)
                  const friendlyDescription = maxRiskLevel === 4
                    ? (language === 'pl' ? 'Warunki mogące wpłynąć na operacje lotnicze' : 'Conditions that may affect flight operations')
                    : maxRiskLevel === 3
                    ? (language === 'pl' ? 'Warunki wymagające uwagi' : 'Conditions requiring attention')
                    : (language === 'pl' ? 'Niewielki wpływ warunków pogodowych' : 'Minor weather impact');
                  
                  // NO SUMMARY BADGES - we don't want to duplicate info that's shown in expanded state
                  // Visibility is shown on the right side, phenomena will be shown when expanded
                  
                  return (
                    <div 
                      key={idx}
                      className={`relative ${colors.bg} rounded-xl border-2 ${colors.border} overflow-hidden transition-all duration-200 ${
                        isExpanded ? 'shadow-xl' : 'shadow-lg hover:shadow-xl'
                      } ${!isDesktop ? 'active:scale-[0.99]' : ''}`}
                    >
                      {/* Single gradient for high risk - simplified */}
                      {maxRiskLevel >= 3 && (
                        <div 
                          className="absolute inset-0 pointer-events-none opacity-30"
                          style={{
                            background: maxRiskLevel === 4 
                              ? 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.15) 0%, transparent 60%)'
                              : 'radial-gradient(circle at top right, rgba(249, 115, 22, 0.1) 0%, transparent 60%)'
                          }}
                        />
                      )}
                      {/* Header - Always visible, clickable on mobile */}
                      <button
                        onClick={() => !isDesktop && toggleCard(idx)}
                        disabled={isDesktop}
                        className={`relative w-full text-left p-5 transition-colors duration-150 ${
                          !isDesktop ? 'cursor-pointer active:bg-white/5' : 'cursor-default'
                        }`}
                        aria-expanded={!isDesktop ? isExpanded : undefined}
                        aria-label={!isDesktop ? (isExpanded ? (language === 'pl' ? 'Zwiń szczegóły' : 'Collapse details') : (language === 'pl' ? 'Rozwiń szczegóły' : 'Expand details')) : undefined}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {getRiskIcon(maxRiskLevel, 'w-8 h-8 flex-shrink-0')}
                            <div className="flex-1 min-w-0">
                              {/* Time + Duration + Day */}
                              <div className="flex items-baseline gap-2 flex-wrap mb-1">
                                <span className="text-lg font-bold text-white">
                              {group.start.time}
                                  {group.hours.length > 1 && ` – ${endTime}`}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-700/40 text-xs font-medium text-slate-400">
                                  {durationText}
                                </span>
                                {dayDisplay && (
                                  <span className="text-sm text-slate-500">
                                    ({dayDisplay})
                                </span>
                              )}
                            </div>
                              
                              {/* Description */}
                              <div className="text-sm text-slate-300 leading-relaxed">
                              {friendlyDescription}
                            </div>
                          </div>
                        </div>
                        
                          {/* Right side: Visibility + Chevron */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {minVisibility !== undefined && minVisibility <= 1500 && (
                              <div className={`text-right px-2 py-1 rounded-lg ${
                                minVisibility < 800 ? 'bg-red-500/10' : 
                                minVisibility < 1500 ? 'bg-orange-500/10' : 'bg-yellow-500/10'
                              }`}>
                                <div className={`text-2xl font-bold leading-none ${
                                  minVisibility < 800 ? 'text-red-300' : 
                                  minVisibility < 1500 ? 'text-orange-300' : 'text-yellow-300'
                            }`}>
                              {minVisibility}m
                            </div>
                          </div>
                        )}
                            {!isDesktop && (
                              <ChevronDown 
                                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                        )}
                      </div>
                      </div>
                      </button>
                      
                      {/* Details - Always visible on desktop, expandable on mobile */}
                      {(isDesktop || isExpanded) && (
                        <div className={`border-t border-slate-600/30 ${
                          !isDesktop && isExpanded ? 'animate-in fade-in duration-200' : ''
                        }`}>
                          <div className="p-5 space-y-4">
                            {/* Weather phenomena */}
                      {allPhenomena.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {allPhenomena.map((phenomenon, pIdx) => (
                            <div 
                              key={pIdx} 
                                    className="flex items-center gap-2 bg-slate-700/30 px-3 py-1.5 rounded-lg text-sm text-slate-200"
                            >
                              {getPhenomenaIcon(phenomenon, 'w-4 h-4')}
                                    <span>{phenomenon}</span>
                            </div>
                          ))}
                        </div>
                      )}
                            {/* Operational warnings */}
                      {allWarnings.length > 0 && (() => {
                        // Group similar warnings (e.g., wind gusts)
                        const groupedWarnings: string[] = [];
                        const gustWarnings: string[] = [];
                        const otherWarnings: string[] = [];
                        
                        allWarnings.forEach(w => {
                          const lower = w.toLowerCase();
                          if (lower.includes('podmuchy') || lower.includes('gust')) {
                            // Skip generic warnings like "Silne podmuchy wiatru" if they don't have specific numbers
                            if (!w.match(/\d+kt/)) {
                              return; // Skip generic wind warnings without kt values
                            }
                            gustWarnings.push(w);
                          } else if (!lower.includes('widoczność') && !lower.includes('visibility')) {
                            otherWarnings.push(w);
                          }
                        });
                        
                        // Combine gust warnings into one
                        if (gustWarnings.length > 0) {
                          // Extract all gust speeds
                          const gustSpeeds = gustWarnings
                            .map(w => {
                              const match = w.match(/(\d+)kt/);
                              return match ? parseInt(match[1]) : null;
                            })
                            .filter((s): s is number => s !== null);
                          
                          if (gustSpeeds.length > 0) {
                            const minGust = Math.min(...gustSpeeds);
                            const maxGust = Math.max(...gustSpeeds);
                            const isPolish = gustWarnings[0].includes('Podmuchy');
                            
                            if (minGust === maxGust) {
                              groupedWarnings.push(
                                isPolish 
                                  ? `Podmuchy wiatru ${maxGust}kt mogą wpłynąć na operacje naziemne`
                                  : `Wind gusts ${maxGust}kt may affect ground operations`
                              );
                            } else {
                              groupedWarnings.push(
                                isPolish 
                                  ? `Podmuchy wiatru ${minGust}-${maxGust}kt mogą wpłynąć na operacje naziemne`
                                  : `Wind gusts ${minGust}-${maxGust}kt may affect ground operations`
                              );
                            }
                          }
                        }
                        
                        // Add other warnings (deduplicated)
                        const uniqueOthers = [...new Set(otherWarnings)];
                        groupedWarnings.push(...uniqueOthers);
                        
                        const filteredWarnings = groupedWarnings
                          .slice(0, 3)
                          .map(w => w.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim())
                          .filter(w => w.length > 0);
                        
                        if (filteredWarnings.length === 0) return null;
                        
                        return (
                          <div className="space-y-2">
                            {filteredWarnings.map((warning, wIdx) => (
                              <div key={wIdx} className="flex items-start gap-2 text-sm text-slate-300">
                                {(() => {
                              const lower = warning.toLowerCase();
                                  return lower.includes('podmuchy') || lower.includes('gust') || lower.includes('wiatr') || lower.includes('wind')
                                    ? <Wind className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                                    : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-400" />;
                                })()}
                                  <span className="leading-relaxed">{warning}</span>
                                </div>
                            ))}
                          </div>
                        );
                      })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Disclaimer */}
                <p className="text-xs text-slate-500 leading-relaxed mt-6">
                    {language === 'pl' 
                      ? 'Powyższe informacje oparte są na prognozach pogodowych i mają charakter orientacyjny. Ostateczne decyzje operacyjne dotyczące lotów podejmują linie lotnicze i lotnisko na podstawie bieżących warunków oraz przepisów bezpieczeństwa.'
                      : 'The above information is based on weather forecasts and is for guidance only. Final operational decisions regarding flights are made by airlines and the airport based on current conditions and safety regulations.'
                    }
                  </p>
              </div>
            );
          }
          
          return null;
        })()}

        {/* Passenger Rights CTA - Subtle */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-blue-600/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <a 
            href="/passengerrights"
            className="block relative bg-slate-800/30 hover:bg-slate-800/50 focus:bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-blue-600/30 focus:border-blue-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 p-4 md:p-5 transition-all duration-300"
          >
            <div className="flex items-start gap-3 md:gap-4">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-700/10 border border-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm md:text-base font-semibold text-slate-200 mb-1 group-hover:text-blue-300 transition-colors">
                  {language === 'pl' ? 'Opóźnienie lub odwołanie?' : 'Flight delayed or cancelled?'}
                </h3>
                <p className="text-xs md:text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                  {language === 'pl' 
                    ? 'Przysługuje Ci odszkodowanie do 600€. Sprawdź swoje prawa pasażera.' 
                    : 'You may be entitled to compensation up to €600. Check your passenger rights.'}
                </p>
              </div>
              <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>
      </div>
    </TooltipProvider>
  );
}
