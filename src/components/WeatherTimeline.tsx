import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ForecastChange } from "@/lib/types/weather";
import Link from 'next/link';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { RiskLegendDialog } from "./RiskLegend";

interface WeatherTimelineProps {
  current: {
    riskLevel: {
      level: 1 | 2 | 3 | 4;
      title: string;
      message: string;
      explanation?: string;
      color: 'red' | 'orange' | 'yellow' | 'green';
    };
    conditions: {
      phenomena: string[];
    };
    observed: string;
    wind?: { speed_kts: number; direction: number; gust_kts?: number };
    visibility?: { meters: number };
    ceiling?: { feet: number };
  };
  forecast: ForecastChange[];
  isLoading: boolean;
  isError: boolean;
  retry: () => Promise<void>;
}

const WeatherTimeline: React.FC<WeatherTimelineProps> = ({ current, forecast, isLoading, isError, retry }) => {
  const [showAll, setShowAll] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const deduplicateForecastPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    // First, filter out empty periods and sort by time and risk
    const validPeriods = periods
      .filter(period => 
        period.from.getTime() !== period.to.getTime() && // Remove zero-duration periods
        period.from.getTime() < period.to.getTime() && // Ensure end time is after start time
        (period.conditions.phenomena.length > 0 || // Keep if has phenomena
         (period.wind?.speed_kts && period.wind.speed_kts >= 15) || // Keep if significant wind
         (period.visibility && period.visibility.meters < 5000) || // Keep if poor visibility
         (period.ceiling && period.ceiling.feet < 1000)) // Keep if low ceiling
      )
      .sort((a, b) => a.from.getTime() - b.from.getTime());

    if (validPeriods.length === 0) return [];

    const result: ForecastChange[] = [];
    let currentPeriod = validPeriods[0];

    for (let i = 1; i < validPeriods.length; i++) {
      const nextPeriod = validPeriods[i];

      // If periods overlap and have different conditions
      if (currentPeriod.to.getTime() > nextPeriod.from.getTime()) {
        // If next period has higher risk, truncate current period
        if (nextPeriod.riskLevel.level > currentPeriod.riskLevel.level) {
          currentPeriod.to = new Date(nextPeriod.from.getTime());
          result.push(currentPeriod);
          currentPeriod = nextPeriod;
        }
        // If next period has same or lower risk, skip it unless it has unique phenomena
        else if (nextPeriod.riskLevel.level <= currentPeriod.riskLevel.level) {
          const currentSet = new Set(currentPeriod.conditions.phenomena);
          const hasUniqueConditions = nextPeriod.conditions.phenomena.some(p => !currentSet.has(p));
          
          if (hasUniqueConditions) {
            currentPeriod.to = new Date(nextPeriod.from.getTime());
            result.push(currentPeriod);
            currentPeriod = nextPeriod;
          }
          // Otherwise, extend current period if needed
          else if (nextPeriod.to.getTime() > currentPeriod.to.getTime()) {
            currentPeriod.to = new Date(nextPeriod.to.getTime());
          }
        }
      }
      // If periods don't overlap
      else {
        result.push(currentPeriod);
        currentPeriod = nextPeriod;
      }
    }

    // Don't forget to push the last period
    result.push(currentPeriod);

    // Final pass to merge adjacent periods with identical conditions
    return result.reduce((acc, period) => {
      const lastPeriod = acc[acc.length - 1];
      
      if (lastPeriod && 
          period.from.getTime() <= lastPeriod.to.getTime() && 
          period.riskLevel.level === lastPeriod.riskLevel.level &&
          JSON.stringify(period.conditions.phenomena.sort()) === 
          JSON.stringify(lastPeriod.conditions.phenomena.sort())) {
        lastPeriod.to = new Date(Math.max(lastPeriod.to.getTime(), period.to.getTime()));
      } else {
        acc.push(period);
      }
      
      return acc;
    }, [] as ForecastChange[]);
  };

  const uniqueForecast = deduplicateForecastPeriods(forecast);

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
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex items-start gap-3 w-full sm:w-auto">
                        <div className="mt-1">
                          {getStatusColors(current.riskLevel.level).icon}
                        </div>
                        <div className="flex-1">
                          <div className={`text-ld font-medium ${getStatusColors(current.riskLevel.level).text}`}>
                            {current.riskLevel.title}
                          </div>
                          <div className="text-base text-slate-300 mt-1">
                            {current.riskLevel.message}
                          </div>

                          {/* Weather conditions */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {current.conditions.phenomena.map((phenomenon, index) => (
                              <span
                                key={index}
                                className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                              >
                                {phenomenon}
                              </span>
                            ))}
                            {current.wind?.speed_kts && !current.conditions.phenomena.some(p => p.includes('Wind')) && (
                              <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200">
                                {`💨 Wind ${current.wind.speed_kts}kt${current.wind.gust_kts ? ` gusting ${current.wind.gust_kts}kt` : ''}`}
                              </span>
                            )}
                            {current.visibility?.meters && current.visibility.meters < 5000 && (
                              <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200">
                                👁️ Poor visibility
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {current.riskLevel.level > 1 && (
                        <div className="w-full sm:w-auto flex flex-col gap-2">
                          <span className="animate-pulse px-3 py-1.5 rounded-full text-sm bg-red-400/10 text-red-400 flex items-center justify-center sm:justify-start gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Check flight status
                          </span>
                          
                        </div>
                      )}
                    </div>

                    {/* Warning banner for deteriorating conditions */}
                    {current.riskLevel.level === 1 && forecast.some(p => {
                      const withinNextHour = new Date(p.from).getTime() - new Date().getTime() <= 3600000;
                      return withinNextHour && p.riskLevel.level > 1;
                    }) && (
                      <div className="p-3 bg-orange-900/20 rounded-lg border border-orange-700/50">
                        <div className="flex items-top gap-2 text-orange-400">
                          <AlertTriangle className="w-12 h-12 md:w-4 md:h-4 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium"><span className="font-bold">Weather conditions expected to deteriorate soon.</span> Check the timeline below for detailed changes</p>
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
                  {uniqueForecast.slice(0, showAll ? uniqueForecast.length : 4).map((period, index) => {
                    const colors = getStatusColors(period.riskLevel.level);

                    return (
                      <Card 
                        key={index} 
                        className={`border-slate-700/50 ${period.riskLevel.level > 1 ? colors.bg : 'bg-slate-800/50'}`}
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
                                {period.isTemporary && (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
                                    Temporary
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className={`px-2 py-1 rounded-full text-xs ${colors.pill} w-full sm:w-auto text-center sm:text-left`}>
                                  {period.riskLevel.title}
                                </span>
                                {colors.icon}
                              </div>
                            </div>
                            {(period.conditions.phenomena.length > 0 || period.wind) && (
                              <div className="mt-1.5 border-t border-white/10"> </div>
                            )}
                            {/* Weather conditions group */}
                            <div className="flex flex-wrap items-center gap-2">
                              {Array.from(new Set(period.conditions.phenomena)).map((condition, idx) => (
                                <span
                                  key={idx}
                                  role="status"
                                  aria-label={`Weather condition: ${condition}`}
                                  title={condition}
                                  className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                                >
                                  {condition}
                                </span>
                              ))}
                              {period.wind && !period.conditions.phenomena.some(p => p.includes('Wind')) && (
                                <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200">
                                  {`💨 Wind ${period.wind.speed_kts}kt${period.wind.gust_kts ? ` gusting ${period.wind.gust_kts}kt` : ''}`}
                                </span>
                              )}
                            </div>

                            {/* Probability if exists */}
                            {period.probability && (
                              <span className="text-xs text-slate-400">
                                {period.probability}% chance of these conditions
                              </span>
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
