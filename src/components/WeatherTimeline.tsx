import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ForecastChange } from "@/lib/types/weather";
import Link from 'next/link';

interface WeatherTimelineProps {
  current: {
    riskLevel: {
      level: 1 | 2 | 3;
      title: string;
      message: string;
      explanation?: string;
    };
    conditions: {
      phenomena: string[];
    };
    observed: string;
    wind?: { speed_kts: number; direction: number; gust_kts?: number };
    visibility?: { meters: number };
    ceiling?: { feet: number };
  };
  forecast: ForecastChange[]; // Matches the corrected ForecastChange type
  isLoading: boolean;
  isError: boolean;
  retry: () => Promise<void>; // Ensure retry matches this signature
}

const WeatherTimeline: React.FC<WeatherTimelineProps> = ({ current, forecast, isLoading, isError, retry }) => {
  const [showAll, setShowAll] = useState(false);

  const deduplicateForecastPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    const uniquePeriods = periods.reduce((acc, current) => {
      const key = `${current.from.getTime()}-${current.to.getTime()}`;
      const existing = acc.get(key);
      
      if (!existing || 
          (existing.isTemporary && !current.isTemporary)) {
        acc.set(key, current);
      }
      
      return acc;
    }, new Map<string, ForecastChange>());

    return Array.from(uniquePeriods.values());
  };

  const uniqueForecast = deduplicateForecastPeriods(forecast);

  const getStatusColors = (level: 1 | 2 | 3) => {
    switch (level) {
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

  const formatDateTime = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const time = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Warsaw'
    });

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
                            {current.wind?.speed_kts && (
                              <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200">
                                {current.wind.gust_kts && current.wind.gust_kts >= 35 ? "💨 Strong gusts" :
                                 current.wind.gust_kts && current.wind.gust_kts >= 25 || current.wind.speed_kts >= 25 ? "💨 Strong winds" :
                                 current.wind.speed_kts >= 20 ? "💨 Moderate winds" :
                                 "💨 Light winds"}
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
                      return withinNextHour && (p.riskLevel.level > 1 || p.conditions.phenomena.length > 0);
                    }) && (
                      <div className="p-3 bg-orange-900/20 rounded-lg border border-orange-700/50">
                        <div className="flex items-top gap-2 text-orange-400">
                          <AlertTriangle className="h-4 w-4 mt-1" />
                          <div>
                            <p className="text-sm font-medium">Weather conditions expected to deteriorate soon</p>
                            <p className="text-xs mt-1">Check the timeline below for detailed changes</p>
                            <Link 
                              href="/passengerrights"
                              className="text-xs mt-2 inline-block hover:underline"
                            >
                              Learn about your passenger rights →
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline section */}
              {uniqueForecast.length > 0 && (
                <div className="space-y-4">
                  {uniqueForecast.slice(0, showAll ? undefined : 3).map((period, index) => {
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
                                  {formatDateTime(new Date(period.from.getTime() + 3600000))} - {formatDateTime(new Date(period.to.getTime() + 3600000)).split(' ').slice(-1)}
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

                            {/* Weather conditions group */}
                            <div className="flex flex-wrap items-center gap-2">
                              {period.wind && (
                                <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200">
                                  {period.wind.gust_kts && period.wind.gust_kts >= 35 ? "💨 Strong gusts" :
                                   period.wind.gust_kts && period.wind.gust_kts >= 25 || period.wind.speed_kts >= 25 ? "💨 Strong winds" :
                                   period.wind.speed_kts >= 15 ? "💨 Moderate winds" :
                                   "💨 Light winds"}
                                </span>
                              )}
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
                              {period.visibility?.meters && period.visibility.meters < 2000 && (
                                <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white">
                                  👁️ Poor visibility
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
                  
                  {forecast.length > 3 && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200 bg-slate-800/50 rounded-lg py-3"
                    >
                      {showAll ? 'Show less' : `Show ${forecast.length - 3} more periods`}
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
