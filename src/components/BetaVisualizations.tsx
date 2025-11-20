'use client';

import { Card, CardContent } from "@/components/ui/card";

// Wind compass component
export function WindCompass({ 
  direction, 
  speed, 
  gust,
  size = 150 
}: { 
  direction: number; 
  speed: number; 
  gust?: number;
  size?: number;
}) {
  const radius = size / 2;
  const arrowLength = radius * 0.6;
  const rotation = direction;

  const getWindStrength = () => {
    const windSpeed = gust || speed;
    if (windSpeed >= 25) return 'strong';
    if (windSpeed >= 15) return 'moderate';
    return 'light';
  };

  const strength = getWindStrength();
  const colors = {
    strong: { primary: '#ef4444', glow: '#ef444480' },
    moderate: { primary: '#f59e0b', glow: '#f59e0b80' },
    light: { primary: '#10b981', glow: '#10b98180' }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="relative">
        <defs>
          <filter id="wind-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Compass circle */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 5}
          fill="rgba(30, 41, 59, 0.5)"
          stroke={colors[strength].primary}
          strokeWidth="2"
          opacity="0.3"
        />
        
        {/* Cardinal directions */}
        <text x={radius} y={15} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">N</text>
        <text x={size - 10} y={radius + 5} textAnchor="middle" fill="white" fontSize="12">E</text>
        <text x={radius} y={size - 5} textAnchor="middle" fill="white" fontSize="12">S</text>
        <text x={10} y={radius + 5} textAnchor="middle" fill="white" fontSize="12">W</text>
        
        {/* Wind arrow */}
        <g 
          transform={`rotate(${rotation} ${radius} ${radius})`}
          filter="url(#wind-glow)"
        >
          <line
            x1={radius}
            y1={radius}
            x2={radius}
            y2={radius - arrowLength}
            stroke={colors[strength].primary}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <polygon
            points={`${radius},${radius - arrowLength - 10} ${radius - 6},${radius - arrowLength + 5} ${radius + 6},${radius - arrowLength + 5}`}
            fill={colors[strength].primary}
          />
        </g>
        
        {/* Center dot */}
        <circle
          cx={radius}
          cy={radius}
          r="4"
          fill={colors[strength].primary}
        />
      </svg>
      
      {/* Speed display */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <div className="text-xs text-slate-400">{direction}°</div>
        <div className="text-lg font-bold text-white">
          {speed}
          {gust && <span className="text-sm text-orange-400"> G{gust}</span>}
          <span className="text-xs ml-1">kt</span>
        </div>
      </div>
    </div>
  );
}


// Risk gauge meter
export function RiskGauge({ 
  level,
  maxLevel = 4,
  size = 200 
}: { 
  level: number;
  maxLevel?: number;
  size?: number;
}) {
  const percentage = (level / maxLevel) * 100;
  const radius = (size - 40) / 2;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 75) return '#ef4444';
    if (percentage >= 50) return '#f59e0b';
    if (percentage >= 25) return '#eab308';
    return '#10b981';
  };

  const color = getColor();

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 40 }}>
      <svg width={size} height={size / 2 + 40}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="33%" stopColor="#eab308" />
            <stop offset="66%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background arc */}
        <path
          d={`M ${20} ${size / 2 + 20} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2 + 20}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="20"
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <path
          d={`M ${20} ${size / 2 + 20} A ${radius} ${radius} 0 0 1 ${size - 20} ${size / 2 + 20}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter="url(#gauge-glow)"
          className="transition-all duration-1000"
        />
      </svg>
      
      {/* Value display */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <div className="text-4xl font-bold" style={{ color }}>
          {level}
          <span className="text-xl text-slate-400">/{maxLevel}</span>
        </div>
      </div>
    </div>
  );
}


// Visibility indicator
export function VisibilityIndicator({ 
  meters,
  size = 200 
}: { 
  meters: number;
  size?: number;
}) {
  const getVisibilityLevel = () => {
    if (meters < 550) return { level: 'critical', color: '#dc2626', label: 'Critical' };
    if (meters < 1000) return { level: 'poor', color: '#ef4444', label: 'Poor' };
    if (meters < 3000) return { level: 'moderate', color: '#f59e0b', label: 'Moderate' };
    if (meters < 5000) return { level: 'good', color: '#eab308', label: 'Good' };
    return { level: 'excellent', color: '#10b981', label: 'Excellent' };
  };

  const { color, label } = getVisibilityLevel();
  const kmValue = (meters / 1000).toFixed(1);

  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-sm font-semibold text-slate-300">Visibility</div>
          
          <div className="relative" style={{ width: size, height: 40 }}>
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 rounded-full opacity-30"></div>
            <div 
              className="absolute top-0 bottom-0 w-3 rounded-full transition-all duration-1000"
              style={{ 
                backgroundColor: color,
                left: `${Math.min((meters / 10000) * 100, 100)}%`,
                transform: 'translateX(-50%)',
                boxShadow: `0 0 10px ${color}`
              }}
            ></div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {kmValue}
              <span className="text-lg ml-1">km</span>
            </div>
            <div className="text-sm mt-1" style={{ color }}>
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

