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
    riskLevel: ReturnType<typeof assessWeatherRisk>;
    conditions: WeatherData['conditions'];
  };
  forecast: ForecastChange[];
}> {
  // Assess current weather risk
  const riskAssessment = assessWeatherRisk(currentWeather, language);

  // Post alert for current conditions if needed
  await postWeatherAlert(riskAssessment, language, false);

  // Check future periods for high risk conditions
  for (const period of forecast) {
    // We already have the risk level in the ForecastChange object
    if (period.riskLevel.level >= 3) {
      await postWeatherAlert(period.riskLevel, language, true);
    }
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