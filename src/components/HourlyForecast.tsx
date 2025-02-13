import React from "react";
import type { ForecastChange } from "@/lib/types/weather";

interface HourlyForecastProps {
  forecast: ForecastChange[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ forecast }) => {
  const splitOverlappingPeriods = (periods: ForecastChange[]): ForecastChange[] => {
    // First, sort periods by start time, then by risk level (higher first)
    const sortedPeriods = periods
      .sort((a, b) => {
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

        // Always keep TEMPO periods - they should be shown alongside regular periods
        if (period.isTemporary) return false;

        // Remove if this period has lower or equal risk level compared to previous period
        if (period.riskLevel.level <= prevPeriod.riskLevel.level) {
          // For equal risk levels, check phenomena
          if (period.riskLevel.level === prevPeriod.riskLevel.level) {
            const currentPhenomena = period.conditions.phenomena.sort().join(',');
            const prevPhenomena = prevPeriod.conditions.phenomena.sort().join(',');
            // Keep only if phenomena are different
            return currentPhenomena === prevPhenomena;
          }
          return true; // Remove if lower risk
        }

        return false; // Keep if higher risk
      });

      return !hasSignificantOverlap;
    });
  };

  const splitPeriods = splitOverlappingPeriods(forecast);

  console.log('Periods after splitting:', splitPeriods.map(p => ({
    time: p.timeDescription,
    isTemporary: p.isTemporary,
    phenomena: p.conditions.phenomena,
    risk: p.riskLevel.level
  })));

  return (
    <div className="divide-y divide-gray-200">
      {splitPeriods.map((period, index) => {
        // Show all TEMPO periods regardless of conditions
        const shouldShow = period.isTemporary || 
          period.conditions.phenomena.length > 0 || 
          period.wind || 
          period.riskLevel.level > 1;

        console.log('Period visibility check:', {
          time: period.timeDescription,
          isTemporary: period.isTemporary,
          hasConditions: period.conditions.phenomena.length > 0,
          hasWind: !!period.wind,
          riskLevel: period.riskLevel.level,
          shouldShow
        });

        if (!shouldShow) return null;

        return (
          <div key={index} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-2 md:mb-0">
              <div className="text-sm font-medium text-gray-700">
                {period.timeDescription}
              </div>
              {period.isTemporary && (
                <span className="text-xs text-gray-500">
                  Temporary conditions possible{period.probability ? ` (${period.probability}% probability)` : ''}
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
