// src/app/api/weather/route.ts
import { NextResponse } from 'next/server';
import { getCacheOrFetch } from '@/lib/cache';
import type {
  TransformedMetarResponse,
  TransformedTafResponse,
  Cloud,
  ForecastLine
} from './types';
import { WEATHER_PHENOMENA_TRANSLATIONS } from '@/lib/types/weather';

export const runtime = 'edge';

const BASE_URL = 'https://api.checkwx.com';
const CHECKWX_API_KEY = process.env.NEXT_PUBLIC_CHECKWX_API_KEY;
const AIRPORT = 'EPKK';

async function fetchFromCheckWX<T>(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'X-API-Key': CHECKWX_API_KEY || '',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`CheckWX API responded with status ${response.status}`);
  }

  const data = await response.json() as T;
  return { data };
}

// Fix the any types
interface WeatherCondition {
  code: string;
  text?: string;
}

// Update the type definitions to match CheckWX API response
interface CheckWXMetarResponse {
  results: number;
  data: [{
    conditions: WeatherCondition[];
    icao: string;
    barometer: {
      hg: number;
      hpa: number;
      kpa: number;
      mb: number;
    };
    ceiling: {
      feet: number;
      meters: number;
    };
    clouds: Array<{
      base_feet_agl?: number;
      base_meters_agl?: number;
      code: string;
      text: string;
      feet?: number;
      meters?: number;
    }>;
    dewpoint: {
      celsius: number;
      fahrenheit: number;
    };
    temperature: {
      celsius: number;
      fahrenheit: number;
    };
    visibility: {
      miles: string;
      miles_float: number;
      meters: string;
      meters_float: number;
    };
    wind: {
      degrees: number;
      speed_kts: number;
      gust_kts?: number;
    };
    raw_text: string;
    observed: string;
  }];
}

interface CheckWXTafResponse {
  results: number;
  data: [{
    icao: string;
    raw_text: string;
    forecast: Array<{
      clouds: Array<{
        base_feet_agl?: number;
        base_meters_agl?: number;
        code: string;
        text: string;
        feet?: number;
        meters?: number;
      }>;
      conditions?: Array<{
        code: string;
        text: string;
      }>;
      timestamp: {
        from: string;
        to: string;
      };
      visibility?: {
        meters_float: number;
      };
      wind?: {
        degrees: number;
        speed_kts: number;
        gust_kts?: number;
      };
      change?: {
        indicator: {
          code: string;
          text: string;
          desc: string;
        };
      };
    }>;
  }];
}

