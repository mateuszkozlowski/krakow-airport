import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { fetchFromCheckWX } from '../src/app/api/weather/route';
import type { CheckWXMetarResponse, CheckWXTafResponse } from '../src/app/api/weather/route';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const AIRPORT = 'EPKK';

interface WeatherCondition {
  code: string;
  text?: string;
}

interface WeatherRecord {
  timestamp: string;
  // Current conditions
  temperature: number;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  visibility: number;
  phenomena: string;
  raw_metar: string;
  // Forecast periods
  forecastPeriods: string; // JSON stringified array of periods
  raw_taf: string;
}

async function getGoogleAuth() {
  const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

async function appendToSheet(auth: JWT, values: any[][]) {
  const sheets = google.sheets({ version: 'v4', auth });
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Weather Data!A:K', // Adjust range as needed
    valueInputOption: 'RAW',
    requestBody: {
      values,
    },
  });
}

export async function logWeatherData() {
  try {
    // Fetch weather data
    const [metarResponse, tafResponse] = await Promise.all([
      fetchFromCheckWX<CheckWXMetarResponse>(`/metar/${AIRPORT}/decoded`),
      fetchFromCheckWX<CheckWXTafResponse>(`/taf/${AIRPORT}/decoded`)
    ]);

    const metar = metarResponse.data.data[0];
    const taf = tafResponse.data.data[0];

    const record: WeatherRecord = {
      timestamp: new Date().toISOString(),
      temperature: metar.temperature.celsius,
      windSpeed: metar.wind.speed_kts,
      windDirection: metar.wind.degrees,
      windGust: metar.wind.gust_kts || undefined,
      visibility: metar.visibility.meters_float,
      phenomena: metar.conditions?.map((c: WeatherCondition) => c.code).join(',') || '',
      raw_metar: metar.raw_text,
      forecastPeriods: JSON.stringify(taf.forecast),
      raw_taf: taf.raw_text,
    };

    const auth = await getGoogleAuth();
    await appendToSheet(auth, [[
      record.timestamp,
      record.temperature,
      record.windSpeed,
      record.windDirection,
      record.windGust || '',
      record.visibility,
      record.phenomena,
      record.raw_metar,
      record.forecastPeriods,
      record.raw_taf,
    ]]);

    return { success: true };
  } catch (error) {
    console.error('Error logging weather data:', error);
    throw error;
  }
}

// Only run directly if this is the main module
if (require.main === module) {
  logWeatherData()
    .then(() => console.log('Weather data logged successfully'))
    .catch(error => {
      console.error('Failed to log weather data:', error);
      process.exit(1);
    });
} 