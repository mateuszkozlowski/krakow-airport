import React from "react";
import type { ForecastChange } from "@/lib/types/weather";

interface HourlyForecastProps {
  forecast: ForecastChange[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  return (
        <div className="divide-y divide-gray-200">
          {forecast.map((period, index) => {
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
                  {period.changeType === "TEMPO" && (
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
