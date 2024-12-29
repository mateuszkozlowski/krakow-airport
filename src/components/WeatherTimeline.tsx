import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ForecastChange } from "@/lib/types/weather";

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

  const calculateTimeUntilChange = () => {
    if (forecast.length === 0) return 60; // Default to 60 minutes if no changes

    const now = new Date();
    const nextChange = forecast[0].from;
    const diffMinutes = Math.round((nextChange.getTime() - now.getTime()) / (1000 * 60));
    
    return Math.max(1, Math.min(diffMinutes, 60)); // Clamp between 1 and 60 minutes
  };

  const timeUntilChange = calculateTimeUntilChange();

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
                      {current.conditions.phenomena.length === 0 ? (
                        <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap">
                          ☀️ Clear conditions
                        </span>
                      ) : (
                        Array.from(new Set(current.conditions.phenomena)).map((phenomenon, index) => (
                          <span
                            key={index}
                            className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200"
                          >
                            {phenomenon}
                          </span>
                        ))
                      )}
                      {current.wind?.speed_kts && current.wind.speed_kts >= 15 && (
                        <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-sm whitespace-nowrap hover:bg-slate-700 hover:text-white transition-colors duration-200">
                          💨 Strong winds
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
                        <div className="w-full sm:w-auto">
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
                            <p className="text-xs  mt-1">Check the timeline below for detailed changes</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                  </div>
                </CardContent>
              </Card>

              {/* Timeline card */}
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-4">
                    <h3 className="text-l font-medium text-slate-200">Expected Changes</h3>
                    <span className="text-sm text-slate-400 whitespace-nowrap">
                      Forecast issued at: {current.observed.split('T')[1].slice(0, 5)}
                    </span>
                  </div>
                  {forecast.length === 0 || (forecast.every(p => p.riskLevel.level === 1 && p.conditions.phenomena.length === 0) && 
                    !forecast.some(p => {
                      const withinNextHour = new Date(p.from).getTime() - new Date().getTime() <= 3600000;
                      return withinNextHour && (p.riskLevel.level > 1 || p.conditions.phenomena.length > 0);
                    })) ? (
                    <div className="text-center py-6 text-slate-400">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                      <p className="text-lg text-emerald-400">Perfect flying conditions</p>
                      <p className="text-sm mt-2">No significant weather changes expected</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 divide-y divide-slate-700/50">
                        {uniqueForecast.slice(0, showAll ? undefined : 3).map((period, index) => {
                          const colors = getStatusColors(period.riskLevel.level);

                          return (
                            <div key={index} className="pt-4 first:pt-0">
                              <div className="flex flex-col gap-3">
                                {/* Time and status group */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <span className="text-sm font-medium text-slate-200">
                                      {period.from.toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Europe/Warsaw'
                                      })} - {period.to.toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Europe/Warsaw'
                                      })}
                                    </span>
                                    {period.isTemporary && (
                                      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
                                        Temporary
                                      </span>
                                    )}
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs ${colors.pill} w-full sm:w-auto text-center sm:text-left`}>
                                    {period.riskLevel.title}
                                  </span>
                                </div>

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
                                  {period.visibility?.meters && period.visibility.meters < 2000 && (
                                    <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white">
                                      👁️ Poor visibility
                                    </span>
                                  )}
                                  {period.wind?.speed_kts && period.wind.speed_kts >= 18 && (
                                    <span className="bg-slate-900/40 text-slate-300 px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white">
                                      💨 Strong winds
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
                            </div>
                          );
                        })}
                      </div>
                      {forecast.length > 3 && (
                        <button
                          onClick={() => setShowAll(!showAll)}
                          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200"
                        >
                          {showAll ? 'Show less' : `Show ${forecast.length - 3} more periods`}
                        </button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WeatherTimeline;
