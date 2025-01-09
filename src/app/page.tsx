'use client';

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
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Suspense } from 'react';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-[#1a1f36] bg-cover bg-center" style={{ backgroundImage: "url('/background.png')" }}>
        {/* Navbar Skeleton */}
        <div className="rounded-none border-0 bg-white/10 backdrop-blur text-white p-4">
          <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
            <div className="h-8 bg-gray-200/20 rounded w-32"></div>
            <div className="h-8 bg-gray-200/20 rounded w-20"></div>
          </div>
        </div>

        {/* Alert Skeleton */}
        <div className="bg-red-900/95 backdrop-blur py-4">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-white/20 rounded w-1/3"></div>
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
                <div className="h-4 bg-white/20 rounded w-1/2"></div>
              </div>
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:min-w-[200px] md:border-l md:border-white/20 md:pl-6">
                <div className="h-10 bg-white/20 rounded w-full"></div>
                <div className="h-10 bg-white/90 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="max-w-4xl mx-auto px-6 pb-36">
          {/* Title */}
          <div className="mt-24 mb-8">
            <div className="h-10 bg-white/20 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-white/20 rounded w-1/2"></div>
          </div>

          {/* Weather Timeline Skeleton */}
          <div className="space-y-6">
            {/* Current Weather */}
            <div className="bg-white/5 backdrop-blur rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-6 bg-white/20 rounded w-32"></div>
                  <div className="h-4 bg-white/20 rounded w-48"></div>
                </div>
                <div className="h-8 bg-white/20 rounded w-24"></div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 bg-white/20 rounded w-24"></div>
                <div className="h-6 bg-white/20 rounded w-24"></div>
              </div>
            </div>

            {/* Forecast Periods */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-lg p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2">
                    <div className="h-5 bg-white/20 rounded w-40"></div>
                    <div className="h-4 bg-white/20 rounded w-24"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 bg-white/20 rounded w-20"></div>
                    <div className="h-6 bg-white/20 rounded w-24"></div>
                    <div className="h-6 bg-white/20 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <footer className="border-t border-slate-200 py-4">
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-4 bg-gray-100 rounded w-3/4 mb-4"></div>
          <div className="border-t border-slate-200 my-4"></div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-100 rounded w-32"></div>
            <div className="flex gap-4">
              <div className="h-4 bg-gray-100 rounded w-20"></div>
              <div className="h-4 bg-gray-100 rounded w-20"></div>
              <div className="h-4 bg-gray-100 rounded w-20"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  const { language } = useLanguage();
  const t = translations[language];
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData(isRetry = false) {
    try {
      if (!isRetry) {
        setIsLoading(true);
      }
      setError(null);

      const weatherData = await getAirportWeather(language);

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
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [language]);

  const highRiskPeriods = weather?.forecast?.filter(
    period => period.riskLevel.level >= 3
  ) || [];

  const formatHighRiskTimes = () => {
    if (!highRiskPeriods.length) return '';
    
    const firstPeriod = highRiskPeriods[0];
    const periodStart = new Date(firstPeriod.from);
    const periodEnd = new Date(firstPeriod.to);
    const now = new Date();

    const getRiskReason = (period: typeof firstPeriod, language: 'en' | 'pl') => {
      const t = translations[language].banner;
      const weatherMessages = translations[language].weatherConditionMessages;
      
      // Helper to check if multiple conditions exist
      const conditions = period.conditions.phenomena;
      
      // Build a comprehensive reason with multiple conditions if they exist
      let reasons: string[] = [];
      
      // Sprawdzamy każdy warunek pogodowy i dodajemy tylko te, które faktycznie występują
      for (const phenomenon of conditions) {
        // Sprawdzamy warunki wiatrowe
        if (phenomenon.includes(weatherMessages.veryStrongWindGusts)) {
          reasons.push(language === 'pl' ? "niebezpiecznych warunków wiatrowych" : "dangerous wind conditions");
        } else if (phenomenon.includes(weatherMessages.strongWindGusts)) {
          reasons.push(language === 'pl' ? "silnego wiatru" : "strong winds");
        }
        
        // Sprawdzamy widoczność
        if (phenomenon.includes(weatherMessages.visibilityBelowMinimums)) {
          reasons.push(language === 'pl' ? "bardzo słabej widoczności" : "extremely poor visibility");
        } else if (phenomenon.includes(weatherMessages.poorVisibility)) {
          reasons.push(language === 'pl' ? "ograniczonej widoczności" : "reduced visibility");
        }
        
        // Sprawdzamy burze
        if (phenomenon.includes("⛈️")) {
          reasons.push(language === 'pl' ? "burz" : "thunderstorms");
        }
        
        // Sprawdzamy śnieg i warunki marznące
        if (phenomenon.includes("🌨️")) {
          reasons.push(language === 'pl' ? "opadów śniegu" : "snow");
        }
        if (phenomenon.includes("❄️")) {
          reasons.push(language === 'pl' ? "warunków marznących" : "freezing conditions");
        }
      }

      // Usuwamy duplikaty
      reasons = [...new Set(reasons)];

      // If no specific conditions found
      if (reasons.length === 0) {
        return language === 'pl' 
          ? "z powodu trudnych warunków pogodowych"
          : "due to adverse weather conditions";
      }

      // Construct the message based on number of conditions
      let baseReason = "";
      if (reasons.length === 1) {
        baseReason = language === 'pl' 
          ? `z powodu ${reasons[0]}`
          : `due to ${reasons[0]}`;
      } else if (reasons.length === 2) {
        baseReason = language === 'pl'
          ? `z powodu ${reasons[0]} i ${reasons[1]}`
          : `due to ${reasons[0]} and ${reasons[1]}`;
      } else {
        const lastReason = reasons.pop();
        baseReason = language === 'pl'
          ? `z powodu ${reasons.join(", ")} i ${lastReason}`
          : `due to ${reasons.join(", ")}, and ${lastReason}`;
      }

      // Add temporal context
      if (period.isTemporary) {
        const timeContext = period.probability 
          ? (language === 'pl' 
              ? `z ${period.probability}% prawdopodobieństwem wystąpienia`
              : `with a ${period.probability}% chance of occurring`)
          : (language === 'pl' ? "które mogą wystąpić" : "that may occur");
        
        // Handle different time spans
        const duration = periodEnd.getTime() - periodStart.getTime();
        const hours = duration / (1000 * 60 * 60);
        
        if (hours <= 2) {
          return language === 'pl'
            ? `${baseReason} ${timeContext} w krótkich okresach`
            : `${baseReason} ${timeContext} during brief periods`;
        } else if (hours <= 4) {
          return language === 'pl'
            ? `${baseReason} ${timeContext} okresowo`
            : `${baseReason} ${timeContext} at times`;
        } else {
          return language === 'pl'
            ? `${baseReason} ${timeContext} z przerwami`
            : `${baseReason} ${timeContext} intermittently`;
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
          return language === 'pl' 
            ? `do ${endTime} dzisiaj`
            : `until ${endTime} today`;
        }
        // If ends tomorrow
        if (periodEnd.getDate() === tomorrow.getDate()) {
          return language === 'pl'
            ? `do ${endTime} jutro`
            : `until ${endTime} tomorrow`;
        }
        // If ends later
        return language === 'pl'
          ? `do ${periodEnd.toLocaleDateString('pl-PL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Warsaw'
            })}`
          : `until ${periodEnd.toLocaleDateString('en-GB', {
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
        return language === 'pl'
          ? `dzisiaj w godzinach ${startTime} do ${endTime}`
          : `today between ${startTime} and ${endTime}`;
      }
      if (isSameDay(warsawDate, warsawTomorrow)) {
        return language === 'pl'
          ? `jutro w godzinach ${startTime} do ${endTime}`
          : `tomorrow between ${startTime} and ${endTime}`;
      }
      
      return language === 'pl'
        ? `w ${periodStart.toLocaleDateString('pl-PL', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: 'Europe/Warsaw'
          })} w godzinach ${startTime} do ${endTime}`
        : `on ${periodStart.toLocaleDateString('en-GB', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: 'Europe/Warsaw'
          })} between ${startTime} and ${endTime}`;
    };

    return `${formatTimeRange()} ${getRiskReason(firstPeriod, language)}`;
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
            <LanguageSelector />
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
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-white" />
                    <h3 className="font-semibold text-white">
                      {highRiskPeriods.some(p => p.riskLevel.level === 4)
                        ? t.importantFlightInfo
                        : t.weatherAdvisory}
                    </h3>
                  </div>
                  
                  <p className="text-sm leading-relaxed text-white">
                    {highRiskPeriods.some(p => p.riskLevel.level === 4)
                      ? t.flightDisruptions
                      : t.severeWeather}
                    {formatHighRiskTimes()}
                    {highRiskPeriods.filter(p => p.riskLevel.level >= 3).length > 1 
                      && `. ${t.laterInDay}`}
                    {`. ${t.checkStatus}`}
                    {!highRiskPeriods.some(p => p.riskLevel.level === 4) 
                      ? ` ${t.withAirline}`
                      : ` ${t.directlyWithAirline}`}.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-center md:justify-start md:min-w-[200px] md:border-l md:border-white/20 md:pl-6">
                  <a 
                    href="https://www.krakowairport.pl/en/passenger/flight-information/departures"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium 
                      bg-white/20 hover:bg-white/30 text-white transition-colors rounded-md px-4 py-2
                      focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <Plane className="h-4 w-4" />
                    {t.checkFlightStatus}
                  </a>
                  
                  <Link 
                    href="/passengerrights"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium 
                      bg-white hover:bg-white/90 text-red-900 transition-colors rounded-md px-4 py-2
                      focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <Shield className="h-4 w-4" />
                    {t.knowYourRights}
                  </Link>
                </div>
              </div>
            </div>
          </Alert>
        )}

        <div className="max-w-4xl mx-auto px-6 pb-36">
          <h1 className="text-2xl md:text-4xl font-bold mt-24 mb-2 md:mb-4 text-white">
            {t.title}
          </h1>

          {weather?.current && (
            <>
              <p className="text-xl md:text-3xl mb-8 text-white/80">
                {weather.current.riskLevel.level === 4
                  ? t.statusSuspended
                  : weather.current.riskLevel.level === 3
                    ? t.statusMajorDisruption
                    : weather.current.riskLevel.level === 2
                      ? t.statusMinorDelays
                      : t.statusNormal}
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

      <footer className="border-t border-slate-00 py-4">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-900">
          <p>{t.disclaimer}</p>
        </div>
        <div className="max-w-4xl mx-auto border-t border-slate-200 my-4"></div>
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-900">
          <div>{t.builtBy}</div>
          <div className="flex gap-4">
            <a href="/changelog" className="hover:text-slate-600">
              {t.changelog}
            </a>
            <a href="mailto:mateusz.kozlowski@gmail.com" className="hover:text-slate-600">
              {t.email}
            </a>
            <a href="https://mateuszkozlowski.xyz/" className="hover:text-slate-600">
              {t.website}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}