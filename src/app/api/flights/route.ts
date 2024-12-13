// src/app/api/weather/route.ts
import { getAirportWeather } from '@/lib/weather';
import { NextResponse } from 'next/server';

export const fetchCache = 'force-no-store';

export async function GET() {
    try {
        const weather = await getAirportWeather();
        return NextResponse.json(weather);
    } catch (error) {
        console.error('Weather API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
