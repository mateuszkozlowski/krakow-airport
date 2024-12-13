// src/app/api/flights/route.ts
import { getFlightStats } from '@/lib/flights';
import { NextResponse } from 'next/server';

export const fetchCache = 'force-no-store';

export async function GET() {
    try {
        const flightStats = await getFlightStats();
        return NextResponse.json(flightStats);
    } catch (error) {
        console.error('Flights API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch flight data' },
            { status: 500 }
        );
    }
}