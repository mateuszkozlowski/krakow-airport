import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ForecastChange, RiskAssessment } from "@/lib/types/weather";
import { RiskLegendDialog } from "./RiskLegend";
import { adjustToWarsawTime } from '@/lib/utils/time';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { getStandardizedWindDescription } from '@/lib/weather';

interface WeatherTimelineProps {
  current: {
    riskLevel: RiskAssessment;
    conditions: {
      phenomena: Array<{
        code: string;
        text?: string;
      } | string>;
    };
    observed: string;
    wind?: { speed_kts: number; direction: number; gust_kts?: number };
    visibility?: { meters: number };
    ceiling?: { feet: number };
  };
  forecast: (ForecastChange & { operationalImpacts?: string[] })[];
  isLoading: boolean;
  isError: boolean;
  retry: () => Promise<void>;
}

interface ForecastPeriod {
  from: Date;
  to: Date;
  isTemporary: boolean;
  phenomena: string[];
  changeType: string;
  probability?: number;
}

interface TimelineEvent {
  time: Date;
  type: 'start' | 'end';
  period: ForecastPeriod;
}

function hasVisiblePhenomena(period: ForecastChange | { conditions: { phenomena: string[] }, wind?: { speed_kts: number; gust_kts?: number } }): boolean {
  const hasSignificantWind = !!(period.wind?.speed_kts && period.wind.speed_kts >= 15);
  return period.conditions.phenomena.length > 0 || hasSignificantWind;
}

interface WeatherImpact {
  priority: number;
  primaryMessage: string;
  secondaryMessage?: string;
  operationalStatus?: 'NORMAL' | 'RESTRICTED' | 'SUSPENDED';
}

function getImpactsList(phenomena: string[], riskLevel: number): string[] {
  // Helper to check conditions
  const hasCondition = (type: string) => phenomena.some(p => p.toLowerCase().includes(type.toLowerCase()));

  function getImpact(): WeatherImpact {
    // Check for visibility below minimums first
    if (hasCondition('Visibility Below Minimums')) {
      return {
        priority: 5,
        primaryMessage: 'Operations suspended - visibility below minimums',
        secondaryMessage: 'Diversions and cancellations likely',
        operationalStatus: 'SUSPENDED'
      };
    }

    // Rest of the existing conditions...
    if (hasCondition('TS') || hasCondition('⛈️')) {
      return {
        priority: 5,
        primaryMessage: 'Airport operations may be suspended',
        secondaryMessage: 'Check your flight status',
        operationalStatus: 'SUSPENDED'
      };
    }

    // Freezing conditions
    if (hasCondition('FZ') || (hasCondition('❄️') && hasCondition('rain'))) {
      return {
        priority: 4,
        primaryMessage: 'Airport operations severely restricted',
        secondaryMessage: 'Extended delays and possible cancellations',
        operationalStatus: 'RESTRICTED'
      };
    }

    // Poor visibility (but above minimums)
    if (hasCondition('Poor Visibility')) {
      return {
        priority: 4,
        primaryMessage: 'Operations restricted due to poor visibility',
        secondaryMessage: 'Expect delays and possible diversions',
        operationalStatus: 'RESTRICTED'
      };
    }

    // Default case for high risk level
    if (riskLevel >= 4) {
      return {
        priority: 4,
        primaryMessage: 'Operations severely restricted',
        secondaryMessage: 'Check flight status',
        operationalStatus: 'RESTRICTED'
      };
    }

    // Default case
    return {
      priority: 1,
      primaryMessage: riskLevel >= 4 ? 'Operations may be restricted' : 'Normal operations with caution',
      secondaryMessage: riskLevel >= 4 ? 'Check flight status' : undefined,
      operationalStatus: riskLevel >= 4 ? 'RESTRICTED' : 'NORMAL'
    };
  }

  const impact = getImpact();
  const messages = [impact.primaryMessage];
  
  if (impact.secondaryMessage) {
    messages.push(impact.secondaryMessage);
  }

  return messages;
}