function transformMetarData(checkwxData: CheckWXMetarResponse): TransformedMetarResponse | null {
  if (!checkwxData.data?.length) return null;
  
  const observation = checkwxData.data[0];
  const rawText = observation.raw_text;
  
  // Parse clouds with special handling for BKN000/OVC000, CB, TCU
  const clouds: Cloud[] = (observation.clouds || []).map(cloud => {
    let altitude = cloud.feet;
    let baseAgl = cloud.base_feet_agl;
    let cloudType: 'CB' | 'TCU' | undefined = undefined;
    
    // Extract CB (Cumulonimbus) or TCU (Towering Cumulus) from raw METAR
    // Patterns: FEW015CB, SCT020TCU, BKN025CB, etc.
    // If we have altitude, use it to match the specific cloud group, not just the first occurrence
    let cloudMatch: RegExpMatchArray | null = null;
    const hadAltitude = baseAgl !== undefined && baseAgl !== null;
    
    if (hadAltitude) {
      // We have altitude - match the specific cloud group
      const altitudeCode = Math.round(baseAgl! / 100).toString().padStart(3, '0');
      const cloudPattern = new RegExp(`\\b${cloud.code}${altitudeCode}(CB|TCU)?\\b`);
      cloudMatch = rawText.match(cloudPattern);
      // CB/TCU will be in capture group [1]
      
      if (cloudMatch && cloudMatch[1]) {
        cloudType = cloudMatch[1] as 'CB' | 'TCU';
        console.log(`⚠️ Detected ${cloudType} (${cloudType === 'CB' ? 'Cumulonimbus' : 'Towering Cumulus'}) at ${baseAgl}ft`);
      }
    } else {
      // No altitude available - try to extract it from raw text
      // Note: If multiple clouds with same code exist, this will match the first one
      // This is a limitation when CheckWX doesn't provide altitude data
      const cloudPattern = new RegExp(`\\b${cloud.code}(\\d{3})(CB|TCU)?\\b`);
      cloudMatch = rawText.match(cloudPattern);
      // Altitude will be in capture group [1], CB/TCU in capture group [2]
      
      if (cloudMatch) {
        if (cloudMatch[1]) {
          baseAgl = parseInt(cloudMatch[1], 10) * 100; // Convert to feet
          altitude = baseAgl;
          console.log(`⚠️ Extracted ${cloud.code}${cloudMatch[1]} from raw METAR: ${baseAgl}ft AGL`);
        }
        
        if (cloudMatch[2]) {
          cloudType = cloudMatch[2] as 'CB' | 'TCU';
          console.log(`⚠️ Detected ${cloudType} (${cloudType === 'CB' ? 'Cumulonimbus' : 'Towering Cumulus'}) at ${baseAgl}ft`);
        }
      }
    }
    
    // Also check cloud.text for CB/TCU keywords if not found in pattern
    if (!cloudType && cloud.text) {
      const textLower = cloud.text.toLowerCase();
      if (textLower.includes('cumulonimbus')) {
        cloudType = 'CB';
      } else if (textLower.includes('towering')) {
        cloudType = 'TCU';
      }
    }
    
    return {
      altitude: altitude || 0,
      symbol: cloud.code + (baseAgl !== undefined ? String(Math.floor(baseAgl / 100)).padStart(3, '0') : '000') + (cloudType || ''),
      type: cloud.code,
      base_feet_agl: baseAgl,
      cloudType: cloudType
    };
  });

  // Extract vertical visibility from raw METAR text if present
  // VV is followed by 3 digits representing hundreds of feet
  let verticalVisibility: { feet: number } | null = null;
  const vvMatch = rawText.match(/\bVV(\d{3})\b/);
  if (vvMatch && vvMatch[1]) {
    const vvFeet = parseInt(vvMatch[1], 10) * 100;
    verticalVisibility = { feet: vvFeet };
    console.log(`Extracted vertical visibility: ${vvFeet} feet from METAR: ${rawText}`);
  }

  // Extract visibility from raw METAR if CheckWX doesn't provide it
  // Format: "0050" = 50m, "9999" = 10km+
  let visibility = observation.visibility?.meters_float;
  if (visibility === undefined || visibility === null) {
    const visMatch = rawText.match(/\s(\d{4})\s/);
    if (visMatch && visMatch[1]) {
      visibility = parseInt(visMatch[1], 10);
      console.log(`⚠️ Extracted visibility from raw METAR: ${visibility}m (CheckWX didn't provide it)`);
    }
  }

  // Calculate ceiling from clouds (BKN or OVC)
  let ceiling: { feet: number } | null = null;
  if (observation.ceiling) {
    ceiling = { feet: observation.ceiling.feet };
  } else {
    // Fallback: calculate ceiling from our parsed clouds
    const ceilingClouds = clouds.filter(c => 
      (c.type === 'BKN' || c.type === 'OVC') && 
      c.base_feet_agl !== undefined
    );
    if (ceilingClouds.length > 0) {
      const lowestCeiling = Math.min(...ceilingClouds.map(c => c.base_feet_agl!));
      ceiling = { feet: lowestCeiling };
      console.log(`⚠️ Calculated ceiling from clouds: ${lowestCeiling}ft (CheckWX didn't provide ceiling)`);
    }
  }

  return {
    data: [{
      airport_code: observation.icao,
      clouds,
      conditions: observation.conditions?.map((c: WeatherCondition) => {
        // Handle intensity prefixes for weather phenomena
        const code = c.code;
        const hasIntensityPrefix = code.startsWith('+') || code.startsWith('-');
        const phenomenonCode = hasIntensityPrefix ? code : c.code;
        
        return {
          code: phenomenonCode,
          text: WEATHER_PHENOMENA_TRANSLATIONS.en[phenomenonCode as keyof typeof WEATHER_PHENOMENA_TRANSLATIONS.en] || phenomenonCode
        };
      }) || [],
      pressure: observation.barometer.mb,
      pressure_units: 'mb',
      raw_text: observation.raw_text,
      temp_air: observation.temperature.celsius,
      temp_dewpoint: observation.dewpoint.celsius,
      visibility: visibility || 0,
      visibility_units: 'meters',
      wind: {
        speed_kts: observation.wind?.speed_kts || 0,
        direction: observation.wind?.degrees || 0,
        gust_kts: observation.wind?.gust_kts || null
      },
      ceiling,
      vertical_visibility: verticalVisibility,
      observed: observation.observed
    }]
  };
}

