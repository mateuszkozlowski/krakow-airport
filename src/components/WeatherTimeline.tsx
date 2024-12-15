import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { ForecastChange } from "@/lib/types/weather";

interface WeatherTimelineProps {
  current: {
    riskLevel: {
      level: 1 | 2 | 3;
      title: string;
      message: string;
    };
    conditions: {
      phenomena: string[];
    };
    observed: string;
  };
  forecast: ForecastChange[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

const WeatherTimeline: React.FC<WeatherTimelineProps> = ({ current, forecast, isLoading, isError, retry }) => {
  const processForecasts = (forecasts: ForecastChange[]) => {
    if (!forecasts?.length) return [];

    const timePoints = new Set<number>();
    forecasts.forEach(f => {
      timePoints.add(f.from.getTime());
      timePoints.add(f.to.getTime());
    });

    const sortedTimePoints = Array.from(timePoints).sort((a, b) => a - b);
    const periods = [];

    for (let i = 0; i < sortedTimePoints.length - 1; i++) {
      const startTime = new Date(sortedTimePoints[i]);
      const endTime = new Date(sortedTimePoints[i + 1]);

      const overlappingForecasts = forecasts.filter(f => 
        f.from <= endTime && f.to >= startTime
      );

      const maxRiskLevel = Math.max(...overlappingForecasts.map(f => f.riskLevel.level));
      const allConditions = new Set<string>();
      overlappingForecasts.forEach(f => 
        f.conditions.phenomena.forEach(p => allConditions.add(p))
      );

      periods.push({
        from: startTime,
        to: endTime,
        conditions: Array.from(allConditions),
        riskLevel: maxRiskLevel as 1 | 2 | 3,
        isTemporary: overlappingForecasts.some(f => f.changeType === 'TEMPO'),
        probability: overlappingForecasts.find(f => 
          f.timeDescription.includes('probability')
        )?.timeDescription.match(/\((\d+)% probability\)/)?.[1]
      });
    }

    return periods;
  };

  const formatTimeRange = (from: Date, to: Date) => {
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

    const fromDay = from.getDate() === today.getDate() ? 'Today' : 'Tomorrow';
    const toDay = to.getDate() === today.getDate() ? 'Today' : 'Tomorrow';

    return `${fromDay} ${formatTime(from)} - ${toDay} ${formatTime(to)}`;
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

  const processedForecasts = processForecasts(forecast);

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
                    <div className="text-sm text-slate-300">{current.riskLevel.message}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {current.conditions.phenomena.map((phenomenon, index) => (
                      <span
                        key={index}
                        className="bg-slate-900/40 text-slate-300 px-2 py-0.5 rounded-full text-xs whitespace-nowrap hover:bg-slate-700 hover:text-white"
                      >
                        {phenomenon}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline card */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4">
              <h3 className="text-l font-medium text-slate-200 mb-4">Expected Changes</h3>
            <div
              className={`space-y-2 max-h-[calc(3.2*4rem)] overflow-y-auto`} // Adjust this height as needed (5 * 4rem for 5 flights)
            >
              <div className="space-y-4 divide-y divide-slate-700/50">
                {processedForecasts.map((period, index) => {
                  const colors = getStatusColors(period.riskLevel);

                  return (

                    <div key={index} className="pt-4 first:pt-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-slate-200">
                            {formatTimeRange(period.from, period.to)}
                          </div>
                          {period.isTemporary && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500 mr-1">
                              Short-term
                            </span>

                          )}
                                                        {period.probability && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-500">
                                {" "}{period.probability}% chance
                              </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {period.conditions.map((condition, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-800/40 text-slate-300 px-2 py-0.5 rounded-full text-xs hover:bg-slate-700 hover:text-white"
                            >
                              {condition}
                            </span>
                          ))}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${colors.pill}`}>
                            {period.riskLevel === 3 ? 'High risk of delays' : 
                             period.riskLevel === 2 ? 'Some delays possible' : 
                             'No disruptions expected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div></div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default WeatherTimeline;