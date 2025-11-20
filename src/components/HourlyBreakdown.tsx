import React, { useState, useRef, useEffect } from 'react';
import type { ForecastChange } from '@/lib/types/weather';
import { adjustToWarsawTime } from '@/lib/utils/time';
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle, Waves, CloudRain, CloudLightning, Snowflake, CloudSnow, Wind } from 'lucide-react';
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
    const period = forecast.find(p => {
      const from = adjustToWarsawTime(p.from);
      const to = adjustToWarsawTime(p.to);
      return hourTime >= from && hourTime < to;
    });
    
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
        .map(p => p.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim())
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
        visibility: period.visibility?.meters,
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
  const priorityMap: Record<string, number> = {
    'Freezing': 10,
    'Marznąc': 10,
    'FZFG': 10,
    'FZRA': 10,
    'Fog': 8,
    'Mgła': 8,
    'FG': 8,
    'Mist': 6,
    'Zamglenie': 6,
    'BR': 6,
    'Rain': 5,
    'Deszcz': 5,
    'Snow': 5,
    'Śnieg': 5,
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

function getCardColors(level: number): { bg: string; border: string; text: string } {
  switch (level) {
    case 4:
      return {
        bg: 'bg-red-900/30',
        border: 'border-red-700/50',
        text: 'text-red-300'
      };
    case 3:
      return {
        bg: 'bg-orange-900/30',
        border: 'border-orange-700/50',
        text: 'text-orange-300'
      };
    case 2:
      return {
        bg: 'bg-orange-900/30',
        border: 'border-orange-700/50',
        text: 'text-orange-300'
      };
    default:
      return {
        bg: 'bg-emerald-900/20',
        border: 'border-emerald-700/30',
        text: 'text-emerald-300'
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
  if (lower.includes('freez') || lower.includes('marzn')) return <Waves className={`${size} text-cyan-300`} />; // Freezing fog - cyan waves
  if (lower.includes('fog') || lower.includes('mgła')) return <Waves className={`${size} text-slate-400`} />;
  if (lower.includes('mist') || lower.includes('zamgle')) return <Waves className={`${size} text-slate-400`} />;
  if (lower.includes('rain') || lower.includes('deszcz')) return <CloudRain className={`${size} text-blue-400`} />;
  if (lower.includes('snow') || lower.includes('śnieg')) return <Snowflake className={`${size} text-blue-300`} />;
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

export function HourlyBreakdown({ forecast, language }: HourlyBreakdownProps) {
  const allHours = splitIntoHourlyPeriods(forecast, 48);
  const hours = allHours; // Show all 48 hours
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const isDesktop = useMediaQuery('(min-width: 768px)'); // md breakpoint
  
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
        {/* Mobile: Smart Insights FIRST (top), then Horizontal Timeline */}
        {!isDesktop && (
          <div className="space-y-3">
            {/* Smart Insights - NO TITLE on mobile */}
            {criticalPeriods.length > 0 && criticalPeriods.map((period, idx) => {
              const colors = getCardColors(period.riskLevel);
              const description = period.riskLevel === 4
                ? (language === 'pl' ? 'Warunki mogące wpłynąć na operacje lotnicze' : 'Conditions that may affect flight operations')
                : period.riskLevel === 3
                ? (language === 'pl' ? 'Zwróć uwagę na te warunki' : 'Pay attention to these conditions')
                : (language === 'pl' ? 'Niewielki wpływ warunków pogodowych' : 'Minor weather impact');
              
              // Format day labels
              const startDayText = period.startDayLabel ? getDayLabel(period.startDayLabel, language) : '';
              const endDayText = period.endDayLabel ? getDayLabel(period.endDayLabel, language) : '';
              const dayInfo = startDayText && endDayText && startDayText !== endDayText
                ? `${startDayText} – ${endDayText}`
                : startDayText;
              
              return (
                <div
                  key={idx}
                  tabIndex={0}
                  className={`${colors.bg} rounded-xl border ${colors.border} p-4 shadow-lg space-y-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                >
                  {/* Header with time range and prominent visibility */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(period.riskLevel, 'w-6 h-6')}
                      <div>
                        <div className="text-base font-bold text-white">
                          {period.timeRange}
                          {dayInfo && (
                            <span className="text-sm text-slate-400 font-normal ml-2">
                              ({dayInfo})
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-200 mt-0.5">
                          {description}
                        </div>
                      </div>
                    </div>
                    
                    {/* Visibility - PROMINENT */}
                    {period.visibility !== undefined && (
                      <div className="flex flex-col items-end">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                          {language === 'pl' ? 'Widoczność' : 'Visibility'}
                        </div>
                        <div className={`text-2xl font-bold ${
                          period.visibility < 1000 ? 'text-red-300' : 
                          period.visibility < 3000 ? 'text-orange-300' : 'text-yellow-300'
                        }`}>
                          {period.visibility}m
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Phenomena chips */}
                  {period.phenomena.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {period.phenomena.map((ph, pIdx) => (
                        <div
                          key={pIdx}
                          className="inline-flex items-center gap-1.5 bg-slate-700/30 border border-slate-600/30 px-3 py-1.5 rounded-lg text-sm text-slate-100 font-medium"
                        >
                          {getPhenomenaIcon(ph, 'w-4 h-4')}
                          <span>{ph}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Warnings */}
                  {period.warnings.length > 0 && (() => {
                    const cleanWarnings = period.warnings
                      .filter(w => w && typeof w === 'string')
                      .map(w => w.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim())
                      .filter(w => w.length > 0 && !w.toLowerCase().includes('widoczność') && !w.toLowerCase().includes('visibility'));
                    
                    if (cleanWarnings.length === 0) return null;
                    
                    return (
                      <div className="space-y-2 pt-2 border-t border-slate-600/30">
                        {cleanWarnings.map((warning, wIdx) => (
                          <div key={wIdx} className="flex items-start gap-2 text-sm text-slate-100">
                            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="leading-relaxed">{warning}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
            
            {/* Horizontal Timeline for Mobile */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-800/40 rounded-xl border border-slate-700/40 shadow-lg p-4 overflow-x-auto scrollbar-custom">
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
                      
                      {/* Hour cell */}
                      <div className="flex flex-col items-center gap-1.5 min-w-[56px]">
                        <span className="text-xs font-semibold text-slate-300">
                          {h.time.split(':')[0]}
                        </span>
                        {getRiskIcon(h.riskLevel, 'w-8 h-8')}
                        {h.phenomena.length > 0 && getPhenomenaIcon(h.phenomena[0], 'w-5 h-5 text-slate-400')}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Desktop: Timeline - All-in-one cells */}
        {isDesktop && (
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
                
                // Find phenomena for this hour
                const hourPhenomena = phenomenaBars.filter(bar => 
                  i >= bar.startHour && i < bar.endHour
                );
                
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
                        
                        {/* Phenomena icons - fixed space */}
                        <div className="flex-1 flex justify-center items-center gap-1.5 mb-2 min-h-[20px]">
                          {hourPhenomena.slice(0, 2).map((bar, idx) => (
                            <div 
                              key={idx}
                              className="transition-transform group-hover:scale-110"
                            >
                              {getPhenomenaIcon(bar.label)}
                            </div>
                          ))}
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
                        // Check if we have any additional content beyond time/risk
                        const hasCleanPhenomena = hourPhenomena.some(p => p && p.label && typeof p.label === 'string');
                        const hasCleanWarnings = h.warnings.some(w => w && typeof w === 'string');
                        const hasAdditionalContent = hasCleanPhenomena || hasCleanWarnings || h.probability;
                        
                        // Clean phenomena labels - remove emoji
                        const cleanPhenomena = hourPhenomena
                          .filter(p => p && p.label && typeof p.label === 'string')
                          .map(p => ({
                            ...p,
                            label: p.label.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
                          }))
                          .filter(p => p.label.length > 0);
                        
                        // Clean warnings - remove emoji
                        const cleanWarnings = h.warnings
                          .filter(w => w && typeof w === 'string')
                          .map(w => w.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim())
                          .filter(w => w.length > 0);
                        
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
                            {cleanWarnings.length > 0 && (
                              <div className="pt-2 border-t border-slate-700/50 space-y-1">
                                {cleanWarnings.map((warning, idx) => (
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
        )}

        {/* Desktop: Smart Highlights - Only noteworthy periods (mobile has its own version above) */}
        {isDesktop && (() => {
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
                
                // Group if consecutive and same risk level
                if (timeDiff <= oneHour && hour.riskLevel === lastHour.riskLevel) {
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
                  const colors = getCardColors(group.start.riskLevel);
                  const startDayLabel = getDayLabel(group.start.dayLabel, language);
                  const endDayLabel = getDayLabel(group.end.dayLabel, language);
                  const allPhenomena = [...new Set(group.hours.flatMap(h => h.phenomena))];
                  const allWarnings = [...new Set(group.hours.flatMap(h => h.warnings))];
                  
                  // Get min visibility across the period
                  const visibilities = group.hours
                    .map(h => h.visibility)
                    .filter((v): v is number => v !== undefined);
                  const minVisibility = visibilities.length > 0 ? Math.min(...visibilities) : undefined;
                  
                  // Friendly description based on risk level
                  const friendlyDescription = group.start.riskLevel === 4
                    ? (language === 'pl' ? 'Warunki mogące wpłynąć na operacje lotnicze' : 'Conditions that may affect flight operations')
                    : group.start.riskLevel === 3
                    ? (language === 'pl' ? 'Warunki wymagające uwagi' : 'Conditions requiring attention')
                    : (language === 'pl' ? 'Niewielki wpływ warunków pogodowych' : 'Minor weather impact');
                  
                  return (
                    <div 
                      key={idx}
                      tabIndex={0}
                      className={`${colors.bg} rounded-xl border ${colors.border} p-4 md:p-6 space-y-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                    >
                      {/* Header with time and visibility */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-3">
                          {getRiskIcon(group.start.riskLevel, 'w-6 h-6 md:w-7 md:h-7')}
                          <div className="flex-1">
                            <div className="text-base md:text-lg font-bold text-white">
                              {group.start.time}
                              {group.hours.length > 1 && ` – ${group.end.time}`}
                              {(startDayLabel || endDayLabel) && (
                                <span className="text-sm text-slate-400 ml-2 font-normal">
                                  ({startDayLabel || endDayLabel})
                                </span>
                              )}
                            </div>
                            <div className="text-sm md:text-base text-slate-300 mt-1">
                              {friendlyDescription}
                            </div>
                          </div>
                        </div>
                        
                        {/* Visibility - prominent if low, stacks on mobile */}
                        {minVisibility !== undefined && minVisibility < 5000 && (
                          <div className="flex items-center sm:flex-col sm:items-end gap-2 sm:gap-1 flex-shrink-0 ml-12 sm:ml-0">
                            <div className="text-xs md:text-sm text-slate-400">
                              {language === 'pl' ? 'Widoczność' : 'Visibility'}:
                            </div>
                            <div className={`text-xl md:text-2xl font-bold ${
                              minVisibility < 1000 ? 'text-red-300' : 
                              minVisibility < 3000 ? 'text-orange-300' : 'text-yellow-300'
                            }`}>
                              {minVisibility}m
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Phenomena - secondary with better spacing */}
                      {allPhenomena.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {allPhenomena.map((phenomenon, pIdx) => (
                            <div 
                              key={pIdx} 
                              className="flex items-center gap-2 bg-slate-700/40 px-3 py-2 rounded-lg text-sm text-slate-200 border border-slate-600/30"
                            >
                              {getPhenomenaIcon(phenomenon, 'w-4 h-4')}
                              <span className="font-medium">{phenomenon}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Warnings - prioritize operational impacts */}
                      {allWarnings.length > 0 && (() => {
                        const filteredWarnings = allWarnings
                          .slice(0, 3)
                          .filter(w => !w.toLowerCase().includes('widoczność') && !w.toLowerCase().includes('visibility'))
                          .map(w => w.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim())
                          .filter(w => w.length > 0);
                        
                        if (filteredWarnings.length === 0) return null;
                        
                        return (
                          <div className="space-y-2 pt-2 border-t border-slate-600/30">
                            {filteredWarnings.map((warning, wIdx) => (
                              <div key={wIdx} className="flex items-start gap-2.5 text-sm text-slate-200">
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="leading-relaxed">{warning}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
                
                {/* Disclaimer */}
                <div className="mt-4">
                  <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">
                    {language === 'pl' 
                      ? 'Powyższe informacje oparte są na prognozach pogodowych i mają charakter orientacyjny. Ostateczne decyzje operacyjne dotyczące lotów podejmują linie lotnicze i lotnisko na podstawie bieżących warunków oraz przepisów bezpieczeństwa.'
                      : 'The above information is based on weather forecasts and is for guidance only. Final operational decisions regarding flights are made by airlines and the airport based on current conditions and safety regulations.'
                    }
                  </p>
                </div>
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
