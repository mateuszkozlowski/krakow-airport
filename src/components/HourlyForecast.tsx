// src/components/HourlyForecast.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertCircle } from 'lucide-react';
import type { ForecastChange } from '@/lib/types/weather';

interface HourlyForecastProps {
  forecast: ForecastChange[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 text-white">Weather Forecast</h2>
      <div className="space-y-3">
        {forecast.map((period, index) => {
          const hasWeatherPhenomena = period.conditions.phenomena?.length > 0;
          
          if (!hasWeatherPhenomena && period.riskLevel.level === 1) {
            return null;
          }

          return (
            <Card key={index} className="bg-white">
              <CardContent className="p-4">
                {/* Time and Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-slate-500 min-w-0">
                    <span className="text-sm sm:text-base truncate">
                      {period.timeDescription}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {period.changeType === 'TEMPO' && (
                      <span className="text-xs sm:text-sm bg-slate-100 text-slate-800 px-2 py-1 rounded-full">
                        Temporary
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap ${
                      period.riskLevel.level === 3 
                        ? 'bg-red-100 text-red-800'
                        : period.riskLevel.level === 2 
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {period.riskLevel.title}
                    </span>
                  </div>
                </div>

                {/* Weather Phenomena Tags */}
                {hasWeatherPhenomena && (
                  <div className="flex flex-wrap gap-2">
                    {period.conditions.phenomena?.map((phenomenon, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 px-2 py-1 rounded-full text-xs sm:text-sm text-slate-600"
                      >
                        {phenomenon}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default HourlyForecast;