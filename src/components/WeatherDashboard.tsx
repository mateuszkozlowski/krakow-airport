import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CloudRain, Sun, Wind, Plane, Clock, ChevronDown, ChevronUp, ArrowUpCircle, ArrowDownCircle, MinusCircle, HelpCircle, Eye, Cloud } from "lucide-react";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { adjustToWarsawTime } from '@/lib/utils/time';
import { RiskLegendDialog } from './RiskLegend';

interface WeatherTimelineProps {
  current: {
    riskLevel: {
      level: number;
      title: string;
      statusMessage: string;
      operationalImpacts?: string[];
    };
    conditions: {
      phenomena: Array<string | { code: string; text?: string }>;
    };
    observed: string;
    wind?: { speed_kts: number; direction?: number; gust_kts?: number };
    visibility?: { meters: number };
    ceiling?: { feet: number };
  };
  forecast: Array<{
    from: Date;
    to: Date;
    riskLevel: {
      level: number;
      title: string;
      statusMessage: string;
      operationalImpacts?: string[];
    };
    conditions: {
      phenomena: Array<string | { code: string; text?: string }>;
    };
    wind?: { speed_kts: number; direction?: number; gust_kts?: number };
    visibility?: { meters: number };
    ceiling?: { feet: number };
  }>;
  isLoading: boolean;
  isError: boolean;
  retry: () => Promise<void>;
}

const RiskMeter = ({ level, animate = true }: { level: number; animate?: boolean }) => {
  const segments = 4;
  const activeSegments = level;
  
  return (
    <div className="flex gap-0.5">
      {[...Array(segments)].map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 w-1",
            i < activeSegments
              ? i >= 3 ? "bg-red-500"
              : i >= 2 ? "bg-amber-500"
              : i >= 1 ? "bg-yellow-500"
              : "bg-emerald-500"
              : "bg-slate-700/50"
          )}
        />
      ))}
    </div>
  );
};

