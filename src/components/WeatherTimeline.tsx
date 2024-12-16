import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Wind, Eye, Cloud } from "lucide-react";
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
  forecast: ForecastChange[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}


const WeatherTimeline: React.FC<WeatherTimelineProps> = ({ current, forecast, isLoading, isError, retry }) => {
  const formatWindInfo = (wind?: { speed_kts: number; direction: number; gust_kts?: number }) => {
    if (!wind) return null;
    const gustInfo = wind.gust_kts ? ` (gusts ${wind.gust_kts}kt)` : '';
    return `${wind.speed_kts}kt from ${wind.direction}°${gustInfo}`;
  };

  const formatVisibility = (visibility?: { meters: number }) => {
    if (!visibility) return null;
    return visibility.meters >= 9999 
      ? '10+ km' 
      : `${(visibility.meters / 1000).toFixed(1)} km`;
  };

  const formatCeiling = (ceiling?: { feet: number }) => {
    if (!ceiling) return null;
    return `${ceiling.feet} ft`;
  };

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

  const WeatherDetail = ({ icon: Icon, label, value }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | null;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm">
          <span className="text-slate-400">{label}:</span>{' '}
          <span className="text-slate-200">{value}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {isError ? (
        <div className="bg-red-900/20 text-red-400 p-4 rounded-md">
          Failed to load data. <button onClick={retry} className="underline">Try again</button>
        </div>
      ) : isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded"></div>
        </div>
      ) : (
        <>
          {/* Current conditions card */}
          <Card className={`${getStatusColors(current.riskLevel.level).bg} border-slate-700/50`}>
            <CardContent className="p-4">
              <div className="flex gap-2">
                {getStatusColors(current.riskLevel.level).icon}
                <div className="space-y-2">
<div>
                    <div className={`text-l font-medium mb-1 ${getStatusColors(current.riskLevel.level).text}`}>
                      {current.riskLevel.title}
                    </div>
                    <div className="text-sm text-slate-300 mb-2">{current.riskLevel.message}</div>
                    {current.riskLevel.explanation && (
                      <span className="text-xs text-slate-400 bg-slate-900/40 rounded-full p-2 mt-1 whitespace-pre-line">
                        {current.riskLevel.explanation}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {current.conditions.phenomena.map((phenomenon, index) => (
                      <span
                        key={index}
                        className="bg-slate-900/40 text-slate-300 px-2 py-1 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white"
                      >
                        {phenomenon}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1 mt-2">
                    <WeatherDetail 
                      icon={Wind} 
                      label="Wind" 
                      value={formatWindInfo(current.wind)}
                    />
                    <WeatherDetail 
                      icon={Eye} 
                      label="Visibility" 
                      value={formatVisibility(current.visibility)}
                    />
                    <WeatherDetail 
                      icon={Cloud} 
                      label="Ceiling" 
                      value={formatCeiling(current.ceiling)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline card */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4">
              <h3 className="text-l font-medium text-slate-200 mb-4">Expected Changes</h3>
              <div className="space-y-4 divide-y divide-slate-700/50">
                {forecast.map((period, index) => {
                  const colors = getStatusColors(period.riskLevel.level);

                  return (
                    <div key={index} className="pt-4 first:pt-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-slate-200">
                            {period.from.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Europe/Warsaw'
                            })} - {period.to.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Europe/Warsaw'
                            })}
                          </div>
                          {period.isTemporary && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500 mr-1">
                              Short-term
                            </span>
                          )}
                          {period.probability && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
                              {period.probability}% chance
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {period.conditions.phenomena.map((condition, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-800/40 text-slate-300 px-2 py-0.5 rounded-full text-xs hover:bg-slate-700 hover:text-white"
                            >
                              {condition}
                            </span>
                          ))}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${colors.pill}`}>
                            {period.riskLevel.title}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 mt-2">
                        <WeatherDetail 
                          icon={Wind} 
                          label="Wind" 
                          value={formatWindInfo(period.wind)}
                        />
                        <WeatherDetail 
                          icon={Eye} 
                          label="Visibility" 
                          value={formatVisibility(period.visibility)}
                        />
                        <WeatherDetail 
                          icon={Cloud} 
                          label="Ceiling" 
                          value={formatCeiling(period.ceiling)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WeatherTimeline;