// Update the TranslationType to only include what we need for formatTimeDescription
type TranslationType = {
  readonly today: string;
  readonly tomorrow: string;
  readonly nextDay: string;
  readonly until: string;
  // Allow other readonly string properties and nested structures
  readonly [key: string]: string | 
    readonly string[] | 
    { readonly [key: string]: string | readonly string[] } |
    { readonly [key: string]: { readonly [key: string]: string | readonly string[] } } |
    Record<string, unknown>;
};

function formatTimeDescription(start: Date, end: Date, language: string, t: TranslationType): string {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'pl' ? 'pl-PL' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
  };

  const now = new Date();
  
  // Get dates in Warsaw timezone
  const startTime = formatTime(start);
  const endTime = formatTime(end);
  
  // Create dates in Warsaw timezone for comparison
  const warsawNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  const warsawTomorrow = new Date(warsawNow);
  warsawTomorrow.setDate(warsawTomorrow.getDate() + 1);
  
  // Get day numbers for comparison
  const startDay = new Date(start.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' })).getDate();
  const endDay = new Date(end.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' })).getDate();
  const nowDay = warsawNow.getDate();
  const tomorrowDay = warsawTomorrow.getDate();

  // If the period is current (starts before or at current time)
  if (start.getTime() <= now.getTime()) {
    if (endDay === nowDay) {
      return language === 'pl' ? `do ${endTime}` : `until ${endTime}`;
    } else if (endDay === tomorrowDay) {
      return language === 'pl' ? `do jutra ${endTime}` : `until tomorrow ${endTime}`;
    } else {
      return language === 'pl' ? `do ${t.nextDay} ${endTime}` : `until ${t.nextDay} ${endTime}`;
    }
  }

  // For future periods
  // Same day
  if (startDay === endDay) {
    const prefix = startDay === nowDay ? t.today : t.tomorrow;
    return `${prefix} ${startTime} - ${endTime}`;
  }
  
  // Crosses midnight
  const startPrefix = startDay === nowDay ? t.today : t.tomorrow;
  const endPrefix = endDay === tomorrowDay ? t.tomorrow : t.nextDay;

  return `${startPrefix} ${startTime} - ${endPrefix} ${endTime}`;
}

// Add helper function for visibility formatting
function formatVisibilityDescription(meters: number): string {
  if (meters < 550) return "👁️ Visibility Below Minimums";
  if (meters < 1000) return "👁️ Very Poor Visibility";
  if (meters < 3000) return "👁️ Poor Visibility";
  if (meters < 5000) return "👁️ Reduced Visibility";
  return "";
}

// Add helper function for ceiling formatting
function formatCeilingDescription(feet: number): string {
  if (feet < 200) return "☁️ Ceiling Below Minimums";
  if (feet < 500) return "☁️ Very Low Ceiling";
  if (feet < 1000) return "☁️ Low Ceiling";
  return "";
}

// Dodaj typy dla periodText
type EnglishPeriodText = {
  one: string;
  other: string;
};

type PolishPeriodText = {
  one: string;
  few: string;
  many: string;
};

type PeriodText = EnglishPeriodText | PolishPeriodText;

function isPolishPeriodText(text: PeriodText): text is PolishPeriodText {
  return 'few' in text && 'many' in text;
}

function isEnglishPeriodText(text: PeriodText): text is EnglishPeriodText {
  return 'other' in text;
}

const WeatherTimeline: React.FC<WeatherTimelineProps> = ({ current, forecast, isLoading, isError, retry }) => {
  const [showAll, setShowAll] = useState(false);
  const { language } = useLanguage();
  const t = translations[language];

  console.log('Current language:', language);
  console.log('Translations object:', t);

  // Add debug logs for risk level translations
  console.log('Debug - WeatherTimeline Component:', {
    language,
    currentRiskLevel: {
      level: current.riskLevel.level,
      title: current.riskLevel.title,
      statusMessage: current.riskLevel.statusMessage,
      operationalImpacts: current.riskLevel.operationalImpacts
    },
    translationsAvailable: {
      level4: t.riskLevel4Title,
      level3: t.riskLevel3Title,
      level2: t.riskLevel2Title,
      level1: t.riskLevel1Title
    }
  });

  // Add debug logs for forecast periods
  console.log('Debug - Forecast Periods:', forecast.map(period => ({
    timeDescription: period.timeDescription,
    riskLevel: {
      level: period.riskLevel.level,
      title: period.riskLevel.title,
      statusMessage: period.riskLevel.statusMessage,
      operationalImpacts: period.riskLevel.operationalImpacts
    },
    phenomena: period.conditions.phenomena,
    isTemporary: period.isTemporary,
    probability: period.probability
  })));

  const deduplicateForecastPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    const now = new Date();
    
    // First, filter out invalid periods
    const validPeriods = periods.filter(period => {
      const hasContent = period.from.getTime() !== period.to.getTime() && 
        period.to.getTime() > now.getTime() &&
        (period.conditions.phenomena.length > 0 || 
         (period.wind?.speed_kts && period.wind.speed_kts >= 15) || 
         (period.visibility && period.visibility.meters < 5000) || 
         (period.ceiling && period.ceiling.feet < 1000) || 
         period.isTemporary);

      return hasContent;
    });

    if (validPeriods.length === 0) return [];

    // Create timeline events
    type TimelineEvent = {
      time: Date;
      type: 'start' | 'end';
      period: ForecastChange;
    };

    const events: TimelineEvent[] = [];
    validPeriods.forEach(period => {
      events.push({ time: period.from, type: 'start', period });
      events.push({ time: period.to, type: 'end', period });
    });

    // Sort events chronologically
    events.sort((a, b) => {
      const timeCompare = a.time.getTime() - b.time.getTime();
      if (timeCompare === 0) {
        // If times are equal, process 'end' before 'start'
        return a.type === 'end' ? -1 : 1;
      }
      return timeCompare;
    });

    const result: ForecastChange[] = [];
    let activeBasePeriods: ForecastChange[] = [];
    let activeTempoPeriods: ForecastChange[] = [];
    let lastTime: Date | null = null;

    const addPeriodToResult = (period: ForecastChange, start: Date, end: Date) => {
      if (start.getTime() >= end.getTime()) return;
      
      // Check if this period can be merged with the last one
      const lastPeriod = result[result.length - 1];
      if (lastPeriod && 
          arePeriodsSimilar(lastPeriod, period) && 
          start.getTime() <= lastPeriod.to.getTime() + 60000) {
        // Merge by extending the end time
        lastPeriod.to = end;
        lastPeriod.timeDescription = formatTimeDescription(lastPeriod.from, end, language, t);
      } else {
        // Add as new period
        result.push({
          ...period,
          from: start,
          to: end,
          timeDescription: formatTimeDescription(start, end, language, t)
        });
      }
    };

    events.forEach(event => {
      const currentTime = event.time;

      // Process any active periods up to this point
      if (lastTime) {
        // Process base periods first
        if (activeBasePeriods.length > 0) {
          // Select the most relevant base period based on risk level and duration
          const selectedBasePeriod = activeBasePeriods.reduce((prev, curr) => {
            if (curr.riskLevel.level > prev.riskLevel.level) return curr;
            if (curr.riskLevel.level === prev.riskLevel.level) {
              // If same risk level, prefer the one with longer duration
              const prevDuration = curr.to.getTime() - curr.from.getTime();
              const currDuration = prev.to.getTime() - prev.from.getTime();
              return prevDuration > currDuration ? curr : prev;
            }
            return prev;
          });
          addPeriodToResult(selectedBasePeriod, lastTime, currentTime);
        }

        // Then process TEMPO periods, but only if they have higher risk than active base period
        if (activeTempoPeriods.length > 0) {
          const highestRiskTempo = activeTempoPeriods.reduce((prev, curr) => 
            curr.riskLevel.level > prev.riskLevel.level ? curr : prev
          );
          
          const activeBase = activeBasePeriods[0];
          if (!activeBase || highestRiskTempo.riskLevel.level > activeBase.riskLevel.level) {
            addPeriodToResult(highestRiskTempo, lastTime, currentTime);
          }
        }
      }

      // Update active periods
      if (event.type === 'start') {
        if (event.period.isTemporary) {
          activeTempoPeriods.push(event.period);
        } else {
          activeBasePeriods.push(event.period);
        }
      } else { // 'end'
        if (event.period.isTemporary) {
          activeTempoPeriods = activeTempoPeriods.filter(p => p !== event.period);
        } else {
          activeBasePeriods = activeBasePeriods.filter(p => p !== event.period);
        }
      }

      lastTime = currentTime;
    });

    // Final sort considering all factors
    return result.sort((a, b) => {
      // First by start time
      const startCompare = a.from.getTime() - b.from.getTime();
      if (startCompare !== 0) return startCompare;
      
      // For same start time:
      // 1. Base periods before TEMPO
      if (a.isTemporary !== b.isTemporary) {
        return a.isTemporary ? 1 : -1;
      }
      
      // 2. Higher risk level first
      if (a.riskLevel.level !== b.riskLevel.level) {
        return b.riskLevel.level - a.riskLevel.level;
      }
      
      // 3. Longer duration first
      const aDuration = a.to.getTime() - a.from.getTime();
      const bDuration = b.to.getTime() - b.from.getTime();
      return bDuration - aDuration;
    });
  };

  // Helper function to check if two periods can be merged
  const arePeriodsSimilar = (a: ForecastChange, b: ForecastChange): boolean => {
    // Don't merge if they have different types
    if (a.isTemporary !== b.isTemporary) return false;
    if (a.probability !== b.probability) return false;
    if (a.changeType !== b.changeType) return false;
    
    // Don't merge if they have different risk levels
    if (a.riskLevel.level !== b.riskLevel.level) return false;
    
    // Compare phenomena
    const aPhenomena = new Set(a.conditions.phenomena.filter(p => 
      !p.includes('Brak szczególnych zjawisk') && 
      !p.includes('No significant weather')
    ));
    const bPhenomena = new Set(b.conditions.phenomena.filter(p => 
      !p.includes('Brak szczególnych zjawisk') && 
      !p.includes('No significant weather')
    ));
    
    // If either period has phenomena, compare them exactly
    if (aPhenomena.size > 0 || bPhenomena.size > 0) {
      if (aPhenomena.size !== bPhenomena.size) return false;
      return Array.from(aPhenomena).every(p => bPhenomena.has(p)) &&
             Array.from(bPhenomena).every(p => aPhenomena.has(p));
    }
    
    // If neither has phenomena, they can be merged only if they have the same risk level
    return true;
  };

  // Just use the deduplication result directly
  const uniqueForecast = React.useMemo(() => deduplicateForecastPeriods(forecast), [forecast]);

  const getStatusColors = (level: 1 | 2 | 3 | 4) => {
    switch (level) {
      case 4:
        return {
          bg: "bg-red-900/30",
          text: "text-red-500",
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          pill: "bg-red-500/10 text-red-500"
        };
      case 3:
        return {
          bg: "bg-red-900/30",
          text: "text-red-500",
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          pill: "bg-red-500/10 text-red-500"
        };
      case 2:
        return {
          bg: "bg-orange-900/30",
          text: "text-orange-500",
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          pill: "bg-orange-500/10 text-orange-500"
        };
      default:
        return {
          bg: "bg-emerald-900/30",
          text: "text-emerald-500",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          pill: "bg-emerald-500/10 text-emerald-500"
        };
    }
  };

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-20 bg-slate-800 rounded-lg" />
      <div className="space-y-3">
        <div className="h-12 bg-slate-800 rounded-lg" />
        <div className="h-12 bg-slate-800 rounded-lg" />
        <div className="h-12 bg-slate-800 rounded-lg" />
      </div>
    </div>
  );

  const formatDateTime = (date: Date, isEndTime: boolean = false) => {
    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const time = formatTime(date);

    // Convert the input date to Warsaw time for day comparison
    const warsawDate = new Date(date.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
    const warsawToday = new Date(today.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
    const warsawTomorrow = new Date(tomorrow.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));

    const isToday = warsawDate.getDate() === warsawToday.getDate();
    const isTomorrow = warsawDate.getDate() === warsawTomorrow.getDate();

    if (isEndTime) {
      if (isToday) {
        return language === 'pl' 
          ? `do ${time}`
          : `until ${time}`;
      } else if (isTomorrow) {
        return language === 'pl'
          ? `do jutra ${time}`
          : `until tomorrow ${time}`;
      } else {
        return language === 'pl'
          ? `do ${t.nextDay} ${time}`
          : `until ${t.nextDay} ${time}`;
      }
    }

    if (isToday) {
      return `${t.today} ${time}`;
    } else if (isTomorrow) {
      return `${t.tomorrow} ${time}`;
    } else {
      return `${t.nextDay} ${time}`;
    }
  };

  function getDetailedDescription(condition: string): string {
    if (condition.includes('Strong Winds') || condition.includes('Strong Wind Gusts')) {
      return 'Strong winds may cause turbulence and affect aircraft handling. Possible delays or operational changes.';
    }
    if (condition.includes('Rain') && condition.includes('Strong')) {
      return 'Combined rain and strong winds. High risk of turbulence and reduced visibility. Expect operational impacts.';
    }
    if (condition.includes('Snow')) {
      return 'Snow conditions may require de-icing and runway clearing. Expect delays.';
    }
    // Add more detailed descriptions...
    return condition;
  }

  console.log('Unique forecast periods:', uniqueForecast.map(p => ({
    time: p.timeDescription,
    isTemporary: p.isTemporary,
    phenomena: p.conditions.phenomena,
    risk: p.riskLevel.level
  })));

  const getPeriodText = (count: number) => {
    const periodText = t.periodText;
    
    if (language === 'pl' && isPolishPeriodText(periodText)) {
      if (count === 1) return periodText.one;
      if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) 
        return periodText.few;
      return periodText.many;
    }
    
    if (isEnglishPeriodText(periodText)) {
      return count === 1 ? periodText.one : periodText.other;
    }
    
    // Fallback
    return count === 1 ? periodText.one : 'periods';
  };

  return (
    <div className="space-y-4">
      {isError ? (
        <div className="bg-red-900/20 text-red-400 p-4 rounded-md">
          Failed to load data. <button onClick={retry} className="underline">Try again</button>
        </div>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {forecast.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-lg">No weather changes expected</p>
              <p className="text-sm mt-2">Current conditions should remain stable</p>
            </div>
          ) : (
            <>
              {/* Current conditions card */}
              <Card className={`${getStatusColors(current.riskLevel.level).bg} border-slate-700/50 rounded-2xl shadow-lg`}>
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-semibold text-slate-200">
                          {t.currentConditions} • {t.updated} {adjustToWarsawTime(new Date(current.observed)).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Europe/Warsaw'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColors(current.riskLevel.level).pill} w-full sm:w-auto text-center sm:text-left shadow-sm`}>
                          {current.riskLevel.title}
                        </span>
                      </div>
                    </div>

                    <div className={`text-lg md:text-xl font-semibold ${getStatusColors(current.riskLevel.level).text}`}>
                      {current.riskLevel.statusMessage}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-2 w-full">
                        {current.conditions.phenomena.map((phenomenon, index) => {
                          const phenomenonText = typeof phenomenon === 'string' ? phenomenon : phenomenon.text || phenomenon.code;
                          return (
                            <span
                              key={index}
                              className="bg-slate-800/50 text-slate-200 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap hover:bg-slate-700/80 hover:text-white transition-all duration-200 shadow-sm"
                              title={getDetailedDescription(phenomenonText)}
                            >
                              {phenomenonText}
                            </span>
                          );
                        })}

                        {current.wind?.speed_kts && !current.conditions.phenomena.some(p => 
                          typeof p === 'string' ? p.includes('Wind') : p.text?.includes('Wind')
                        ) && (
                          <span
                            className="bg-slate-800/50 text-slate-200 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap hover:bg-slate-700/80 hover:text-white transition-all duration-200 shadow-sm"
                            title={`Wind ${current.wind.direction}° at ${current.wind.speed_kts}kt${current.wind.gust_kts ? ` (gusts ${current.wind.gust_kts}kt)` : ''}`}
                          >
                            {getStandardizedWindDescription(current.wind.speed_kts, language, current.wind.gust_kts)}
                            {current.wind.gust_kts && ` (${current.wind.speed_kts}G${current.wind.gust_kts}kt)`}
                          </span>
                        )}

                        {current.visibility?.meters && (
                          <span
                            className="bg-slate-800/50 text-slate-200 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap hover:bg-slate-700/80 hover:text-white transition-all duration-200 shadow-sm"
                            title={`Current visibility: ${current.visibility.meters} meters`}
                          >
                            {formatVisibilityDescription(current.visibility.meters)}
                            {current.visibility.meters < 5000 && ` (${current.visibility.meters}m)`}
                          </span>
                        )}

                        {current.ceiling?.feet && (
                          <span
                            className="bg-slate-800/50 text-slate-200 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap hover:bg-slate-700/80 hover:text-white transition-all duration-200 shadow-sm"
                            title={`Current ceiling: ${current.ceiling.feet} feet`}
                          >
                            {formatCeilingDescription(current.ceiling.feet)}
                            {current.ceiling.feet < 1000 && ` (${current.ceiling.feet}ft)`}
                          </span>
                        )}
                      </div>
                    </div>

                    {(current.wind || current.visibility || current.ceiling) && (
                      <div className="mt-2 text-xs text-slate-400 space-y-1">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {current.wind && (
                            <span title="Wind direction and speed">
                              💨 {t.windConditions}: {current.wind.direction}° at {current.wind.speed_kts}kt
                              {current.wind.gust_kts && ` (${t.gusts} ${current.wind.gust_kts}kt)`}
                            </span>
                          )}
                          
                          {current.visibility && (
                            <span title="Ground visibility">
                              👁️ {t.visibilityConditions}: {current.visibility.meters}m
                            </span>
                          )}
                          
                          {current.ceiling && (
                            <span title="Cloud ceiling height">
                              ☁️ {t.ceilingConditions}: {current.ceiling.feet}ft
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {(current.riskLevel.explanation || current.riskLevel.operationalImpacts) && (
                      <div className="mt-2 text-sm space-y-2">
                        {current.riskLevel.explanation && (
                          <p className="text-slate-300">{current.riskLevel.explanation}</p>
                        )}
                        
                        {current.riskLevel.operationalImpacts && 
                         current.riskLevel.operationalImpacts.length > 0 && (
                          <div className="mt-2 border-t border-white/10 pt-3">
                            <p className="font-medium text-slate-200 text-sm">{t.operationalImpacts}:</p>
                            <ul className="mt-1 space-y-1.5">
                              {current.riskLevel.operationalImpacts.map((impact, idx) => (
                                <li key={idx} className="text-slate-300 text-sm">
                                  {impact}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {current.riskLevel.level === 1 && forecast.some(p => {
                      const withinNextHour = new Date(p.from).getTime() - new Date().getTime() <= 3600000;
                      return withinNextHour && p.riskLevel.level > 1;
                    }) && (
                      <div className="mt-2 p-3 bg-orange-900/20 rounded-lg border border-orange-700/50">
                        <div className="flex items-top gap-2 text-orange-400">
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium">
                              <span className="font-bold">Weather conditions expected to deteriorate soon.</span>
                              {' '}Check the timeline below for detailed changes
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <RiskLegendDialog />

              {uniqueForecast.length > 0 && (
                <div className="space-y-4">
                  {uniqueForecast
                    .slice(0, showAll ? uniqueForecast.length : 4)
                    .map((period, index) => {
                      const colors = getStatusColors(period.riskLevel.level);
                      
                      // Debug log for period being rendered
                      console.log('Rendering period:', {
                        index,
                        isTemporary: period.isTemporary,
                        probability: period.probability,
                        changeType: period.changeType,
                        phenomena: period.conditions.phenomena,
                        timeDescription: period.timeDescription
                      });
                      
                      return (
                        <Card 
                          key={`${period.from.getTime()}-${period.to.getTime()}-${index}`}
                          className={`border-slate-700/50 ${colors.bg} rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200`}
                        >
                          <CardContent className="p-5 md:p-6">
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <span className="text-sm font-semibold text-slate-200">
                                    {period.timeDescription}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${colors.pill} w-full sm:w-auto text-center sm:text-left shadow-sm`}>
                                    {period.riskLevel.title}
                                  </span>
                                </div>
                              </div>
                              {hasVisiblePhenomena(period) && (
                                <div className="mt-1.5 border-t border-white/10"> </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2">
                                {(() => {
                                  // Debug log for rendering phenomena
                                  console.log('Rendering phenomena for period:', {
                                    isTemporary: period.isTemporary,
                                    probability: period.probability,
                                    changeType: period.changeType,
                                    phenomena: period.conditions.phenomena
                                  });

                                  // Helper function to get visibility severity
                                  const getVisibilitySeverity = (condition: string): number => {
                                    if (condition.includes('Visibility Below Minimums') || condition.includes('Widoczność poniżej minimów')) return 4;
                                    if (condition.includes('Very Poor Visibility') || condition.includes('Bardzo słaba widoczność')) return 3;
                                    if (condition.includes('Poor Visibility') || condition.includes('Słaba widoczność')) return 2;
                                    if (condition.includes('Reduced Visibility') || condition.includes('Ograniczona widoczność')) return 1;
                                    return 0;
                                  };

                                  let phenomena = period.conditions.phenomena
                                    .filter(condition => typeof condition === 'string' ? condition.trim() !== '' : (condition as { text?: string; code: string }).text?.trim() !== '')
                                    .filter(condition => {
                                      const text = typeof condition === 'string' ? condition : (condition as { text?: string; code: string }).text || (condition as { text?: string; code: string }).code;
                                      return !(text.includes('Brak szczególnych zjawisk') || text.includes('No significant weather'));
                                    });

                                  // Deduplicate visibility conditions
                                  const visibilityConditions = phenomena
                                    .filter(p => {
                                      const text = typeof p === 'string' ? p : (p as { text?: string; code: string }).text || (p as { text?: string; code: string }).code;
                                      return text.includes('👁️');
                                    })
                                    .sort((a, b) => {
                                      const textA = typeof a === 'string' ? a : (a as { text?: string; code: string }).text || (a as { text?: string; code: string }).code;
                                      const textB = typeof b === 'string' ? b : (b as { text?: string; code: string }).text || (b as { text?: string; code: string }).code;
                                      return getVisibilitySeverity(textB) - getVisibilitySeverity(textA);
                                    });

                                  // Keep only the worst visibility condition
                                  if (visibilityConditions.length > 0) {
                                    phenomena = phenomena
                                      .filter(p => {
                                        const text = typeof p === 'string' ? p : (p as { text?: string; code: string }).text || (p as { text?: string; code: string }).code;
                                        return !text.includes('👁️');
                                      })
                                      .concat(visibilityConditions[0]);
                                  }

                                  // Deduplicate wind conditions
                                  phenomena = phenomena.filter((condition, index, array) => {
                                    const text = typeof condition === 'string' ? condition : (condition as { text?: string; code: string }).text || (condition as { text?: string; code: string }).code;
                                    if (text.includes('💨')) {
                                      return array.indexOf(condition) === index;
                                    }
                                    return true;
                                  });
                                  
                                  // Only show "No significant weather" if there are truly no phenomena and risk level is 1
                                  if (phenomena.length === 0 && period.riskLevel.level === 1 && !period.isTemporary) {
                                    return <span className="text-xs text-slate-500">{t.noPhenomena}</span>;
                                  }

                                  // Filter out "No significant weather" message if there are other phenomena
                                  const filteredPhenomena = phenomena.filter(condition => {
                                    const text = typeof condition === 'string' ? condition : (condition as { text?: string; code: string }).text || (condition as { text?: string; code: string }).code;
                                    return !text.includes('Brak szczególnych zjawisk') && 
                                           !text.includes('No significant weather');
                                  });

                                  // Render phenomena with PROB/TEMPO indicator if applicable
                                  return (
                                    <div className="flex flex-col gap-2">
                                      {period.isTemporary && (
                                        <div className="text-xs text-yellow-400 font-medium flex items-center gap-1">
                                          <span className="text-slate-300">
                                            {t.temporaryConditions}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2">
                                        {filteredPhenomena.length > 0 ? (
                                          filteredPhenomena.map((condition, idx) => (
                                            <span
                                              key={idx}
                                              className={'bg-slate-800/50 text-slate-200 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap hover:bg-slate-700/80 hover:text-white transition-all duration-200 shadow-sm'}
                                            >
                                              {condition}
                                            </span>
                                          ))
                                        ) : period.riskLevel.level === 1 && !period.isTemporary ? (
                                          <span className="text-xs text-slate-500">{t.noPhenomena}</span>
                                        ) : null}
                                        {period.wind?.speed_kts && 
                                         !filteredPhenomena.some(p => p.includes('💨')) &&
                                         getStandardizedWindDescription(period.wind.speed_kts, language, period.wind.gust_kts) && (
                                          <span
                                            className={'bg-slate-800/50 text-slate-200 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap hover:bg-slate-700/80 hover:text-white transition-all duration-200 shadow-sm'}
                                          >
                                            {getStandardizedWindDescription(period.wind.speed_kts, language, period.wind.gust_kts)}
                                            {period.wind.gust_kts && ` (${period.wind.speed_kts}G${period.wind.gust_kts}kt)`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>

                              {period.probability && (
                                <span className="text-xs text-slate-400">
                                  {period.probability}{t.probabilityChance}
                                </span>
                              )}

                              {period.riskLevel.level > 1 && 
                               new Date(period.from) > new Date() && (
                                <div className="mt-0.5 text-xs space-y-2 border-t border-white/10 pt-3">
                                  <p className="font-medium text-slate-300">{t.operationalImpacts}:</p>
                                  <ul className="space-y-1.5">
                                    {period.operationalImpacts?.map((impact, idx) => (
                                      <li key={idx} className="text-slate-400">
                                        {impact}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {uniqueForecast.length > 4 && (
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className="w-full text-center text-sm font-medium text-slate-300 hover:text-white transition-all duration-200 bg-slate-800/50 hover:bg-slate-800/70 rounded-2xl py-4 shadow-md hover:shadow-lg"
                      >
                        {showAll ? t.showLess : t.showMore}
                      </button>
                    )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WeatherTimeline;

