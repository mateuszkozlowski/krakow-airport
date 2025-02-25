import { NextResponse } from 'next/server';
import type { TransformedMetarResponse } from '../types';
import { WEATHER_PHENOMENA_TRANSLATIONS } from '@/lib/types/weather';

export async function POST(request: Request) {
  try {
    const { metar } = await request.json();
    
    // Example test METAR data structure
    const testMetarData = {
      data: [{
        icao: 'EPKK',
        conditions: [
          { code: '-SHSN', text: 'Light Snow Showers' },
          { code: '+SHSN', text: 'Heavy Snow Showers' }
        ],
        barometer: {
          mb: 1013.25
        },
        temperature: {
          celsius: 0
        },
        dewpoint: {
          celsius: -2
        },
        visibility: {
          meters_float: 5000
        },
        wind: {
          degrees: 270,
          speed_kts: 10,
          gust_kts: 15
        },
        clouds: [
          {
            base_feet_agl: 2000,
            code: 'BKN',
            text: 'Broken',
            feet: 2000,
            meters: 610
          }
        ],
        raw_text: metar || 'EPKK 121200Z 27010G15KT 5000 -SHSN BKN020 00/M02 Q1013',
        observed: new Date().toISOString()
      }]
    };

    // Check for vertical visibility in the raw METAR text
    let verticalVisibility: { feet: number } | null = null;
    const rawText = testMetarData.data[0].raw_text;
    const vvMatch = rawText.match(/\bVV(\d{3})\b/);
    if (vvMatch && vvMatch[1]) {
      const vvFeet = parseInt(vvMatch[1], 10) * 100;
      verticalVisibility = { feet: vvFeet };
    }

    const transformedMetar: TransformedMetarResponse = {
      data: [{
        airport_code: testMetarData.data[0].icao,
        clouds: testMetarData.data[0].clouds.map(cloud => ({
          altitude: cloud.feet,
          symbol: cloud.code + String(cloud.base_feet_agl).padStart(3, '0'),
          type: cloud.code
        })),
        conditions: testMetarData.data[0].conditions.map(c => {
          const code = c.code;
          const hasIntensityPrefix = code.startsWith('+') || code.startsWith('-');
          const phenomenonCode = hasIntensityPrefix ? code : c.code;
          
          return {
            code: phenomenonCode,
            text: WEATHER_PHENOMENA_TRANSLATIONS.en[phenomenonCode as keyof typeof WEATHER_PHENOMENA_TRANSLATIONS.en] || phenomenonCode
          };
        }),
        pressure: testMetarData.data[0].barometer.mb,
        pressure_units: 'mb',
        raw_text: testMetarData.data[0].raw_text,
        temp_air: testMetarData.data[0].temperature.celsius,
        temp_dewpoint: testMetarData.data[0].dewpoint.celsius,
        visibility: testMetarData.data[0].visibility.meters_float,
        visibility_units: 'meters',
        wind: {
          speed_kts: testMetarData.data[0].wind.speed_kts,
          direction: testMetarData.data[0].wind.degrees,
          gust_kts: testMetarData.data[0].wind.gust_kts
        },
        ceiling: {
          feet: Math.min(...testMetarData.data[0].clouds.map(cloud => cloud.feet))
        },
        vertical_visibility: verticalVisibility,
        observed: testMetarData.data[0].observed
      }]
    };

    return NextResponse.json(transformedMetar);
  } catch (error) {
    console.error('Test Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to process test weather data' },
      { status: 500 }
    );
  }
} 