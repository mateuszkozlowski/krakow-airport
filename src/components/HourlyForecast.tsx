import React from "react";
import type { ForecastChange } from "@/lib/types/weather";

interface HourlyForecastProps {
  forecast: ForecastChange[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  const splitOverlappingPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    const result: ForecastChange[] = [];
    
    // Find base periods (non-temporary) and temporary periods
    const basePeriods = periods.filter(p => !p.isTemporary);
    const tempPeriods = periods.filter(p => p.isTemporary);

    basePeriods.forEach(basePeriod => {
      // Find temporary periods that overlap with this base period
      const overlapping = tempPeriods.filter(temp => 
        temp.from.getTime() >= basePeriod.from.getTime() && 
        temp.to.getTime() <= basePeriod.to.getTime()
      ).sort((a, b) => a.from.getTime() - b.from.getTime());

      if (overlapping.length === 0) {
        // If no temporary periods overlap, add the base period as is
        result.push(basePeriod);
      } else {
        // Handle the period before the first temporary period
        if (overlapping[0].from.getTime() > basePeriod.from.getTime()) {
          result.push({
            ...basePeriod,
            from: basePeriod.from,
            to: overlapping[0].from,
            timeDescription: `${basePeriod.from.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Warsaw'
            })} - ${overlapping[0].from.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Warsaw'
            })}`
          });
        }

        // Add each temporary period
        overlapping.forEach((temp, index) => {
          result.push(temp);

          // Handle gaps between temporary periods
          const nextTemp = overlapping[index + 1];
          if (nextTemp) {
            result.push({
              ...basePeriod,
              from: temp.to,
              to: nextTemp.from,
              timeDescription: `${temp.to.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Warsaw'
              })} - ${nextTemp.from.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Warsaw'
              })}`
            });
          }
        });

        // Handle the period after the last temporary period
        const lastTemp = overlapping[overlapping.length - 1];
        if (lastTemp.to.getTime() < basePeriod.to.getTime()) {
          result.push({
            ...basePeriod,
            from: lastTemp.to,
            to: basePeriod.to,
            timeDescription: `${lastTemp.to.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Warsaw'
            })} - ${basePeriod.to.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Warsaw'
            })}`
          });
        }
      }
    });

    return result.sort((a, b) => a.from.getTime() - b.from.getTime());
  };

  const splitPeriods = splitOverlappingPeriods(forecast);

  return (
    <div className="divide-y divide-gray-200">
      {splitPeriods.map((period, index) => {
        const hasWeatherPhenomena = period.conditions.phenomena?.length > 0;

        if (!hasWeatherPhenomena && !period.wind && period.riskLevel.level === 1) {
          return null;
        }

        return (
          <div key={index} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-2 md:mb-0">
              <div className="text-sm font-medium text-gray-700">
                {period.timeDescription}
              </div>
              {period.isTemporary && (
                <span className="text-xs text-gray-500">Temporary change</span>
              )}
            </div>
            <div className="flex flex-wrap md:flex-nowrap items-center space-x-4 md:space-x-2">
              {hasWeatherPhenomena && (
                <div className="flex gap-2">
                  {period.conditions.phenomena.map((phenomenon, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                    >
                      {phenomenon}
                    </span>
                  ))}
                  {period.wind && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {period.wind.gust_kts && period.wind.gust_kts >= 35 ? "💨 Strong gusts" :
                       period.wind.gust_kts && period.wind.gust_kts >= 25 || period.wind.speed_kts >= 25 ? "💨 Strong winds" :
                       period.wind.speed_kts >= 15 ? "💨 Moderate winds" :
                       "💨 Light winds"}
                    </span>
                  )}
                </div>
              )}
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  period.riskLevel.level === 3
                    ? "bg-red-100 text-red-800"
                    : period.riskLevel.level === 2
                    ? "bg-orange-100 text-orange-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {period.riskLevel.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HourlyForecast;
