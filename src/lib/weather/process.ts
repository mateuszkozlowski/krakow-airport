import { WeatherData, RiskAssessment } from '../types/weather';
import { translations } from '../translations';
import { postWeatherAlert, postAlertDismissal } from '../twitter';
import { assessWeatherRisk, calculateRiskLevel } from '../weather';

export async function processWeatherData(
  currentWeather: WeatherData,
  forecast: any[],
  language: 'en' | 'pl' = 'pl'
): Promise<any> {
  // Assess current weather risk
  const riskAssessment = assessWeatherRisk(currentWeather, language);

  // Post alert for current conditions if needed
  await postWeatherAlert(riskAssessment, language, false);

  // Check future periods for high risk conditions
  for (const period of forecast) {
    const periodRisk = calculateRiskLevel(period, language, translations[language].operationalWarnings);
    if (periodRisk.level >= 3) {
      await postWeatherAlert(periodRisk, language, true);
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