import React from "react";
import type { ForecastChange } from "@/lib/types/weather";

interface HourlyForecastProps {
  forecast: ForecastChange[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  const splitOverlappingPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    // First, sort periods by start time, then by risk level (higher first)
    const sortedPeriods = periods.sort((a, b) => {
      const timeCompare = a.from.getTime() - b.from.getTime();
      if (timeCompare === 0) {
        return b.riskLevel.level - a.riskLevel.level;
      }
      return timeCompare;
    });

    // Remove zero-duration periods and filter overlapping periods
    return sortedPeriods.filter((period, index) => {
      // Remove periods with zero duration
      if (period.from.getTime() === period.to.getTime()) return false;
      
      // Always keep the first valid period
      if (index === 0) return true;

      // Check for overlaps with previous periods
      const hasSignificantOverlap = sortedPeriods.slice(0, index).some(prevPeriod => {
        // Skip zero-duration periods
        if (prevPeriod.from.getTime() === prevPeriod.to.getTime()) return false;

        const overlap = period.from.getTime() < prevPeriod.to.getTime() &&
                       prevPeriod.from.getTime() < period.to.getTime();
        
        if (!overlap) return false;

        // Keep if this period has higher risk (reversed the comparison)
        if (period.riskLevel.level > prevPeriod.riskLevel.level) return false;
        
        // Keep if same risk but DIFFERENT phenomena (reversed the logic)
        if (period.riskLevel.level === prevPeriod.riskLevel.level) {
          const currentPhenomena = period.conditions.phenomena.sort().join(',');
          const prevPhenomena = prevPeriod.conditions.phenomena.sort().join(',');
          // Return false if phenomena are different (keep the period)
          return currentPhenomena === prevPhenomena;
        }

        // Remove if lower risk level
        return true;
      });

      return !hasSignificantOverlap;
    });
  };

  const splitPeriods = splitOverlappingPeriods(forecast);

  return (
    <div className="divide-y divide-gray-200">
      {splitPeriods.map((period, index) => {
        // Show if there are any phenomena or wind conditions
        if (period.conditions.phenomena.length === 0 && !period.wind && period.riskLevel.level === 1) {
          return null;
        }

        return (
          <div key={index} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-2 md:mb-0">
              <div className="text-sm font-medium text-gray-700">
                {period.timeDescription}
              </div>
              {period.isTemporary && (
                <span className="text-xs text-gray-500">
                  Temporary change{period.probability ? ` (${period.probability}% probability)` : ''}
                </span>
              )}
            </div>
            <div className="flex flex-wrap md:flex-nowrap items-center space-x-4 md:space-x-2">
              <div className="flex gap-2">
                {period.conditions.phenomena.map((phenomenon, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                  >
                    {phenomenon}
                  </span>
                ))}
              </div>
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
