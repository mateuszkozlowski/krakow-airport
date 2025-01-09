'use client';
// src/app/page.tsx
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";  
import WeatherTimeline from "@/components/WeatherTimeline";
import type { WeatherResponse } from '@/lib/types/weather';
import { getAirportWeather } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { MainNav } from "@/components/MainNav"
import Link from "next/link";
import { Shield } from "lucide-react";
import { adjustToWarsawTime } from '@/lib/utils/time';
import { AlertTriangle, Plane } from "lucide-react";

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
        const periodStart = new Date(firstPeriod.from);
        const periodEnd = new Date(firstPeriod.to);
        const now = new Date();

        const getRiskReason = (period: typeof firstPeriod) => {
            // Helper to check if multiple conditions exist
            const conditions = period.conditions.phenomena;
            const hasCondition = (type: string) => conditions.some(p => p.includes(type));
            
            // Build a comprehensive reason with multiple conditions if they exist
            const reasons: string[] = [];
            
            // Check wind conditions (priority 1)
            if (hasCondition("Very Strong Wind Gusts")) {
                reasons.push("dangerous wind conditions");
            } else if (hasCondition("Strong Wind Gusts")) {
                reasons.push("strong winds");
            }
            
            // Check visibility (priority 2)
            if (hasCondition("Visibility Below Minimums")) {
                reasons.push("extremely poor visibility");
            } else if (hasCondition("Poor Visibility")) {
                reasons.push("reduced visibility");
            }
            
            // Check severe weather (priority 3)
            if (hasCondition("⛈️")) {
                reasons.push("thunderstorms");
            }
            
            // Check winter conditions (priority 4)
            const hasSnow = hasCondition("🌨️");
            const hasFreezing = hasCondition("❄️");
            if (hasSnow && hasFreezing) {
                reasons.push("snow and freezing conditions");
            } else if (hasSnow) {
                reasons.push("snow");
            } else if (hasFreezing) {
                reasons.push("freezing conditions");
            }

            // If no specific conditions found
            if (reasons.length === 0) {
                return "due to adverse weather conditions";
            }

            // Construct the message based on number of conditions
            let baseReason = "";
            if (reasons.length === 1) {
                baseReason = `due to ${reasons[0]}`;
            } else if (reasons.length === 2) {
                baseReason = `due to ${reasons[0]} and ${reasons[1]}`;
            } else {
                const lastReason = reasons.pop();
                baseReason = `due to ${reasons.join(", ")}, and ${lastReason}`;
            }

            // Add temporal context
            if (period.isTemporary) {
                const timeContext = period.probability 
                    ? `with a ${period.probability}% chance of occurring` 
                    : "that may occur";
                
                // Handle different time spans
                const duration = periodEnd.getTime() - periodStart.getTime();
                const hours = duration / (1000 * 60 * 60);
                
                if (hours <= 2) {
                    return `${baseReason} ${timeContext} during brief periods`;
                } else if (hours <= 4) {
                    return `${baseReason} ${timeContext} at times`;
                } else {
                    return `${baseReason} ${timeContext} intermittently`;
                }
            }

            return baseReason;
        };

        const formatTimeRange = () => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const warsawDate = new Date(periodStart.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
            const warsawToday = new Date(today.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
            const warsawTomorrow = new Date(tomorrow.toLocaleString('en-GB', { timeZone: 'Europe/Warsaw' }));
            
            // If period is happening now
            if (periodStart <= now && periodEnd > now) {
                const endTime = periodEnd.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Warsaw'
                });
                
                // If ends today
                if (periodEnd.getDate() === today.getDate()) {
                    return `until ${endTime} today`;
                }
                // If ends tomorrow
                if (periodEnd.getDate() === tomorrow.getDate()) {
                    return `until ${endTime} tomorrow`;
                }
                // If ends later
                return `until ${periodEnd.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Warsaw'
                })}`;
            }

            // For future periods
            const isSameDay = (d1: Date, d2: Date) => 
                d1.getDate() === d2.getDate() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getFullYear() === d2.getFullYear();
            
            const timeFormat = {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Warsaw'
            } as const;

            const startTime = periodStart.toLocaleTimeString('en-GB', timeFormat);
            const endTime = periodEnd.toLocaleTimeString('en-GB', timeFormat);

            if (isSameDay(warsawDate, warsawToday)) {
                return `today between ${startTime} and ${endTime}`;
            }
            if (isSameDay(warsawDate, warsawTomorrow)) {
                return `tomorrow between ${startTime} and ${endTime}`;
            }
            
            return `on ${periodStart.toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                timeZone: 'Europe/Warsaw'
            })} between ${startTime} and ${endTime}`;
        };

        return `${formatTimeRange()} ${getRiskReason(firstPeriod)}`;
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
                                {adjustToWarsawTime(new Date(weather.current.observed)).toLocaleTimeString("en-GB", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    timeZone: "Europe/Warsaw"
                                })}
                            </p>
                        )}
                    </div>
                </Alert>

                {highRiskPeriods.length > 0 && highRiskPeriods.some(period => period.riskLevel.level >= 3) && (
                    <Alert className={cn(
                        "rounded-none border-0 backdrop-blur py-4",
                        highRiskPeriods.some(p => p.riskLevel.level === 4) 
                            ? "bg-red-950/95"
                            : "bg-red-900/95"
                    )}>
                        <div className="max-w-4xl mx-auto w-full">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left side - Main message */}
                                <div className="flex-1 space-y-1">
                                    {/* Title with icon */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="h-5 w-5 text-white" />
                                        <h3 className="font-semibold text-white">
                                            {highRiskPeriods.some(p => p.riskLevel.level === 4)
                                                ? "Important Flight Information"
                                                : "Weather Advisory"}
                                        </h3>
                                    </div>
                                    
                                    {/* Main message with better typography */}
                                    <p className="text-sm leading-relaxed text-white">
                                        {highRiskPeriods.some(p => p.riskLevel.level === 4)
                                            ? "Significant flight disruptions are expected "
                                            : "Severe weather conditions are expected "}
                                        {formatHighRiskTimes()}
                                        {highRiskPeriods.filter(p => p.riskLevel.level >= 3).length > 1 
                                            && ". Temporary severe weather conditions could also happen later in the day"}
                                        {". Please check your flight status"}
                                        {!highRiskPeriods.some(p => p.riskLevel.level === 4) 
                                            ? " with your airline for any changes"
                                            : " directly with your airline for the latest updates"}.
                                    </p>
                                </div>

                                {/* Right side - Actions */}
                                <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-center md:justify-start md:min-w-[200px] md:border-l md:border-white/20 md:pl-6">
                                    {/* Flight Status Button */}
                                    <a 
                                        href="https://www.krakowairport.pl/en/passenger/flight-information/departures"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium 
                                            bg-white/20 hover:bg-white/30 text-white transition-colors rounded-md px-4 py-2
                                            focus:outline-none focus:ring-2 focus:ring-white/50"
                                    >
                                        <Plane className="h-4 w-4" />
                                        Check Flight Status
                                    </a>
                                    
                                    {/* Passenger Rights Button */}
                                    <Link 
                                        href="/passengerrights"
                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium 
                                            bg-white hover:bg-white/90 text-red-900 transition-colors rounded-md px-4 py-2
                                            focus:outline-none focus:ring-2 focus:ring-white/50"
                                    >
                                        <Shield className="h-4 w-4" />
                                        Know Your Rights
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </Alert>
                )}

                <div className="max-w-4xl mx-auto px-6 pb-36">
                    <h1 className="text-2xl md:text-4xl font-bold mt-24 mb-2 md:mb-4 text-white">
                        Will I fly today from Krakow?
                    </h1>

                    {weather?.current && (
                        <>
                            <p className="text-xl md:text-3xl mb-8 text-white/80">
                                {weather.current.riskLevel.level === 4
                                    ? "Airport operations may be suspended. Check your flight status."
                                    : weather.current.riskLevel.level === 3
                                        ? "Significant disruptions are likely. Check your flight status."
                                        : weather.current.riskLevel.level === 2
                                            ? "Minor delays are possible. Check flight status before leaving."
                                            : "Weather conditions are favorable for normal operations."}
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
                    <Alert className="mb-6 mt-4 bg-white/10 backdrop-blur text-white flex flex-col md:flex-row md:items-center md:justify-between border-white/10 gap-4 md:gap-3">
                        <div className="flex items-center gap-3">
                            <Shield className="w-12 h-12 md:w-6 md:h-6" />
                            <AlertDescription>
                                Even in case of severe weather, you have the right to be informed about your flight status and to be compensated for any delays or cancellations.
                            </AlertDescription>
                        </div>
                        <Link 
                            href="/passengerrights" 
                            className="w-full md:w-auto inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-slate-900 hover:bg-white/90 h-7 rounded-md px-2 md:ml-4"
                        >
                            Know Your Rights
                        </Link>
                    </Alert>
                </div>
            </div>


            <footer className="border-t border-slate-00 py-4">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-900"> <p>
                        This application is not an official Krakow Airport service. It is intended for informational purposes only and should not be used as the sole source for flight planning or decision-making. Always check with official sources and your airline for the most accurate and up-to-date information.
                    </p></div>
                <div className="max-w-4xl mx-auto border-t border-slate-200 my-4"></div>
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