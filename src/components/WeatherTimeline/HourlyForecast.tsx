"use client"

import React from 'react';
import type { ForecastChange } from "@/lib/types/weather";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HourlyForecastProps {
  forecast: ForecastChange[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  const getRiskColor = (level: 1 | 2 | 3 | 4) => {
    switch (level) {
      case 4: return "bg-red-950/40 hover:bg-red-950/50";
      case 3: return "bg-red-900/40 hover:bg-red-900/50";
      case 2: return "bg-orange-900/40 hover:bg-orange-900/50";
      default: return "bg-slate-800/50 hover:bg-slate-800/60";
    }
  };

  const getRiskStyles = (level: 1 | 2 | 3 | 4) => {
    switch (level) {
      case 4: return "text-red-500";
      case 3: return "text-red-400";
      case 2: return "text-orange-400";
      default: return "text-emerald-400";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === now.toDateString();
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

  const getNow = () => {
    const now = new Date();
    const warsawTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    return warsawTime;
  };

  const processForDisplay = (periods: ForecastChange[]) => {
    const now = getNow();
    
    console.log('Current time (Warsaw):', now);
    console.log('All periods:', periods.map(p => ({
      from: p.from,
      to: p.to,
      isTemporary: p.isTemporary,
      isCurrent: p.from <= now && p.to >= now
    })));
    
    const currentBasePeriod = periods.find(p => 
      !p.isTemporary && 
      new Date(p.from) <= now && 
      new Date(p.to) >= now
    );

    const currentTemporaryPeriods = periods.filter(p => 
      p.isTemporary && 
      new Date(p.from) <= now && 
      new Date(p.to) >= now
    );

    const futurePeriods = periods.filter(p => 
      new Date(p.from) > now
    );

    console.log('Processed periods:', {
      current: currentBasePeriod,
      temporaryNow: currentTemporaryPeriods,
      future: futurePeriods
    });

    return {
      current: currentBasePeriod,
      temporaryNow: currentTemporaryPeriods,
      future: futurePeriods
    };
  };

  const { current, temporaryNow, future } = processForDisplay(forecast);

  return (
    <div className="space-y-2">
      {/* Current period */}
      {current && (
        <div 
          className={cn(
            "relative rounded-lg transition-colors p-4 space-y-3",
            getRiskColor(current.riskLevel.level),
            "ring-1 ring-blue-500"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-200">
                Until {formatTime(current.to).split(' ')[1]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {current.riskLevel.level > 1 && (
                <AlertTriangle className={cn("h-4 w-4", getRiskStyles(current.riskLevel.level))} />
              )}
              <span className={cn("text-sm font-medium", getRiskStyles(current.riskLevel.level))}>
                {current.riskLevel.title}
              </span>
            </div>
          </div>

          {current.conditions.phenomena.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {current.conditions.phenomena.map((phenomenon, idx) => (
                <span
                  key={idx}
                  className="text-sm bg-slate-900/60 text-slate-300 px-2.5 py-1 rounded"
                >
                  {phenomenon}
                </span>
              ))}
            </div>
          )}

          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
        </div>
      )}

      {/* Current temporary conditions */}
      {temporaryNow.map((period, index) => (
        <div 
          key={`temp-${index}`}
          className={cn(
            "relative rounded-lg transition-colors p-4 space-y-3",
            getRiskColor(period.riskLevel.level),
            "border border-yellow-500/20"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-200">
                Until {formatTime(period.to).split(' ')[1]}
              </span>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                Temporary
              </span>
            </div>
            <div className="flex items-center gap-2">
              {period.riskLevel.level > 1 && (
                <AlertTriangle className={cn("h-4 w-4", getRiskStyles(period.riskLevel.level))} />
              )}
              <span className={cn("text-sm font-medium", getRiskStyles(period.riskLevel.level))}>
                {period.riskLevel.title}
              </span>
            </div>
          </div>

          {period.conditions.phenomena.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {period.conditions.phenomena.map((phenomenon, idx) => (
                <span
                  key={idx}
                  className="text-sm bg-slate-900/60 text-slate-300 px-2.5 py-1 rounded"
                >
                  {phenomenon}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Future periods */}
      {future.map((period, index) => {
        const isActive = period.from <= new Date() && period.to >= new Date();
        
        return (
          <div 
            key={index}
            className={cn(
              "relative rounded-lg transition-colors p-4 space-y-3",
              getRiskColor(period.riskLevel.level),
              isActive && "ring-1 ring-blue-500",
              period.isTemporary && "border border-yellow-500/20"
            )}
          >
            {/* Time and Risk Level */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-200">
                  {isActive ? `Until ${formatTime(period.to).split(' ')[1]}` : 
                    `${formatTime(period.from)} - ${formatTime(period.to).split(' ')[1]}`}
                </span>
                {period.isTemporary && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                    Temporary
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {period.riskLevel.level > 1 && (
                  <AlertTriangle className={cn("h-4 w-4", getRiskStyles(period.riskLevel.level))} />
                )}
                <span className={cn("text-sm font-medium", getRiskStyles(period.riskLevel.level))}>
                  {period.riskLevel.title}
                </span>
              </div>
            </div>

            {/* Weather Conditions */}
            {period.conditions.phenomena.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {period.conditions.phenomena.map((phenomenon, idx) => (
                  <span
                    key={idx}
                    className="text-sm bg-slate-900/60 text-slate-300 px-2.5 py-1 rounded"
                  >
                    {phenomenon}
                  </span>
                ))}
              </div>
            )}

            {/* Active indicator */}
            {isActive && (
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
            )}
          </div>
        );
      })}
    </div>
  );
}; 