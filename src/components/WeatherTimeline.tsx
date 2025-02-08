import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, CloudRain, Sun, Wind, ChevronDown, ChevronUp, Clock, Plane, ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import type { ForecastChange, RiskAssessment } from "@/lib/types/weather";
import { adjustToWarsawTime } from '@/lib/utils/time';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherDashboard from './WeatherDashboard';

interface WeatherTimelineProps {
  current: {
    riskLevel: RiskAssessment;
    conditions: {
      phenomena: Array<{
        code: string;
        text?: string;
      } | string>;
    };
    observed: string;
    wind?: { speed_kts: number; direction: number; gust_kts?: number };
    visibility?: { meters: number };
    ceiling?: { feet: number };
  };
  forecast: (ForecastChange & { operationalImpacts?: string[] })[];
  isLoading: boolean;
  isError: boolean;
  retry: () => Promise<void>;
}

// Innovative risk visualization component
const RiskMeter = ({ level, animate = true }: { level: number; animate?: boolean }) => {
  const segments = 4;
  const activeSegments = level;
  
  const getGradient = (level: number) => {
    switch(level) {
      case 4:
        return "from-red-500/20 to-red-950/30";
      case 3:
        return "from-amber-500/20 to-amber-950/30";
      case 2:
        return "from-yellow-500/20 to-yellow-950/30";
      default:
        return "from-emerald-500/20 to-emerald-950/30";
    }
  };

  return (
    <motion.div
      initial={animate ? { scale: 0.95 } : { scale: 1 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex gap-1 items-center p-2 rounded-lg",
        "bg-gradient-to-r",
        getGradient(level)
      )}
    >
      {[...Array(segments)].map((_, i) => (
        <motion.div
          key={i}
          initial={animate ? { scaleY: 0 } : { scaleY: 1 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.1 }}
          className={cn(
            "h-6 w-2 rounded-full",
            i < activeSegments
              ? i >= 3 ? "bg-red-500"
              : i >= 2 ? "bg-amber-500"
              : i >= 1 ? "bg-yellow-500"
              : "bg-emerald-500"
              : "bg-slate-700/50"
          )}
        />
      ))}
    </motion.div>
  );
};

// Timeline visualization with curved connections
const TimelineConnector = ({ isActive }: { isActive: boolean }) => (
  <svg className="absolute left-6 h-full w-12 overflow-visible" style={{ top: '3rem' }}>
    <path
      d="M 24 0 L 24 100%"
      className={cn(
        "stroke-2 transition-colors duration-300",
        isActive ? "stroke-slate-400" : "stroke-slate-700"
      )}
      strokeDasharray="4 4"
    />
  </svg>
);

// Add type for weather phenomenon
type WeatherPhenomenon = string | {
  code: string;
  text?: string;
};

// Add new component for trend visualization
const TrendIndicator = ({ from, to, animate = true }: { 
  from: number; 
  to: number;
  animate?: boolean;
}) => {
  const diff = to - from;
  
  const Icon = diff > 0 ? ArrowUpCircle : diff < 0 ? ArrowDownCircle : MinusCircle;
  const color = diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-slate-500";
  
  return (
    <motion.div
      initial={animate ? { scale: 0.8, opacity: 0 } : { scale: 1, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      className={cn(
        "relative",
        color
      )}
    >
      <Icon className="w-6 h-6" />
      {animate && diff !== 0 && (
        <motion.div
          className="absolute inset-0"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
      )}
    </motion.div>
  );
};

// Add new component for time remaining visualization
const TimeRemaining = ({ date }: { date: Date }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  useEffect(() => {
    const updateTime = () => {
    const now = new Date();
      const diff = date.getTime() - now.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      
      if (minutes < 0) {
        setTimeLeft('Zakończone');
        return;
      }
      
      if (hours === 0) {
        setTimeLeft(`${minutes}min`);
      } else {
        setTimeLeft(`${hours}h ${minutes % 60}min`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-xs text-slate-400"
    >
      {timeLeft}
    </motion.div>
  );
};

// Enhance weather condition visualization
const WeatherVisual = ({ 
  phenomena, 
  wind, 
  visibility 
}: {
  phenomena: WeatherPhenomenon[];
  wind?: { speed_kts: number };
  visibility?: { meters: number };
}) => {
  const conditions = useMemo(() => {
    const icons = [];
    
    if (phenomena.some(p => {
      const text = typeof p === 'string' ? p : p.text || p.code;
      return text.includes('⛈️');
    })) {
      icons.push({ 
        icon: <AlertTriangle className="h-5 w-5 text-red-400" />, 
        severity: 3,
        animate: true 
      });
    }
    
    if (phenomena.some(p => {
      const text = typeof p === 'string' ? p : p.text || p.code;
      return text.includes('🌧️');
    })) {
      icons.push({ 
        icon: <CloudRain className="h-5 w-5 text-blue-400" />, 
        severity: 2,
        animate: false 
      });
    }
    
    if (wind?.speed_kts && wind.speed_kts >= 15) {
      icons.push({ 
        icon: <Wind className="h-5 w-5 text-yellow-400" />, 
        severity: 2,
        animate: wind.speed_kts >= 25 
      });
    }
    
    if (visibility?.meters && visibility.meters < 3000) {
      icons.push({ 
        icon: <Sun className="h-5 w-5 text-slate-400" />, 
        severity: 2,
        animate: visibility.meters < 1000 
      });
    }
    
    return icons.sort((a, b) => b.severity - a.severity);
  }, [phenomena, wind, visibility]);

  return (
    <motion.div 
      className="flex gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {conditions.map((condition, idx) => (
        <motion.div
          key={idx}
          className="relative"
          animate={condition.animate ? {
            scale: [1, 1.2, 1],
            rotate: [-5, 5, -5, 5, 0]
          } : {}}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          {condition.icon}
          <div className="absolute inset-0 animate-pulse-slow opacity-30 blur-sm" />
        </motion.div>
      ))}
    </motion.div>
  );
};

// Flight impact visualization
const FlightImpactIndicator = ({ level, title }: { level: number; title: string }) => {
  const getColor = (level: number) => {
    if (level >= 4) return "text-red-400 bg-red-950/50 border-red-500/30";
    if (level >= 3) return "text-amber-400 bg-amber-950/50 border-amber-500/30";
    if (level >= 2) return "text-yellow-400 bg-yellow-950/50 border-yellow-500/30";
    return "text-emerald-400 bg-emerald-950/50 border-emerald-500/30";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg border",
        "transition-colors duration-300",
        getColor(level)
      )}
    >
      <Plane className="h-4 w-4" />
      <span className="text-sm font-medium">{title}</span>
    </motion.div>
  );
};

// Time progression visualization
const TimeProgress = ({ from, to }: { from: Date; to: Date }) => {
  const progress = useMemo(() => {
    const now = new Date();
    const total = to.getTime() - from.getTime();
    const current = now.getTime() - from.getTime();
    return Math.max(0, Math.min(100, (current / total) * 100));
  }, [from, to]);

  return (
    <div className="relative h-1 w-full bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="absolute h-full bg-blue-500"
        transition={{ duration: 1 }}
      />
    </div>
  );
};

const WeatherTimeline: React.FC<WeatherTimelineProps> = (props) => {
  return <WeatherDashboard {...props} />;
};

export default WeatherTimeline;