/**
 * Extract visibility from raw TAF text for a specific period
 * TAF format: "TEMPO 3015/3017 3000 BR BKN002"
 *                           ^^^^ visibility in meters
 */
function extractVisibilityFromRawTaf(rawTaf: string, timestamp: { from: string, to: string } | null, changeType: string): number | null {
  if (!timestamp) return null;
  
  // Parse timestamps - CheckWX provides ISO strings WITHOUT 'Z', so JavaScript treats them as LOCAL time
  // We need to force UTC interpretation by adding 'Z' suffix
  const fromStr = timestamp.from.endsWith('Z') ? timestamp.from : timestamp.from + 'Z';
  const toStr = timestamp.to.endsWith('Z') ? timestamp.to : timestamp.to + 'Z';
  
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);
  
  // TAF uses UTC time in DDHH format
  const fromTaf = `${String(fromDate.getUTCDate()).padStart(2, '0')}${String(fromDate.getUTCHours()).padStart(2, '0')}`;
  const toTaf = `${String(toDate.getUTCDate()).padStart(2, '0')}${String(toDate.getUTCHours()).padStart(2, '0')}`;
  
  console.log(`🕐 Parsing: ${timestamp.from} → ${fromTaf}/${toTaf}`);
  
  // Build pattern to find this specific period in raw TAF
  // Note: CheckWX may modify end times, so we match by start time + change type
  // e.g., "TEMPO 3015/3017 3000" or "BECMG 3019/3021 0400"
  
  let regex;
  if (changeType === 'TEMPO') {
    // Match: (PROB\d+ )?TEMPO DDHH/DDHH VVVV
    // We match start time only since CheckWX may extend end times
    regex = new RegExp(`(?:PROB\\d+\\s+)?TEMPO\\s*${fromTaf}/\\d{4}\\s+(\\d{4})`, 'i');
  } else if (changeType === 'BECMG') {
    // Match: BECMG DDHH/DDHH VVVV
    regex = new RegExp(`BECMG\\s*${fromTaf}/\\d{4}\\s+(\\d{4})`, 'i');
  } else if (changeType === 'BASE') {
    // BASE pattern handled separately below
    regex = null;
  } else {
    // Other change types - try generic pattern
    regex = new RegExp(`${changeType}\\s*${fromTaf}/\\d{4}\\s+(\\d{4})`, 'i');
  }
  
  if (regex) {
    const match = rawTaf.match(regex);
    if (match && match[1]) {
      const visibility = parseInt(match[1], 10);
      console.log(`✅ Extracted visibility ${visibility}m for ${changeType} ${fromTaf}/xxxx`);
      return visibility;
    }
  }
  
  // If no match, try BASE period (first visibility value after wind)
  if (changeType === 'BASE') {
    // BASE format: "3015/0115 10004KT 6000 OVC005"
    //                         ^^^^^^^^^ wind
    //                                  ^^^^ visibility
    const baseMatch = rawTaf.match(/\d{4}\/\d{4}\s+(?:VRB|\d{3})\d{2}(?:G\d{2})?KT\s+(\d{4})/);
    if (baseMatch && baseMatch[1]) {
      const visibility = parseInt(baseMatch[1], 10);
      console.log(`✅ Extracted BASE visibility ${visibility}m`);
      return visibility;
    }
  }
  
  console.log(`⚠️ Could not extract visibility for ${changeType} ${fromTaf}/${toTaf}`);
  return null;
}

