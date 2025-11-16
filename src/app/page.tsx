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
import { RiskLegendContent } from "@/components/RiskLegend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
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
          <DialogHeader className="border-b border-slate-800 pb-4">
            <DialogTitle className="text-slate-200 px-1">{t.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-2 custom-scrollbar" style={{ maxHeight: "calc(90vh - 120px)" }}>
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
        <DrawerHeader className="border-b border-slate-800">
          <DrawerTitle className="text-slate-200 px-1 pl-7">{t.title}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="px-6 py-6">
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

// Risk visualization component with radial design
function RiskRadial({ level, size = 200 }: { level: 1 | 2 | 3 | 4; size?: number }) {
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
  const radius = (size - 40) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <filter id={`glow-${level}`}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id={`gradient-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={color.stroke} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color.bg}
          strokeWidth="12"
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#gradient-${level})`}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter={`url(#glow-${level})`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className={cn("w-12 h-12 mb-2")} style={{ color: color.stroke }} />
        <span className="text-sm font-bold text-white text-center px-2">
          {labels[level]}
        </span>
      </div>
          </div>
  );
}

// User-focused forecast timeline with accordion
function ForecastTimeline({ forecast }: { forecast: WeatherResponse['forecast'] }) {
  const { language } = useLanguage();
  const now = new Date();
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  
  const nextPeriods = forecast
    .filter(p => new Date(p.to) > now)
    .slice(0, 12);

  if (nextPeriods.length === 0) return null;

  // Group periods by time blocks for better readability
  const groupedPeriods: Array<{
    timeLabel: string;
    status: string;
    level: number;
    periods: typeof nextPeriods;
  }> = [];

  let currentGroup: typeof nextPeriods = [];
  let lastLevel = nextPeriods[0]?.riskLevel.level;

  nextPeriods.forEach((period, index) => {
    if (period.riskLevel.level !== lastLevel && currentGroup.length > 0) {
      // New group
      const firstPeriod = currentGroup[0];
      const lastPeriod = currentGroup[currentGroup.length - 1];
      
      groupedPeriods.push({
        timeLabel: formatTimeRange(new Date(firstPeriod.from), new Date(lastPeriod.to), language),
        status: getSimpleStatus(lastLevel, language),
        level: lastLevel,
        periods: currentGroup
      });
      
      currentGroup = [period];
      lastLevel = period.riskLevel.level;
    } else {
      currentGroup.push(period);
    }

    // Last group
    if (index === nextPeriods.length - 1 && currentGroup.length > 0) {
      const firstPeriod = currentGroup[0];
      const lastPeriod = currentGroup[currentGroup.length - 1];
      
      groupedPeriods.push({
        timeLabel: formatTimeRange(new Date(firstPeriod.from), new Date(lastPeriod.to), language),
        status: getSimpleStatus(period.riskLevel.level, language),
        level: period.riskLevel.level,
        periods: currentGroup
      });
    }
  });

  return (
    <div className="space-y-4">
      {/* Compact Timeline blocks */}
      <div className="space-y-2">
        {groupedPeriods.map((group, index) => {
          const isExpanded = expandedIndex === index;
          const bgColor = group.level >= 3 ? 'bg-red-900/30' : group.level >= 2 ? 'bg-orange-900/30' : 'bg-emerald-900/20';
          const borderColor = group.level >= 3 ? 'border-red-700/50' : group.level >= 2 ? 'border-orange-700/50' : 'border-emerald-700/30';
          const iconColor = group.level >= 3 ? 'text-red-400' : group.level >= 2 ? 'text-orange-400' : 'text-emerald-400';
          
          // Get all unique phenomena from the group
          const allPhenomena = Array.from(new Set(
            group.periods.flatMap(p => p.conditions.phenomena)
          ));
          
          // Get operational impacts
          const allImpacts = Array.from(new Set(
            group.periods.flatMap(p => p.operationalImpacts || [])
          ));

          const hasTemporary = group.periods.some(p => p.isTemporary);
          
          // Get weather details from the most representative period
          const repPeriod = group.periods[Math.floor(group.periods.length / 2)];
          
          return (
            <div
              key={index}
              className={`${bgColor} border ${borderColor} rounded-lg transition-all duration-200 p-3.5`}
            >
              {/* Compact Header - Always Visible */}
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="flex-shrink-0">
                  {group.level >= 3 ? (
                    <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
                  ) : group.level >= 2 ? (
                    <AlertCircle className={`w-4 h-4 ${iconColor}`} />
                  ) : (
                    <CheckCircle2 className={`w-4 h-4 ${iconColor}`} />
                  )}
            </div>

                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {group.timeLabel}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${bgColor} border ${borderColor} ${iconColor} font-medium`}>
                    {group.status}
                  </span>
                  </div>

                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-in fade-in duration-200">
                  {/* Phenomena */}
                  {allPhenomena.length > 0 && (
                    <div>
                      {hasTemporary && (
                        <p className="text-xs text-slate-400 mb-2">
                          {language === 'pl' ? 'Możliwe tymczasowe warunki:' : 'Possible temporary conditions:'}
                        </p>
                      )}
                  <div className="flex flex-wrap gap-2">
                        {allPhenomena.map((phenomenon, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2.5 py-1.5 bg-slate-800/60 rounded-md text-slate-200 border border-slate-700/50"
                          >
                            {phenomenon}
                          </span>
                        ))}
                </div>
              </div>
                  )}

                  {/* Operational Impacts - Only show specific/actionable ones */}
                  {(() => {
                    // Filter out generic impacts, keep only specific/actionable ones
                    const genericImpacts = [
                      'możliwe opóźnienia',
                      'possible delays',
                      'delays possible',
                      'opóźnienia',
                      'delays'
                    ];
                    
                    const specificImpacts = allImpacts.filter(impact => {
                      if (!impact || !impact.trim()) return false;
                      const lowerImpact = impact.toLowerCase();
                      
                      // Check if it's a generic impact (exact match or starts with)
                      const isGeneric = genericImpacts.some(generic => 
                        lowerImpact === generic || 
                        lowerImpact.startsWith('⚠️') && lowerImpact.includes(generic)
                      );
                      
                      return !isGeneric;
                    });
                    
                    if (specificImpacts.length === 0) return null;
                    
                    return (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">
                          {language === 'pl' ? 'Wpływ na operacje:' : 'Operational impacts:'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {specificImpacts.map((impact, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2.5 py-1.5 bg-slate-800/60 rounded-md text-slate-200 border border-slate-700/50"
                            >
                              {impact}
                            </span>
            ))}
          </div>
        </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper functions
function formatTimeRange(from: Date, to: Date, language: string): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const fromHour = from.getHours();
  const toHour = to.getHours();
  
  const fromDay = from.getDate();
  const nowDay = now.getDate();
  const tomorrowDay = tomorrow.getDate();
  
  // If it's happening now
  if (from <= now && to > now) {
    if (fromDay === nowDay) {
      return language === 'pl' 
        ? `Teraz do ${toHour}:00`
        : `Now until ${toHour}:00`;
    }
  }
  
  // Future today
  if (fromDay === nowDay) {
    if (fromHour === toHour) {
      return language === 'pl' ? `Dziś ${fromHour}:00` : `Today ${fromHour}:00`;
    }
    return language === 'pl' 
      ? `Dziś ${fromHour}:00-${toHour}:00`
      : `Today ${fromHour}:00-${toHour}:00`;
  }
  
  // Tomorrow
  if (fromDay === tomorrowDay) {
    return language === 'pl'
      ? `Jutro ${fromHour}:00-${toHour}:00`
      : `Tomorrow ${fromHour}:00-${toHour}:00`;
  }
  
  // Later
  return language === 'pl'
    ? `${fromHour}:00-${toHour}:00`
    : `${fromHour}:00-${toHour}:00`;
}

function getSimpleStatus(level: number, language: string): string {
  const t = translations[language === 'pl' ? 'pl' : 'en'];
  const statuses = {
    1: t.riskLevel1Title,
    2: t.riskLevel2Title,
    3: t.riskLevel3Title,
    4: t.riskLevel4Title
  };
  return statuses[level as 1 | 2 | 3 | 4];
}




// Key metrics display with advanced visualizations
function KeyMetrics({ current }: { current: WeatherResponse['current'] }) {
  const { language } = useLanguage();
  const t = translations[language];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Wind Compass */}
      {current.wind && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 text-center">
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
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 text-center">
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

        {/* Alert Bar with glassmorphism */}
        {highRiskPeriods.length > 0 && (
          <div className={cn(
            "rounded-none border-b backdrop-blur-xl transition-all duration-300",
            highRiskPeriods.some(p => p.riskLevel.level === 4) 
              ? "bg-red-900/40 border-red-500/30 shadow-lg shadow-red-900/20"
              : "bg-orange-900/40 border-orange-500/30 shadow-lg shadow-orange-900/20"
          )}>
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-4">
              <div className="flex flex-col gap-3">
                {/* Header - Always Visible */}
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "p-2.5 rounded-lg flex-shrink-0 mt-0.5",
                      highRiskPeriods.some(p => p.riskLevel.level === 4)
                        ? "bg-red-500/20 ring-1 ring-red-400/30"
                        : "bg-orange-500/20 ring-1 ring-orange-400/30"
                    )}>
                      <AlertTriangle className={cn(
                        "h-5 w-5",
                        highRiskPeriods.some(p => p.riskLevel.level === 4)
                          ? "text-red-200"
                          : "text-orange-200"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base md:text-lg leading-tight mb-1">
                        {highRiskPeriods.some(p => p.riskLevel.level === 4)
                          ? t.importantFlightInfo
                          : t.weatherAdvisory}
                      </h3>
                      {/* Quick summary - always visible */}
                      <p className="text-sm text-white/90 leading-snug">
                        {highRiskPeriods.some(p => p.riskLevel.level === 4)
                          ? t.flightDisruptions
                          : t.severeWeather}
                        <span className="font-semibold text-white">
                          {formatHighRiskTimes()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setIsAlertExpanded(!isAlertExpanded)}
                    size="icon"
                    variant="ghost"
                    className="text-white/80 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 rounded-lg h-9 w-9"
                    aria-label={isAlertExpanded ? 'Collapse alert' : 'Expand alert'}
                  >
                    {isAlertExpanded ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                
                {/* Expanded Details */}
                {isAlertExpanded && (
                  <div className="pl-14 pr-2 space-y-4 animate-in fade-in duration-200">
                    {/* Additional context */}
                    {highRiskPeriods.filter(p => p.riskLevel.level >= 3).length > 1 && (
                      <div className={cn(
                        "flex items-start gap-2 p-3 rounded-lg border text-sm",
                        highRiskPeriods.some(p => p.riskLevel.level === 4)
                          ? "bg-red-950/30 border-red-500/20"
                          : "bg-orange-950/30 border-orange-500/20"
                      )}>
                        <Info className="h-4 w-4 text-white/80 flex-shrink-0 mt-0.5" />
                        <span className="text-white/95 leading-relaxed">
                          {t.laterInDay}
                        </span>
                      </div>
                    )}

                    {/* Action Box - More prominent */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {language === 'pl' ? 'Co powinieneś zrobić?' : 'What you should do'}
                      </h4>
                      <p className="text-sm text-white/90 leading-relaxed mb-4">
                        {t.checkStatus}
                        {!highRiskPeriods.some(p => p.riskLevel.level === 4) 
                          ? ` ${t.withAirline}`
                          : ` ${t.directlyWithAirline}`}.
                      </p>
                      
                      <Link 
                        href="/passengerrights"
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap text-sm font-semibold 
                          bg-white hover:bg-white/95 text-slate-900 transition-all rounded-lg px-5 py-3 
                          shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                          focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
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
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section with Radial Display */}
        <div className="mb-12">
          <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center text-white">
            {t.title}
          </h1>

          {/* Main Radial Display */}
          <div className="flex justify-center mb-6">
            <RiskRadial level={weather.current.riskLevel.level} size={240} />
          </div>

          {/* Current Phenomena - between radial and status */}
          {weather.current.conditions.phenomena.length > 0 && (
            <div className="max-w-2xl mx-auto mb-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {weather.current.conditions.phenomena.map((phenomenon, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-slate-700/50 rounded-full text-sm text-slate-200 border border-slate-600/50"
                  >
                    {phenomenon}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status Message */}
          <div className="max-w-2xl mx-auto space-y-2">
            <p className="text-sm text-white text-center leading-relaxed">
              {weather.current.riskLevel.statusMessage}
            </p>
            {weather.current.riskLevel.level >= 2 && (
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                {language === 'pl' 
                  ? 'Zalecane sprawdzenie aktualnych informacji bezpośrednio u przewoźnika. Należy stosować się do oficjalnych komunikatów od przewoźnika dotyczących odprawy i obecności na lotnisku.'
                  : 'We recommend checking current information directly with your airline. Follow official airline communications regarding check-in and airport arrival times.'}
              </p>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mb-12">
          <KeyMetrics current={weather.current} />
        </div>

        {/* Forecast Timeline */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">
                {language === 'pl' ? 'Prognoza' : 'Forecast'}
              </h2>
              <CompactLegendButton />
            </div>
          </div>
          <ForecastTimeline forecast={weather.forecast} />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-6 bg-black/20 mt-12">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-sm text-slate-400 leading-relaxed mb-4">{t.disclaimer}</p>
          <div className="border-t border-slate-700 my-4"></div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-slate-500">{t.builtBy}</div>
            <div className="flex flex-wrap gap-4">
              <a href="/changelog" className="text-sm text-slate-400 hover:text-white transition-colors">
                {t.changelog}
              </a>
              <a href="mailto:mateusz.kozlowski@gmail.com" className="text-sm text-slate-400 hover:text-white transition-colors">
                {t.email}
              </a>
              <a href="https://mateuszkozlowski.xyz/" className="text-sm text-slate-400 hover:text-white transition-colors">
                {t.website}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
