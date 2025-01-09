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
      phenomena: string[];
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

function formatTimeDescription(start: Date, end: Date): string {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });
  };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startTime = formatTime(start);
  const endTime = formatTime(end);

  // Same day
  if (start.getDate() === end.getDate()) {
    const prefix = start.getDate() === today.getDate() ? 'Today' : 'Tomorrow';
    return `${prefix} ${startTime} - ${endTime}`;
  }
  
  // Crosses midnight
  const startPrefix = start.getDate() === today.getDate() ? 'Today' : 'Tomorrow';
  const endPrefix = end.getDate() === tomorrow.getDate() ? 'Tomorrow' : 'Next day';
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

  const deduplicateForecastPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    const now = new Date();
    
    // First, filter and sort periods
    const validPeriods = periods
      .filter(period => {
        const hasContent = period.from.getTime() !== period.to.getTime() && 
          period.to.getTime() > now.getTime() && 
          (period.conditions.phenomena.length > 0 || 
           (period.wind?.speed_kts && period.wind.speed_kts >= 15) || 
           (period.visibility && period.visibility.meters < 5000) || 
           (period.ceiling && period.ceiling.feet < 1000) || 
           period.isTemporary);

        return hasContent;
      })
      .sort((a, b) => a.from.getTime() - b.from.getTime());

    if (validPeriods.length === 0) return [];

    // Group periods by time ranges
    const timeRanges: Map<string, ForecastChange[]> = new Map();
    
    validPeriods.forEach(period => {
      const timeKey = `${period.from.getTime()}-${period.to.getTime()}`;
      const existing = timeRanges.get(timeKey) || [];
      timeRanges.set(timeKey, [...existing, period]);
    });

    // Process each time range
    const result: ForecastChange[] = [];
    
    timeRanges.forEach((rangePeriods, timeKey) => {
      // Sort by risk level (ascending)
      const sortedPeriods = rangePeriods.sort((a, b) => a.riskLevel.level - b.riskLevel.level);
      
      // Base period is the one with lowest risk
      const basePeriod = sortedPeriods[0];
      
      // Group higher risk periods by their time ranges
      const higherRiskPeriods = sortedPeriods.slice(1);
      const groupedByTime = new Map<string, ForecastChange[]>();
      
      higherRiskPeriods.forEach(period => {
        const periodKey = `${period.from.getTime()}-${period.to.getTime()}`;
        const existing = groupedByTime.get(periodKey) || [];
        groupedByTime.set(periodKey, [...existing, period]);
      });

      // Create nested conditions with time grouping
      const nestedConditions: ForecastChange[] = [];
      
      groupedByTime.forEach((timePeriods) => {
        timePeriods.forEach(period => {
          nestedConditions.push({
            ...period,
            isNested: true,
            probability: period.probability || (period.change?.probability ?? undefined)
          });
        });
      });

      result.push({
        ...basePeriod,
        nestedConditions: nestedConditions
      });
    });

    return result.sort((a, b) => a.from.getTime() - b.from.getTime());
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
          bg: "bg-red-900/20",
          text: "text-red-400",
          icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
          pill: "bg-red-400/10 text-red-400"
        };
      case 2:
        return {
          bg: "bg-orange-900/20",
          text: "text-orange-400",
          icon: <AlertTriangle className="h-4 w-4 text-orange-400" />,
          pill: "bg-orange-400/10 text-orange-400"
        };
      default:
        return {
          bg: "bg-emerald-900/20",
          text: "text-emerald-400",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
          pill: "bg-emerald-400/10 text-emerald-400"
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const time = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });

    // Convert the input date to Warsaw time for day comparison
    const warsawDate = new Date(date.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
    const warsawToday = new Date(today.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
    const warsawTomorrow = new Date(tomorrow.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));

    const isToday = warsawDate.getDate() === warsawToday.getDate() &&
                    warsawDate.getMonth() === warsawToday.getMonth() &&
                    warsawDate.getFullYear() === warsawToday.getFullYear();
                    
    const isTomorrow = warsawDate.getDate() === warsawTomorrow.getDate() &&
                       warsawDate.getMonth() === warsawTomorrow.getMonth() &&
                       warsawDate.getFullYear() === warsawTomorrow.getFullYear();

    if (isEndTime) {
      if (isToday) {
        return `${t.until} ${time}`;
      } else if (isTomorrow) {
        return `${t.until} ${t.tomorrow} ${time}`;
      } else {
        return `${t.until} ${date.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Warsaw'
        })}`;
      }
    }

    if (isToday) {
      return `${t.today} ${time}`;
    } else if (isTomorrow) {
      return `${t.tomorrow} ${time}`;
    } else {
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      });
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
              <Card className={`${getStatusColors(current.riskLevel.level).bg} border-slate-700/50`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium text-slate-200">
                          {t.currentConditions} • {t.updated} {adjustToWarsawTime(new Date(current.observed)).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Europe/Warsaw'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColors(current.riskLevel.level).pill} w-full sm:w-auto text-center sm:text-left`}>
                          {current.riskLevel.title}
                        </span>
                      </div>
                    </div>

                    <div className={`text-lg font-medium ${getStatusColors(current.riskLevel.level).text}`}>
                      {current.riskLevel.statusMessage}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-2 w-full">
                        {current.conditions.phenomena.map((phenomenon, index) => (
                          <span
                            key={index}
                            className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                            title={getDetailedDescription(phenomenon)}
                          >
                            {phenomenon}
                          </span>
                        ))}

                        {current.wind?.speed_kts && !current.conditions.phenomena.some(p => p.includes('Wind')) && (
                          <span
                            className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                            title={`Wind ${current.wind.direction}° at ${current.wind.speed_kts}kt${current.wind.gust_kts ? ` (gusts ${current.wind.gust_kts}kt)` : ''}`}
                          >
                            {getStandardizedWindDescription(current.wind.speed_kts, language, current.wind.gust_kts)}
                            {current.wind.gust_kts && ` (${current.wind.speed_kts}G${current.wind.gust_kts}kt)`}
                          </span>
                        )}

                        {current.visibility?.meters && (
                          <span
                            className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                            title={`Current visibility: ${current.visibility.meters} meters`}
                          >
                            {formatVisibilityDescription(current.visibility.meters)}
                            {current.visibility.meters < 5000 && ` (${current.visibility.meters}m)`}
                          </span>
                        )}

                        {current.ceiling?.feet && (
                          <span
                            className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
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
                      
                      return (
                        <Card 
                          key={`${period.from.getTime()}-${period.to.getTime()}-${index}`}
                          className={`border-slate-700/50 ${
                            period.riskLevel.level > 1 ? colors.bg : 'bg-slate-800/50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-200">
                                    {formatDateTime(period.from)} - {formatDateTime(period.to)}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs ${colors.pill}`}>
                                    {period.riskLevel.title}
                                  </span>
                                </div>
                                
                                {period.isTemporary && (
                                  <span className="text-xs text-yellow-400">
                                    {t.temporaryConditions}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {period.conditions.phenomena.map((phenomenon, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs"
                                  >
                                    {phenomenon}
                                  </span>
                                ))}
                              </div>

                              {period.operationalImpacts && period.operationalImpacts.length > 0 && (
                                <div className="mt-2 text-xs space-y-1">
                                  {period.operationalImpacts.map((impact, idx) => (
                                    <div key={idx} className="text-slate-400">
                                      {impact}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {period.nestedConditions && period.nestedConditions.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  <div className="text-sm text-slate-300">
                                    {t.weatherTimeline.periodWarning}
                                  </div>
                                  {period.nestedConditions.map((nestedPeriod, idx) => (
                                    <div 
                                      key={idx}
                                      className={`p-3 rounded-lg ${getStatusColors(nestedPeriod.riskLevel.level).bg}`}
                                    >
                                      <div className="flex flex-col gap-3">
                                        {/* Header with risk level and probability */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            {nestedPeriod.probability && (
                                              <span className="text-xs text-yellow-400 px-2 py-0.5 rounded-full bg-yellow-400/10">
                                                {nestedPeriod.probability}% {t.weatherTimeline.temporaryIntensification}
                                              </span>
                                            )}
                                          </div>
                                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColors(nestedPeriod.riskLevel.level).pill}`}>
                                            {nestedPeriod.riskLevel.title}
                                          </span>
                                        </div>

                                        {/* Weather phenomena */}
                                        <div className="flex flex-wrap gap-2">
                                          {nestedPeriod.conditions.phenomena.map((phenomenon, pIdx) => (
                                            <span
                                              key={pIdx}
                                              className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs"
                                            >
                                              {phenomenon}
                                            </span>
                                          ))}
                                        </div>

                                        {/* Operational impacts */}
                                        {nestedPeriod.operationalImpacts && nestedPeriod.operationalImpacts.length > 0 && (
                                          <div className="text-xs space-y-1">
                                            {nestedPeriod.operationalImpacts.map((impact, impIdx) => (
                                              <div key={impIdx} className="text-slate-400">
                                                {impact}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
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
                        className="w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200 bg-slate-800/50 rounded-lg py-3"
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
