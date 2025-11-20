import { WeatherData, ForecastChange } from '../types/weather';
import { translations } from '../translations';
import { postWeatherAlert, postAlertDismissal } from '../twitter';
import { assessWeatherRisk } from '../weather';

export async function processWeatherData(
  currentWeather: WeatherData,
  forecast: ForecastChange[],
  language: 'en' | 'pl' = 'pl'
): Promise<{
  current: {
    riskLevel: Awaited<ReturnType<typeof assessWeatherRisk>>;
    conditions: WeatherData['conditions'];
  };
  forecast: ForecastChange[];
}> {
  // Assess current weather risk
  const riskAssessment = await assessWeatherRisk(currentWeather, language);

  // Post alert for current conditions if needed
  await postWeatherAlert(riskAssessment, language, [{
    start: new Date().toISOString(),
    end: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Current conditions valid for 30 minutes
    level: riskAssessment.level
  }]);

  // Check future periods for high risk conditions
  const highRiskPeriods = forecast
    .filter(period => period.riskLevel.level >= 3)
    .map(period => ({
      start: period.from.toISOString(),
      end: period.to.toISOString(),
      level: period.riskLevel.level
    }));

  if (highRiskPeriods.length > 0) {
    await postWeatherAlert(forecast[0].riskLevel, language, highRiskPeriods);
  }

  // Check if conditions improved
  if (riskAssessment.level < 3) {
    await postAlertDismissal(language);
  }

  // Return the processed data
  return {
    current: {
      riskLevel: riskAssessment,
      conditions: currentWeather.conditions || []
    },
    forecast
  };
} 