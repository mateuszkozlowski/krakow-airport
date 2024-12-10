// src/components/HourlyForecast.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { ForecastChange } from '@/types/weather';

interface HourlyForecastProps {
  forecast: ForecastChange[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  // Filter to only show next 24 hours of forecasts
  const next24Hours = forecast.filter(period => {
    const now = new Date();
    const periodStart = new Date(period.from);
    const tomorrow = new Date(now);
    tomorrow.setHours(now.getHours() + 24);
    return periodStart >= now && periodStart <= tomorrow;
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 text-white">Next 24 Hours Forecast</h2>
      <div className="space-y-3">
        {next24Hours.map((period, index) => {
          const hasWeatherPhenomena = period.conditions.phenomena?.length > 0;
          
          // Only show card if there are weather phenomena or risk level > 1
          if (!hasWeatherPhenomena && period.riskLevel.level === 1) {
            return null;
          }

          return (
            <Card key={index} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="h-4 w-4" />
                    <span>{period.timeDescription}</span>
                  </div>

                  {/* Status Tag */}
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    period.riskLevel.level === 3 
                      ? 'bg-red-100 text-red-800'
                      : period.riskLevel.level === 2 
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {period.riskLevel.level === 1 
                      ? 'No disruptions expected'
                      : period.riskLevel.title}
                  </span>
                </div>

                {/* Weather Phenomena Tags - only shown if there are phenomena */}
                {hasWeatherPhenomena && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {period.conditions.phenomena?.map((phenomenon, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 px-3 py-1 rounded-full text-sm text-slate-600"
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