function transformTafData(checkwxData: CheckWXTafResponse): TransformedTafResponse | null {
  if (!checkwxData.data?.[0]?.forecast) return null;

  const rawTaf = checkwxData.data[0].raw_text;
  
  const forecast = checkwxData.data[0].forecast.map(period => {
    // Extract probability from indicator code or text
    let probability: number | undefined;
    if (period.change?.indicator) {
      const indicatorCode = period.change.indicator.code;
      const indicatorText = period.change.indicator.text || '';
      
      // Check for PROB in indicator code or text (e.g., "PROB40", "PROB30 TEMPO")
      const probMatch = (indicatorCode + ' ' + indicatorText).match(/PROB(\d{2})/);
      if (probMatch) {
        probability = parseInt(probMatch[1], 10);
      } else if (indicatorCode === 'TEMPO') {
        // Default TEMPO probability is 30% if not specified
        probability = 30;
      }
    }

    return {
      timestamp: period.timestamp ? {
        from: period.timestamp.from,
        to: period.timestamp.to
      } : null,
      change: period.change ? {
        indicator: {
          code: period.change.indicator.code,
          text: period.change.indicator.text,
          desc: period.change.indicator.desc,
          probability
        }
      } : undefined,
      conditions: period.conditions?.map(c => {
        // Handle intensity prefixes for weather phenomena
        const code = c.code;
        const hasIntensityPrefix = code.startsWith('+') || code.startsWith('-');
        const phenomenonCode = hasIntensityPrefix ? code : c.code;
        
        return {
          code: phenomenonCode,
          text: WEATHER_PHENOMENA_TRANSLATIONS.en[phenomenonCode as keyof typeof WEATHER_PHENOMENA_TRANSLATIONS.en] || phenomenonCode
        };
      }) || [],
      clouds: period.clouds?.map(c => {
        // Extract CB or TCU from raw TAF or cloud text
        let cloudType: 'CB' | 'TCU' | undefined = undefined;
        const altitude = c.base_feet_agl || c.feet;
        let extractedAltitude: number | undefined = undefined;
        
        // Try to find CB/TCU in raw TAF text for this specific cloud group
        // Use altitude to match the exact cloud, not just the first occurrence of the coverage code
        if (altitude !== undefined) {
          // We have altitude - match the specific cloud group
          // Convert feet to 3-digit TAF format (e.g., 2000 feet -> 020)
          const altitudeCode = Math.round(altitude / 100).toString().padStart(3, '0');
          const cloudPattern = new RegExp(`\\b${c.code}${altitudeCode}(CB|TCU)?\\b`);
          const cloudMatch = rawTaf.match(cloudPattern);
          if (cloudMatch && cloudMatch[1]) {
            cloudType = cloudMatch[1] as 'CB' | 'TCU';
          }
        } else {
          // No altitude available - try to extract it from raw TAF text
          // Note: If multiple clouds with same code exist in different periods, this will match the first one
          // This is a limitation when CheckWX doesn't provide altitude data, but it's better than missing CB/TCU
          const cloudPattern = new RegExp(`\\b${c.code}(\\d{3})(CB|TCU)?\\b`);
          const cloudMatch = rawTaf.match(cloudPattern);
          // Altitude will be in capture group [1], CB/TCU in capture group [2]
          
          if (cloudMatch) {
            if (cloudMatch[1]) {
              extractedAltitude = parseInt(cloudMatch[1], 10) * 100; // Convert to feet
              console.log(`⚠️ Extracted ${c.code}${cloudMatch[1]} from raw TAF: ${extractedAltitude}ft (CheckWX didn't provide altitude)`);
            }
            
            if (cloudMatch[2]) {
              cloudType = cloudMatch[2] as 'CB' | 'TCU';
              console.log(`⚠️ Detected ${cloudType} (${cloudType === 'CB' ? 'Cumulonimbus' : 'Towering Cumulus'}) in TAF`);
            }
          }
        }
        
        // Also check cloud.text for CB/TCU keywords if not found in pattern
        if (!cloudType && c.text) {
          const textLower = c.text.toLowerCase();
          if (textLower.includes('cumulonimbus')) {
            cloudType = 'CB';
          } else if (textLower.includes('towering')) {
            cloudType = 'TCU';
          }
        }
        
        return {
          code: c.code,
          base_feet_agl: c.base_feet_agl ?? extractedAltitude,
          feet: c.feet ?? extractedAltitude,
          cloudType: cloudType
        };
      }) || [],
      wind: period.wind ? {
        speed_kts: period.wind.speed_kts,
        direction: period.wind.degrees,
        gust_kts: period.wind.gust_kts
      } : null,
      visibility: (() => {
        // First try CheckWX parsed visibility
        if (period.visibility?.meters_float !== undefined) {
          console.log('✅ Using CheckWX visibility:', period.visibility.meters_float);
          return { meters: period.visibility.meters_float };
        }
        
        // If CheckWX didn't provide it, extract from raw TAF
        const changeType = period.change?.indicator?.code || 'BASE';
        console.log('🔍 CheckWX visibility missing, extracting from raw TAF for:', changeType, period.timestamp);
        const extractedVisibility = extractVisibilityFromRawTaf(rawTaf, period.timestamp, changeType);
        
        if (extractedVisibility !== null) {
          console.log('✅ Extracted visibility from raw TAF:', extractedVisibility);
          return { meters: extractedVisibility };
        } else {
          console.log('❌ Failed to extract visibility from raw TAF');
          return null;
        }
      })(),
      ceiling: period.clouds?.length ? (() => {
        // Only consider BKN (broken) and OVC (overcast) for ceiling
        const ceilingClouds = period.clouds.filter(cloud => 
          (cloud.code === 'BKN' || cloud.code === 'OVC') &&
          (cloud.base_feet_agl !== undefined || cloud.feet !== undefined)
        );
        return ceilingClouds.length > 0 ? {
          feet: Math.min(...ceilingClouds.map(cloud => cloud.base_feet_agl !== undefined ? cloud.base_feet_agl : (cloud.feet ?? 0)))
        } : null;
      })() : null
    };
  });

  return {
    data: [{
      airport_code: checkwxData.data[0].icao,
      forecast: forecast as ForecastLine[],
      raw_text: checkwxData.data[0].raw_text
    }]
  };
}

async function fetchWeatherData() {
  const [metarResponse, tafResponse] = await Promise.all([
    fetchFromCheckWX<CheckWXMetarResponse>(`/metar/${AIRPORT}/decoded`),
    fetchFromCheckWX<CheckWXTafResponse>(`/taf/${AIRPORT}/decoded`)
  ]);

  if (!metarResponse.data?.data?.length || !tafResponse.data?.data?.length) {
    throw new Error('Incomplete weather data received');
  }

  const transformedMetar = transformMetarData(metarResponse.data);
  const transformedTaf = transformTafData(tafResponse.data);

  if (!transformedMetar || !transformedTaf) {
    throw new Error('Failed to transform weather data');
  }

  return { 
    metar: transformedMetar, 
    taf: transformedTaf 
  };
}

export async function GET() {
  try {
    const { data, fromCache } = await getCacheOrFetch(
      `weather-${AIRPORT}`,
      fetchWeatherData
    );

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=180',
        ...(fromCache && { 'X-Served-From': 'cache' })
      }
    });

  } catch (error) {
    console.error('Weather API error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    });

    return NextResponse.json(
      { 
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}