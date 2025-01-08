import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ForecastChange, RiskAssessment } from "@/lib/types/weather";
import { RiskLegendDialog } from "./RiskLegend";
import { adjustToWarsawTime } from '@/lib/utils/time';

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

function getStandardizedWindDescription(speed: number, gusts?: number): string {
  if (gusts && gusts >= 35) return "💨 Strong Wind Gusts";
  if (gusts && gusts >= 25 || speed >= 25) return "💨 Strong Winds";
  if (speed >= 15) return "💨 Moderate Winds";
  return ""; // Don't show light winds
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

const WeatherTimeline: React.FC<WeatherTimelineProps> = ({ current, forecast, isLoading, isError, retry }) => {
  const [showAll, setShowAll] = useState(false);

  const deduplicateForecastPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    const now = new Date();
    
    // First, filter and sort as before
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
      .sort((a, b) => {
        // Sort by start time first
        const timeCompare = a.from.getTime() - b.from.getTime();
        if (timeCompare !== 0) return timeCompare;
        
        // If same start time, put temporary conditions after base conditions
        if (a.isTemporary && !b.isTemporary) return 1;
        if (!a.isTemporary && b.isTemporary) return -1;
        
        // If both temporary or both base, higher risk level goes first
        return b.riskLevel.level - a.riskLevel.level;
      });

    if (validPeriods.length === 0) return [];

    const result: ForecastChange[] = [];
    let currentPeriod = validPeriods[0];

    // Adjust start time of first period if it's in the past
    if (currentPeriod.from.getTime() < now.getTime()) {
      currentPeriod = {
        ...currentPeriod,
        from: now,
        timeDescription: formatTimeDescription(now, currentPeriod.to)
      };
    }

    for (let i = 1; i < validPeriods.length; i++) {
      const nextPeriod = validPeriods[i];

      // If next period is temporary and overlaps with current
      if (nextPeriod.isTemporary && 
          nextPeriod.from.getTime() < currentPeriod.to.getTime()) {
        
        // If temporary period starts after current period's start
        if (nextPeriod.from.getTime() > currentPeriod.from.getTime()) {
          // Add the first part of the base period
          result.push({
            ...currentPeriod,
            to: nextPeriod.from,
            timeDescription: formatTimeDescription(currentPeriod.from, nextPeriod.from)
          });
        }
        
        // Add the temporary period
        result.push(nextPeriod);
        
        // If temporary period ends before current period ends
        if (nextPeriod.to.getTime() < currentPeriod.to.getTime()) {
          // Continue with the remainder of the base period
          currentPeriod = {
            ...currentPeriod,
            from: nextPeriod.to,
            timeDescription: formatTimeDescription(nextPeriod.to, currentPeriod.to)
          };
          continue;
        }
      }

      // Handle non-temporary overlapping periods
      if (currentPeriod.to.getTime() > nextPeriod.from.getTime()) {
        if (!nextPeriod.isTemporary) {
          if (nextPeriod.riskLevel.level > currentPeriod.riskLevel.level) {
            currentPeriod.to = new Date(nextPeriod.from.getTime());
            result.push(currentPeriod);
            currentPeriod = nextPeriod;
          } else if (nextPeriod.riskLevel.level <= currentPeriod.riskLevel.level) {
            const currentSet = new Set(currentPeriod.conditions.phenomena);
            const hasUniqueConditions = nextPeriod.conditions.phenomena.some(p => !currentSet.has(p));
            
            if (hasUniqueConditions) {
              currentPeriod.to = new Date(nextPeriod.from.getTime());
              result.push(currentPeriod);
              currentPeriod = nextPeriod;
            } else if (nextPeriod.to.getTime() > currentPeriod.to.getTime()) {
              currentPeriod.to = new Date(nextPeriod.to.getTime());
            }
          }
        }
      } else {
        result.push(currentPeriod);
        currentPeriod = nextPeriod;
      }
    }

    // Don't forget to push the last period
    result.push(currentPeriod);

    return result;
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
        return `Until ${time}`;
      } else if (isTomorrow) {
        return `Until Tomorrow ${time}`;
      } else {
        return `Until ${date.toLocaleDateString('en-GB', {
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
      return `Today ${time}`;
    } else if (isTomorrow) {
      return `Tomorrow ${time}`;
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
                    {/* Time and status group */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium text-slate-200">
                          Current Conditions • Updated {adjustToWarsawTime(new Date(current.observed)).toLocaleTimeString('en-GB', {
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

                    {/* Add prominent status message */}
                    <div className={`text-lg font-medium ${getStatusColors(current.riskLevel.level).text}`}>
                      {current.riskLevel.statusMessage}
                    </div>

                    {/* Weather conditions group */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-2 w-full">
                        {/* Weather phenomena */}
                        {current.conditions.phenomena.map((phenomenon, index) => (
                          <span
                            key={index}
                            className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                            title={getDetailedDescription(phenomenon)}
                          >
                            {phenomenon}
                          </span>
                        ))}

                        {/* Wind conditions if not already shown in phenomena */}
                        {current.wind?.speed_kts && !current.conditions.phenomena.some(p => p.includes('Wind')) && (
                          <span
                            className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                            title={`Wind ${current.wind.direction}° at ${current.wind.speed_kts}kt${current.wind.gust_kts ? ` (gusts ${current.wind.gust_kts}kt)` : ''}`}
                          >
                            {getStandardizedWindDescription(current.wind.speed_kts, current.wind.gust_kts)}
                            {current.wind.gust_kts && ` (${current.wind.speed_kts}G${current.wind.gust_kts}kt)`}
                          </span>
                        )}

                        {/* Visibility conditions */}
                        {current.visibility?.meters && (
                          <span
                            className="bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                            title={`Current visibility: ${current.visibility.meters} meters`}
                          >
                            {formatVisibilityDescription(current.visibility.meters)}
                            {current.visibility.meters < 5000 && ` (${current.visibility.meters}m)`}
                          </span>
                        )}

                        {/* Ceiling conditions */}
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

                    {/* Detailed weather information */}
                    {(current.wind || current.visibility || current.ceiling) && (
                      <div className="mt-2 text-xs text-slate-400 space-y-1">
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {current.wind && (
                            <span title="Wind direction and speed">
                              💨 Wind: {current.wind.direction}° at {current.wind.speed_kts}kt
                              {current.wind.gust_kts && ` (gusts ${current.wind.gust_kts}kt)`}
                            </span>
                          )}
                          
                          {current.visibility && (
                            <span title="Ground visibility">
                              👁️ Visibility: {current.visibility.meters}m
                            </span>
                          )}
                          
                          {current.ceiling && (
                            <span title="Cloud ceiling height">
                              ☁️ Ceiling: {current.ceiling.feet}ft
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Risk explanation and operational impacts */}
                    {(current.riskLevel.explanation || current.riskLevel.operationalImpacts) && (
                      <div className="mt-2 text-sm space-y-2">
                        {current.riskLevel.explanation && (
                          <p className="text-slate-300">{current.riskLevel.explanation}</p>
                        )}
                        
                        {current.riskLevel.operationalImpacts && 
                         current.riskLevel.operationalImpacts.length > 0 && (
                          <div className="mt-2 border-t border-white/10 pt-3">
                            <p className="font-medium text-slate-200 text-sm">What to expect:</p>
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

                    {/* Warning banner for deteriorating conditions */}
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

              {/* Replace the existing legend button with this drawer */}
              <RiskLegendDialog />

              {/* Timeline section */}
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
                            period.riskLevel.level > 1 && period.riskLevel.title !== "Good Flying Conditions" 
                              ? colors.bg 
                              : 'bg-slate-800/50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              {/* Time and status group */}
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <span className="text-sm font-medium text-slate-200">
                                    {period.from.getTime() < new Date().getTime()
                                      ? formatDateTime(period.to, true)  // Show "until X" format for current period
                                      : `${formatDateTime(period.from)} - ${
                                          // If the end time is on a different day than the start time
                                          period.from.toDateString() !== period.to.toDateString() 
                                            ? formatDateTime(period.to)  // Show full date/time
                                            : period.to.toLocaleTimeString('en-GB', {  // Show only time
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Europe/Warsaw'
                                              })
                                        }`
                                  }
                                  </span>
                               
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <span className={`px-2 py-1 rounded-full text-xs ${colors.pill} w-full sm:w-auto text-center sm:text-left`}>
                                    {period.riskLevel.title}
                                  </span>
                                  
                                </div>
                              </div>
                              {hasVisiblePhenomena(period) && (
                                <div className="mt-1.5 border-t border-white/10"> </div>
                              )}
                              {/* Weather conditions group */}
                              <div className="flex flex-wrap items-center gap-2">
                                {period.isTemporary && (
                                  <div className="w-full text-xs text-yellow-400 mb-1">
                                    Temporary conditions possible:
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-2 w-full">
                                  {period.conditions.phenomena.length > 0 ? (
                                    period.conditions.phenomena
                                      .filter(condition => condition.trim() !== '')
                                      .map((condition, idx) => (
                                        <span
                                          key={idx}
                                          className={'bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200'}
                                        >
                                          {condition}
                                        </span>
                                      ))
                                  ) : (
                                    <span className="text-xs text-slate-500">No phenomena reported</span>
                                  )}
                                  {period.wind?.speed_kts && 
                                   !period.conditions.phenomena.some(p => p.includes('Wind')) &&
                                   getStandardizedWindDescription(period.wind.speed_kts, period.wind.gust_kts) && (
                                    <span
                                      className={'bg-slate-800/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200'}
                                    >
                                      {getStandardizedWindDescription(period.wind.speed_kts, period.wind.gust_kts)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Probability if exists */}
                              {period.probability && (
                                <span className="text-xs text-slate-400">
                                  {period.probability}% chance of these conditions
                                </span>
                              )}

                              {/* Only show impacts for future periods with risk > 1 */}
                              {period.riskLevel.level > 1 && 
                               new Date(period.from) > new Date() && (
                                <div className="mt-0.5 text-xs space-y-2 border-t border-white/10 pt-3">
                                  <p className="font-medium text-slate-300">What to expect:</p>
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
                        className="w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200 bg-slate-800/50 rounded-lg py-3"
                      >
                        {showAll 
                          ? 'Show less' 
                          : `Show ${uniqueForecast.length - 4} more ${uniqueForecast.length - 4 === 1 ? 'period' : 'periods'}`}
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
