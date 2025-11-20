'use client';

import React, { useEffect, useState } from 'react';
import { Alert } from "@/components/ui/alert";
import type { WeatherResponse } from '@/lib/types/weather';
import { getAirportWeather } from "@/lib/weather";
import { MainNav } from "@/components/MainNav";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2,
  Shield,
  X,
  ChevronDown,
  Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { 
  WindCompass, 
  VisibilityIndicator, 
  RiskGauge
} from "@/components/BetaVisualizations";
import { HourlyBreakdown } from "@/components/HourlyBreakdown";
import { RiskLegendContent } from "@/components/RiskLegend";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  Drawer, 
  DrawerContent, 
  DrawerTrigger,
  DrawerClose 
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

// Compact legend button component
function CompactLegendButton() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { language } = useLanguage();
  const t = translations[language].riskLegend;

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button 
            className="inline-flex items-center justify-center rounded-full p-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all hover:scale-110"
            aria-label={t.title}
          >
            <Info className="w-4 h-4" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 shadow-xl">
          <div className="overflow-y-auto px-2 py-4 custom-scrollbar" style={{ maxHeight: "calc(90vh - 80px)" }}>
            <RiskLegendContent />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button 
          className="inline-flex items-center justify-center rounded-full p-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all hover:scale-110"
          aria-label={t.title}
        >
          <Info className="w-4 h-4" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="flex flex-col h-[85vh]">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-6 py-8">
            <RiskLegendContent />
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 mt-auto">
          <DrawerClose asChild>
            <Button 
              variant="outline" 
              className="w-full bg-slate-800 border-slate-700 hover:bg-slate-700/80 text-slate-300 transition-colors"
            >
              {t.close}
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Risk visualization component with radial design - Enhanced with forecast ring
function RiskRadial({ 
  level, 
  forecastLevel,
  size = 200 
}: { 
  level: 1 | 2 | 3 | 4; 
  forecastLevel?: 1 | 2 | 3 | 4;
  size?: number;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const colors = {
    1: { stroke: '#10b981', glow: '#10b981', bg: '#10b98120' },
    2: { stroke: '#f59e0b', glow: '#f59e0b', bg: '#f59e0b20' },
    3: { stroke: '#ef4444', glow: '#ef4444', bg: '#ef444420' },
    4: { stroke: '#dc2626', glow: '#dc2626', bg: '#dc262620' },
  };

  // Short labels for radial display (full names in legend)
  const labels = {
    1: language === 'pl' ? 'Korzystne warunki' : 'Good conditions',
    2: language === 'pl' ? 'Niewielki wpływ' : 'Minor impact',
    3: language === 'pl' ? 'Alert pogodowy' : 'Weather alert',
    4: language === 'pl' ? 'Trudne warunki' : 'Major impact',
  };

  const icons = {
    1: CheckCircle2,
    2: AlertTriangle,
    3: AlertTriangle,
    4: AlertTriangle,
  };

  const Icon = icons[level];
  const color = colors[level];
  const percentage = (level / 4) * 100;
  
  // Inner circle (current conditions) - BIGGER!
  const innerRadius = (size - 45) / 2;  // Increased even more from 60 to 45
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerStrokeDashoffset = innerCircumference - (percentage / 100) * innerCircumference;

  // Outer circle (forecast) - only if forecast level differs - BIGGER!
  const showForecast = forecastLevel && forecastLevel !== level;
  const forecastColor = showForecast ? colors[forecastLevel] : color;
  const forecastPercentage = forecastLevel ? (forecastLevel / 4) * 100 : 0;
  const outerRadius = (size - 12) / 2;  // Increased even more from 20 to 12
  const outerCircumference = 2 * Math.PI * outerRadius;
  const outerStrokeDashoffset = outerCircumference - (forecastPercentage / 100) * outerCircumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          {/* Inner (current) filters and gradients */}
          <filter id={`glow-inner-${level}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id={`gradient-inner-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={color.stroke} stopOpacity="0.6" />
          </linearGradient>
          
          {/* Outer (forecast) filters and gradients */}
          {showForecast && (
            <>
              <filter id={`glow-outer-${forecastLevel}`}>
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id={`gradient-outer-${forecastLevel}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={forecastColor.stroke} stopOpacity="0.8" />
                <stop offset="100%" stopColor={forecastColor.stroke} stopOpacity="0.4" />
              </linearGradient>
            </>
          )}
        </defs>
        
        {/* Outer ring - Forecast (if different from current) */}
        {showForecast && (
          <>
            {/* Outer background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={outerRadius}
              stroke={forecastColor.bg}
              strokeWidth="14"
              fill="none"
            />
            
            {/* Outer progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={outerRadius}
              stroke={`url(#gradient-outer-${forecastLevel})`}
              strokeWidth="14"
              fill="none"
              strokeDasharray={outerCircumference}
              strokeDashoffset={outerStrokeDashoffset}
              strokeLinecap="round"
              filter={`url(#glow-outer-${forecastLevel})`}
              className="transition-all duration-1000 ease-out"
              opacity="0.85"
            />
          </>
        )}
        
        {/* Inner ring - Current conditions */}
        {/* Inner background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke={color.bg}
          strokeWidth="12"
          fill="none"
        />
        
        {/* Inner progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke={`url(#gradient-inner-${level})`}
          strokeWidth="12"
          fill="none"
          strokeDasharray={innerCircumference}
          strokeDashoffset={innerStrokeDashoffset}
          strokeLinecap="round"
          filter={`url(#glow-inner-${level})`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className={cn("w-12 h-12 mb-2")} style={{ color: color.stroke }} />
        <span className="text-sm font-bold text-white text-center px-2">
          {labels[level]}
        </span>
        {showForecast && (
          <span className="text-xs text-slate-400 mt-1 text-center px-2">
            {language === 'pl' ? 'Prognoza:' : 'Forecast:'} {labels[forecastLevel]}
          </span>
        )}
      </div>
    </div>
  );
}

// Helper function to get forecast risk level for current time window
function getForecastRiskForCurrentTime(forecast: WeatherResponse['forecast']): {
  level: 1 | 2 | 3 | 4;
  period: WeatherResponse['forecast'][0] | null;
} | null {
  const now = new Date();
  
  // Find periods that include the current time
  const currentPeriods = forecast.filter(period => {
    const from = new Date(period.from);
    const to = new Date(period.to);
    return from <= now && to > now;
  });
  
  if (currentPeriods.length === 0) return null;
  
  // Get the highest risk level among current periods
  const maxRisk = Math.max(...currentPeriods.map(p => p.riskLevel.level)) as 1 | 2 | 3 | 4;
  const period = currentPeriods.find(p => p.riskLevel.level === maxRisk) || null;
  
  return { level: maxRisk, period };
}





// Key metrics display with advanced visualizations
function KeyMetrics({ current }: { current: WeatherResponse['current'] }) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
      {/* Wind Compass */}
      {current.wind && (
        <Card className="bg-slate-800/50 shadow-2xl border-0">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-sm md:text-base font-semibold text-slate-200 mb-4 md:mb-6 text-center">
              {t.windConditions}
            </h3>
            <div className="flex justify-center">
              <WindCompass 
                direction={current.wind.direction}
                speed={current.wind.speed_kts}
                gust={current.wind.gust_kts}
                size={160}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visibility Indicator */}
      {current.visibility && (
        <VisibilityIndicator meters={current.visibility.meters} size={220} />
      )}

      {/* Ceiling with gauge */}
      {current.ceiling && (
        <Card className="bg-slate-800/50 shadow-2xl border-0">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-sm md:text-base font-semibold text-slate-200 mb-4 md:mb-6 text-center">
              {t.ceilingConditions}
            </h3>
            <div className="flex flex-col items-center space-y-2">
              <RiskGauge 
                level={current.ceiling.feet < 200 ? 4 : current.ceiling.feet < 500 ? 3 : current.ceiling.feet < 1000 ? 2 : 1}
                maxLevel={4}
                size={160}
              />
              <div className="text-center mt-4">
                <div className="text-2xl font-bold text-white">
                  {current.ceiling.feet}
                  <span className="text-sm ml-1">ft</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {current.ceiling.feet < 1000 
                    ? (language === 'pl' ? 'Niska' : 'Low')
                    : (language === 'pl' ? 'Dobra' : 'Good')}
            </div>
          </div>
        </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


export default function Home() {
  const { language } = useLanguage();
  const t = translations[language];
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAlertExpanded, setIsAlertExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('alertExpanded');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('alertExpanded', isAlertExpanded.toString());
    }
  }, [isAlertExpanded]);

  async function fetchData() {
    try {
        setIsLoading(true);
      setError(null);
      const weatherData = await getAirportWeather(language);
      if (!weatherData) {
        throw new Error('Failed to fetch data');
      }
      setWeather(weatherData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [language]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-300">{language === 'pl' ? 'Ładowanie...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
          <p className="text-slate-300">{error || 'Failed to load data'}</p>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {language === 'pl' ? 'Spróbuj ponownie' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  const highRiskPeriods = weather?.forecast?.filter(
    period => period.riskLevel.level >= 3 && new Date(period.to) > new Date()
  ) || [];

  // Check if we're currently within a forecast period with different risk
  const forecastRiskNow = getForecastRiskForCurrentTime(weather.forecast);
  const currentRisk = weather.current.riskLevel.level;
  const showAlert = highRiskPeriods.length > 0 || (forecastRiskNow && forecastRiskNow.level >= 3);

  const formatHighRiskTimes = () => {
    if (!highRiskPeriods.length) return '';
    const firstPeriod = highRiskPeriods[0];
    const periodStart = new Date(firstPeriod.from);
    const periodEnd = new Date(firstPeriod.to);
    const now = new Date();

    const formatTimeRange = () => {
      const timeFormat = { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' } as const;
      const startTime = periodStart.toLocaleTimeString('en-GB', timeFormat);
      const endTime = periodEnd.toLocaleTimeString('en-GB', timeFormat);

      const warsawNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      const warsawStart = new Date(periodStart.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
      
      // Set time to midnight for accurate day comparison
      const todayMidnight = new Date(warsawNow);
      todayMidnight.setHours(0, 0, 0, 0);
      
      const startMidnight = new Date(warsawStart);
      startMidnight.setHours(0, 0, 0, 0);
      
      // Calculate day difference
      const dayDifference = Math.floor((startMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDifference === 0) {
        return language === 'pl'
          ? `do ${endTime} dzisiaj`
          : `until ${endTime} today`;
      } else if (dayDifference === 1) {
        return language === 'pl'
          ? `jutro w godzinach ${startTime} do ${endTime}`
          : `tomorrow between ${startTime} and ${endTime}`;
      } else {
        // For dates beyond tomorrow, show the actual date
        const dateFormat = { month: 'short', day: 'numeric', timeZone: 'Europe/Warsaw' } as const;
        const dateStr = periodStart.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-GB', dateFormat);
        return language === 'pl'
          ? `${dateStr} w godzinach ${startTime} do ${endTime}`
          : `${dateStr} between ${startTime} and ${endTime}`;
      }
    };

    return formatTimeRange();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <Alert className="rounded-none border-0 bg-transparent">
          <div className="max-w-6xl mx-auto w-full px-6 flex justify-between items-center">
            <MainNav />
            <div className="flex items-center gap-2">
              <a 
                href="https://x.com/KrkFlights"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md hover:bg-white/10 h-9 w-9 transition-colors"
                aria-label="Twitter"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <LanguageSelector />
            </div>
          </div>
        </Alert>

        {/* Alert Bar with glassmorphism - ONE CONSISTENT ALERT ZONE */}
        {showAlert && (
          <div className={cn(
            "rounded-none border-b backdrop-blur-xl py-4 transition-all duration-300",
            (currentRisk >= 4 || highRiskPeriods.some(p => p.riskLevel.level === 4))
              ? "bg-red-900/40 border-red-500/30 shadow-lg shadow-red-900/20"
              : "bg-orange-900/40 border-orange-500/30 shadow-lg shadow-orange-900/20"
          )}>
            <div className="max-w-6xl mx-auto w-full px-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      (currentRisk >= 4 || highRiskPeriods.some(p => p.riskLevel.level === 4))
                        ? "bg-red-500/20"
                        : "bg-orange-500/20"
                    )}>
                      <AlertTriangle className={cn(
                        "h-5 w-5",
                        (currentRisk >= 4 || highRiskPeriods.some(p => p.riskLevel.level === 4))
                          ? "text-red-300"
                          : "text-orange-300"
                      )} />
                    </div>
                    <h3 className="font-bold text-white text-sm md:text-base truncate">
                        {(currentRisk >= 4 || highRiskPeriods.some(p => p.riskLevel.level === 4))
                          ? t.importantFlightInfo
                          : t.weatherAdvisory}
                      </h3>
                    </div>
                    <Button 
                      onClick={() => setIsAlertExpanded(!isAlertExpanded)}
                      size="icon"
                      variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 rounded-lg"
                      aria-label={isAlertExpanded ? 'Collapse alert' : 'Expand alert'}
                    >
                      {isAlertExpanded ? (
                      <X className="h-5 w-5" />
                      ) : (
                      <ChevronDown className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  
                  {isAlertExpanded && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Smart context based on current vs forecast */}
                    {forecastRiskNow && forecastRiskNow.level > currentRisk && currentRisk < 3 ? (
                      // Scenario: Good now, but forecast predicts worse
                      <div className="space-y-2">
                        <p className="text-sm leading-relaxed text-white/95">
                          {language === 'pl'
                            ? `⚠️ Obecnie warunki są korzystne (${weather.current.riskLevel.title}), ale prognoza przewiduje pogorszenie do poziomu ${forecastRiskNow.level} (${forecastRiskNow.period?.riskLevel.title}) ${formatHighRiskTimes()}.`
                            : `⚠️ Current conditions are favorable (${weather.current.riskLevel.title}), but forecast predicts deterioration to level ${forecastRiskNow.level} (${forecastRiskNow.period?.riskLevel.title}) ${formatHighRiskTimes()}.`}
                        </p>
                        <p className="text-xs text-white/80">
                          {language === 'pl'
                            ? 'Warunki mogą się szybko zmienić. Sprawdź status lotu bezpośrednio u przewoźnika.'
                            : 'Conditions may change rapidly. Check your flight status directly with your airline.'}
                        </p>
                      </div>
                    ) : (
                      // Default scenario: Current or forecast high risk
                      <p className="text-sm leading-relaxed text-white/95">
                        {(currentRisk >= 4 || highRiskPeriods.some(p => p.riskLevel.level === 4))
                          ? t.flightDisruptions
                          : t.severeWeather}
                        {formatHighRiskTimes()}
                        {highRiskPeriods.filter(p => p.riskLevel.level >= 3).length > 1 
                          && `. ${t.laterInDay}`}
                        {`. ${t.checkStatus}`}
                        {!(currentRisk >= 4 || highRiskPeriods.some(p => p.riskLevel.level === 4))
                          ? ` ${t.withAirline}`
                          : ` ${t.directlyWithAirline}`}.
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link 
                          href="/passengerrights"
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold 
                          bg-white hover:bg-white/90 text-red-900 transition-all rounded-lg px-5 py-2.5 
                          shadow-lg hover:shadow-xl hover:scale-[1.02]
                          focus:outline-none focus:ring-2 focus:ring-white/50"
                      >
                        <Shield className="h-4 w-4" />
                          {t.knowYourRights}
                        </Link>
                      </div>
                  </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12 md:px-8 md:py-20 lg:px-12">
        {/* Hero Section with Radial Display */}
        <div className="mb-12 md:mb-16">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-12 text-center text-white tracking-tight">
            {t.title}
          </h1>

          {/* Main Radial Display */}
          <div className="flex flex-col items-center mb-6">
            <RiskRadial 
              level={weather.current.riskLevel.level} 
              forecastLevel={getForecastRiskForCurrentTime(weather.forecast)?.level}
              size={240} 
            />
            
            {/* Legend - show only when forecast ring is visible */}
            {(() => {
              const forecastRisk = getForecastRiskForCurrentTime(weather.forecast);
              if (forecastRisk && forecastRisk.level !== weather.current.riskLevel.level) {
                return (
                  <div className="mt-4 flex items-center gap-4 md:gap-6 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-current"></div>
                      <span>{language === 'pl' ? 'Teraz (METAR)' : 'Now (METAR)'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-current opacity-60"></div>
                      <span>{language === 'pl' ? 'Prognoza (TAF)' : 'Forecast (TAF)'}</span>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>


          {/* Current Phenomena - between radial and status */}
          {weather.current.conditions.phenomena.length > 0 && (
            <div className="max-w-2xl mx-auto mb-6 md:mb-8">
              <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                {weather.current.conditions.phenomena.map((phenomenon, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-700/60 rounded-full text-xs md:text-sm text-slate-100 shadow-lg"
                  >
                    {phenomenon}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="max-w-2xl mx-auto space-y-2 md:space-y-3">
            <p className="text-sm md:text-base text-white text-center leading-relaxed">
              {weather.current.riskLevel.statusMessage}
            </p>
            {weather.current.riskLevel.level >= 2 && (
              <p className="text-xs md:text-sm text-slate-300 text-center leading-relaxed">
                {language === 'pl' 
                  ? 'Zalecane sprawdzenie aktualnych informacji bezpośrednio u przewoźnika. Należy stosować się do oficjalnych komunikatów od przewoźnika dotyczących odprawy i obecności na lotnisku.'
                  : 'We recommend checking current information directly with your airline. Follow official airline communications regarding check-in and airport arrival times.'}
              </p>
            )}
            {/* Contextual CTA for risk level ≥ 2 */}
            {weather.current.riskLevel.level >= 2 && (
              <div className="pt-4 flex justify-center">
                <Link 
                  href="/passengerrights"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/90 hover:bg-blue-600 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Shield className="w-4 h-4" />
                  {language === 'pl' 
                    ? 'Sprawdź swoje prawa pasażera' 
                    : 'Check your passenger rights'}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-12">
          <KeyMetrics current={weather.current} />
        </div>

        {/* Forecast Timeline */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {language === 'pl' ? 'Prognoza' : 'Forecast'}
              </h2>
              <CompactLegendButton />
            </div>
          <HourlyBreakdown forecast={weather.forecast} language={language} />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8 md:py-12 bg-black/20 mt-12 md:mt-20">
        <div className="max-w-6xl mx-auto px-6 md:px-8 lg:px-12">
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4 md:mb-6">{t.disclaimer}</p>
          <div className="border-t border-slate-700/50 my-4 md:my-6"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 md:gap-6">
            <div className="text-xs md:text-sm text-slate-400">{t.builtBy}</div>
            <div className="flex flex-wrap gap-4 md:gap-6">
              <a href="/changelog" className="text-xs md:text-sm text-slate-300 hover:text-white">
                {t.changelog}
              </a>
              <a href="mailto:mateusz.kozlowski@gmail.com" className="text-xs md:text-sm text-slate-300 hover:text-white">
                {t.email}
              </a>
              <a href="https://mateuszkozlowski.xyz/" className="text-xs md:text-sm text-slate-300 hover:text-white">
                {t.website}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
