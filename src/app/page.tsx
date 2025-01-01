'use client';
// src/app/page.tsx
import { useEffect, useState } from 'react';
import { Alert } from "@/components/ui/alert";  
import WeatherTimeline from "@/components/WeatherTimeline";
import type { WeatherResponse } from '@/lib/types/weather';
import { getAirportWeather } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { MainNav } from "@/components/MainNav"

export default function Page() {
    const [weather, setWeather] = useState<WeatherResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchData(isRetry = false) {
        try {
            if (!isRetry) {
                setIsLoading(true);
            }
            setError(null);

            const [weatherData] = await Promise.all([
                getAirportWeather(),
            ]);

            if (!weatherData) {
                throw new Error('Failed to fetch data');
            }

            setWeather(weatherData);
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

    function LoadingSkeleton() {
        return (
            <div className="min-h-screen">
                <div className="bg-[#1a1f36] bg-cover bg-center" style={{ backgroundImage: "url('/background.png')" }}>
                    <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                        <div className="max-w-4xl mx-auto w-full flex-wrap md:flex justify-between items-center">
                            <div className="h-4 w-96 bg-white/20 animate-pulse rounded" />
                            <div className="h-4 w-32 bg-white/20 animate-pulse rounded mt-2 md:mt-0" />
                        </div>
                    </Alert>

                    <div className="max-w-4xl mx-auto px-6 pb-36">
                        <h1 className="text-2xl md:text-4xl font-bold mt-24 mb-2 md:mb-4 text-white">
                            Will I fly today from Krakow?
                        </h1>

                        <div className="h-8 w-2/3 bg-white/20 animate-pulse rounded mb-8" />

                        {/* Weather Timeline Skeleton */}
                        <div className="space-y-4">
                            {/* Current Weather Card Skeleton */}
                            <div className="bg-white/10 backdrop-blur p-6 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="h-6 w-32 bg-white/20 animate-pulse rounded" />
                                        <div className="h-4 w-48 bg-white/20 animate-pulse rounded" />
                                    </div>
                                    <div className="h-10 w-10 bg-white/20 animate-pulse rounded-full" />
                                </div>
                            </div>

                            {/* Forecast Cards Skeleton */}
                            {[1, 2, 3].map((i) => (
                                <div 
                                    key={i} 
                                    className={cn(
                                        "bg-white/5 backdrop-blur p-6 rounded-lg",
                                        "animate-pulse"
                                    )}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-2">
                                            <div className="h-5 w-24 bg-white/20 rounded" />
                                            <div className="h-4 w-36 bg-white/20 rounded" />
                                        </div>
                                        <div className="h-8 w-8 bg-white/20 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Info Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto px-6 mt-16">
                    {[1, 2].map((i) => (
                        <div key={i} className="border border-slate-700/10 rounded-lg p-6">
                            <div className="h-5 w-32 bg-slate-200 animate-pulse rounded mb-4" />
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-slate-200 animate-pulse rounded" />
                                <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded" />
                                <div className="h-4 w-5/6 bg-slate-200 animate-pulse rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="border-t border-slate-200 py-4">
                    <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
                        <div className="h-4 w-40 bg-slate-200 animate-pulse rounded" />
                        <div className="flex gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-4 w-16 bg-slate-200 animate-pulse rounded" />
                            ))}
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    const highRiskPeriods = weather?.forecast?.filter(
        period => period.riskLevel.level >= 3
    ) || [];

    const formatHighRiskTimes = () => {
        if (!highRiskPeriods.length) return '';
        
        const firstPeriod = highRiskPeriods[0];
        const startTime = new Date(firstPeriod.from).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Warsaw'
        });
        const endTime = new Date(firstPeriod.to).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Warsaw'
        });

        return `between ${startTime} and ${endTime}`;
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="min-h-screen">
            <div className="bg-[#1a1f36] bg-cover bg-center" style={{ backgroundImage: "url('/background.png')" }}>
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                    <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <MainNav />
                        </div>
                        {weather?.current && (
                            <p className="text-sm text-white/60">
                                Last update:{" "}
                                {new Date(new Date(weather.current.observed).getTime() + 3600000).toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "Europe/Warsaw"
                                })}
                            </p>
                        )}
                    </div>
                </Alert>

                {/* Add disclaimer in a new subtle footer */}

                {highRiskPeriods.length > 0 && (
                    <Alert className="rounded-none border-0 bg-red-800 backdrop-blur text-white">
                        <div className="max-w-4xl mx-auto w-full">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <p className="text-sm font-medium">
                                    ⚠️ Severe weather conditions expected {formatHighRiskTimes()}. 
                                    {highRiskPeriods.length > 1 && " Additional severe weather periods possible later."}
                                    {" "}Check your flight status with your airline.
                                </p>
                                <a 
                                    href="/passengerrights" 
                                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-red-600 hover:bg-white/90 h-7 rounded-md px-2"
                                >
                                    Know Your Rights
                                </a>
                            </div>
                        </div>
                    </Alert>
                )}

                <div className="max-w-4xl mx-auto px-6 pb-36">
                    <h1 className="text-2xl md:text-4xl font-bold mt-24 mb-2 md:mb-4 text-white">Will I fly today from Krakow?</h1>

                    {weather?.current && (
                        <>
                            <p className="text-xl md:text-3xl mb-8 text-white/80">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto px-6 mt-16">
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