const TrendIndicator = ({ from, to, animate = true }: { from: number; to: number; animate?: boolean }) => {
  const diff = to - from;
  const Icon = diff > 0 ? ArrowUpCircle : diff < 0 ? ArrowDownCircle : MinusCircle;
  const color = diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-slate-500";
  
  return (
    <motion.div
      initial={animate ? { scale: 0.8, opacity: 0 } : { scale: 1, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      className={cn("relative", color)}
    >
      <Icon className="w-6 h-6" />
      {animate && diff !== 0 && (
        <motion.div
          className="absolute inset-0"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
      )}
    </motion.div>
  );
};

const WeatherDashboard: React.FC<WeatherTimelineProps> = ({ current, forecast, isLoading, isError, retry }) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = translations[language];

  // Format the period time range
  const formatPeriodTime = (period: typeof forecast[0]) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const periodStart = new Date(period.from);
    const periodEnd = new Date(period.to);

    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (isSameDay(periodStart, now)) {
      return `${periodStart.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      })} - ${periodEnd.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      })}`;
    } else if (isSameDay(periodStart, tomorrow)) {
      return `do jutra ${periodEnd.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      })}`;
    } else {
      return `do ${periodEnd.toLocaleDateString('pl-PL', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Warsaw'
      })}`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-slate-800 rounded-xl" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{t.failedToLoad}</p>
        <button
          onClick={() => retry()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors"
        >
          {t.tryAgain}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Conditions Card */}
      <div className="rounded-xl border border-slate-800/50 bg-[#1a0f0f] overflow-hidden">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">
              Aktualne warunki • Aktualizacja {adjustToWarsawTime(new Date(current.observed)).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Warsaw'
              })}
            </div>
            <RiskMeter level={current.riskLevel.level} />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Plane className={cn(
              "h-5 w-5",
              current.riskLevel.level >= 3 ? "text-red-400" :
              current.riskLevel.level === 2 ? "text-amber-400" :
              "text-emerald-400"
            )} />
            <span className="text-lg font-medium text-white">{current.riskLevel.title}</span>
          </div>

          <p className="text-amber-500/90 text-base">
            {current.riskLevel.statusMessage}
          </p>
        </div>

        {/* Details */}
        <div className="border-t border-slate-800/50 p-4">
          <div className="space-y-4">
            {/* Phenomena */}
            {current.conditions.phenomena.length > 0 && (
              <div>
                <h4 className="text-sm text-slate-400 mb-2">Wpływ na operacje:</h4>
                {current.conditions.phenomena.map((p, idx) => {
                  const text = typeof p === 'string' ? p : p.text || p.code;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      {text}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Wind conditions */}
            {current.wind && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Wind className="h-4 w-4" />
                <span>Wiatr: {current.wind.speed_kts} kts
                  {current.wind.direction !== undefined && ` @ ${current.wind.direction}°`}
                  {current.wind.gust_kts && ` (porywy ${current.wind.gust_kts} kts)`}
                </span>
              </div>
            )}

            {/* Visibility */}
            {current.visibility && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Eye className="h-4 w-4" />
                <span>Widoczność: {current.visibility.meters}m</span>
              </div>
            )}

            {/* Ceiling */}
            {current.ceiling && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Cloud className="h-4 w-4" />
                <span>Podstawa chmur: {current.ceiling.feet}ft</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forecast Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button className="w-full text-center py-3 px-4 rounded-xl border border-slate-800/50 bg-slate-900/30 text-slate-300 hover:bg-slate-900/50 transition-colors">
            <div className="flex items-center justify-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span>Informacje o wpływie warunków pogodowych</span>
            </div>
          </button>
        </div>

        <div className="grid gap-2">
          {forecast.map((period, index) => {
            const id = `${period.from.getTime()}-${period.to.getTime()}`;
            const isExpanded = expandedCard === id;

            return (
              <div
                key={id}
                onClick={() => setExpandedCard(isExpanded ? null : id)}
                className={cn(
                  "rounded-xl border border-slate-800/50 overflow-hidden",
                  "transition-colors duration-200 cursor-pointer",
                  period.riskLevel.level >= 3 ? "bg-[#1a0f0f] hover:bg-[#1f1212]" :
                  period.riskLevel.level === 2 ? "bg-[#1a1a0f] hover:bg-[#1f1f12]" :
                  "bg-[#0f1a14] hover:bg-[#131f18]"
                )}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">
                        {formatPeriodTime(period)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Plane className={cn(
                          "h-5 w-5",
                          period.riskLevel.level >= 3 ? "text-red-400" :
                          period.riskLevel.level === 2 ? "text-amber-400" :
                          "text-emerald-400"
                        )} />
                        <span className="text-slate-200">{period.riskLevel.title}</span>
                      </div>
                      <p className="text-sm text-slate-400">{period.riskLevel.statusMessage}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <RiskMeter level={period.riskLevel.level} animate={false} />
                    </div>
                  </div>

                  {/* Always visible details */}
                  <div className="mt-4 space-y-2">
                    {period.conditions.phenomena.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm text-slate-400">Wpływ na operacje:</h4>
                        {period.conditions.phenomena.map((p, idx) => {
                          const text = typeof p === 'string' ? p : p.text || p.code;
                          return (
                            <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                              <span className="w-1 h-1 rounded-full bg-slate-400" />
                              {text}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Basic weather info */}
                    <div className="flex flex-col gap-2 text-sm text-slate-300">
                      {period.wind && (
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4" />
                          <span>Wiatr: {period.wind.speed_kts} kts
                            {period.wind.direction !== undefined && ` @ ${period.wind.direction}°`}
                            {period.wind.gust_kts && ` (porywy ${period.wind.gust_kts} kts)`}
                          </span>
                        </div>
                      )}
                      {period.visibility && (
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          <span>Widoczność: {period.visibility.meters}m</span>
                        </div>
                      )}
                      {period.ceiling && (
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          <span>Podstawa chmur: {period.ceiling.feet}ft</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional details when expanded */}
                <AnimatePresence>
                  {isExpanded && period.riskLevel.operationalImpacts && period.riskLevel.operationalImpacts.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800/50"
                    >
                      <div className="p-4 space-y-2">
                        <h4 className="text-sm font-medium text-slate-300">Szczegółowe informacje:</h4>
                        {period.riskLevel.operationalImpacts.map((impact, idx) => (
                          <p
                            key={idx}
                            className="text-sm text-slate-300 flex items-center gap-2"
                          >
                            <span className="w-1 h-1 rounded-full bg-slate-400" />
                            {impact}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeatherDashboard; 