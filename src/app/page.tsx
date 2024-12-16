'use client';
// src/app/page.tsx
import { useEffect, useState } from 'react';
import { Alert } from "@/components/ui/alert";
import { FlightTabs } from "@/components/FlightTabs";
import WeatherTimeline from "@/components/WeatherTimeline";
import { Loader2 } from "lucide-react";
import type { WeatherResponse } from '@/lib/types/weather';
import type { FlightStats } from '@/lib/types/flight';
import { getAirportWeather } from "@/lib/weather";
import { getFlightStats } from "@/lib/flights";

export default function Page() {
    const [weather, setWeather] = useState<WeatherResponse | null>(null);
    const [flightStats, setFlightStats] = useState<{
        arrivals: FlightStats;
        departures: FlightStats;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchData(isRetry = false) {
        try {
            if (!isRetry) {
                setIsLoading(true);
            }
            setError(null);

            const [weatherData, flightData] = await Promise.all([
                getAirportWeather(),
                getFlightStats()
            ]);

            if (!weatherData || !flightData) {
                throw new Error('Failed to fetch data');
            }

            setWeather(weatherData);
            setFlightStats(flightData);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        // Set up polling every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#1a1f36] flex items-center justify-center">
                <div className="text-white flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="bg-[#1a1f36]">
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                    <div className="max-w-4xl mx-auto w-full flex-wrap md:flex justify-between items-center">
                        <p className="text-sm">
                            This is not an official Kraków Airport page. For official information, visit{" "}
                            <a href="https://krakowairport.pl" className="underline">
                                krakowairport.pl
                            </a>
                        </p>
                        {weather?.current && (
                            <p className="text-sm text-white/60">
                                Last update:{" "}
                                {new Date(weather.current.observed).toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "Europe/Warsaw"
                                })}
                            </p>
                        )}
                    </div>
                </Alert>

                <div className="max-w-4xl mx-auto px-6 pb-36">
                    <h1 className="text-4xl font-bold mt-24 mb-4 text-white">Will I fly today from Krakow?</h1>

                    {weather?.current && (
                        <>
                            <p className="text-2xl mb-8 text-white/80">
                                {weather.current.riskLevel.level === 3
                                    ? "It does not look promising. Your flight might be canceled or seriously delayed."
                                    : weather.current.riskLevel.level === 2
                                      ? "There is a chance, but be ready for possible delays."
                                      : "Yes, it looks like you are good to go!"}
                            </p>

                            <WeatherTimeline 
                                current={weather.current}
                                forecast={weather.forecast}
                                isLoading={isLoading}
                                isError={!!error}
                                retry={fetchData}
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto -mt-16 px-6 pb-8">
                {flightStats && (
                    <FlightTabs
                        arrivalsStats={flightStats.arrivals}
                        departuresStats={flightStats.departures}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto px-6">
                <div className="border border-slate-700/10 rounded-lg p-6">
                    <h3 className="font-semibold mb-2 text-slate-900">How we get our data?</h3>
                    <p className="text-slate mb-4 text-sm">We combine data from three reliable sources:</p>
                    <ul className="text-slate space-y-2 text-sm">
                        <li>• Official METAR reports (the stuff pilots actually use)</li>
                        <li>• TAF forecasts (fancy airport weather predictions)</li>
                        <li>• Flight status information provided by airlines</li>
                    </ul>
                </div>

                <div className="border border-slate-700/10 rounded-lg p-6">
                    <h3 className="font-semibold mb-2 text-slate-900">Important notice</h3>
                    <p className="text-slate-900 mb-4 text-sm">
                        While we try our best to provide accurate information, we are not meteorologists, air
                        traffic controllers, or fortune tellers.
                    </p>
                    <p className="text-slate-900 text-sm">
                        Always check with your airline for the final word on your flight status. They are the ones
                        with the actual planes, after all!
                    </p>
                </div>
            </div>

            <footer className="border-t border-slate-00 py-4">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-900">
                    <div>Built by Mateusz Kozłowski</div>
                    <div className="flex gap-4">
                        <a href="/changelog" className="hover:text-slate-600">
                            Changelog
                        </a>
                        <a href="mailto:mateusz.kozlowski@gmail.com" className="hover:text-slate-600">
                            Email
                        </a>
                        <a href="https://mateuszkozlowski.xyz/" className="hover:text-slate-600">
                            WWW
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}