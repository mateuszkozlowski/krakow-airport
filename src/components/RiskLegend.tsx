"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger,
  DrawerClose 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  HelpCircle,
  CloudRain,
  Eye,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Calendar,
  Phone,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

interface RiskLevelProps {
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  borderColor: string;
  title: string;
  description: string;
  details: readonly string[];
  index: number;
}

const RiskLevel: React.FC<RiskLevelProps> = ({ 
  icon, 
  color, 
  bgGradient, 
  borderColor,
  title, 
  description, 
  details, 
  index 
}) => {
  const { language } = useLanguage();
  const t = translations[language].riskLegend;
  const [isExpanded, setIsExpanded] = useState(index === 0);
  
  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-500 hover:shadow-lg",
        borderColor,
        bgGradient,
        isExpanded ? "shadow-xl" : "shadow-md hover:shadow-lg"
      )}
      style={{
        animationDelay: `${index * 100}ms`,
        animation: "fadeInUp 0.6s ease-out forwards",
      }}
    >
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={cn("absolute inset-0 blur-xl opacity-30", bgGradient)} />
      </div>
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-5 relative z-10"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={cn(
              "shrink-0 p-3 rounded-xl transition-all duration-300",
              "bg-white/10 backdrop-blur-sm",
              "group-hover:scale-110 group-hover:rotate-3"
            )}>
              {icon}
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <h3 className={cn("font-semibold text-lg mb-1.5 transition-colors", color)}>
                {title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          
          <ChevronRight 
            className={cn(
              "w-5 h-5 text-slate-400 shrink-0 mt-2 transition-all duration-300",
              isExpanded ? "rotate-90 text-slate-200" : "group-hover:translate-x-1"
            )} 
          />
        </div>
      </button>

      {/* Expanded content */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-500 relative z-10",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-5 pb-5">
          {/* Divider with gradient */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />
          
          {/* What to expect - full width */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-200">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Eye className="h-4 w-4 text-blue-400" />
              </div>
              <span className="font-medium text-sm">{t.whatToExpect}</span>
            </div>
            <div className="space-y-2 pl-1">
              {details.map((detail, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-2.5 text-sm text-slate-400"
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    animation: isExpanded ? "fadeInRight 0.4s ease-out forwards" : "none"
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 mt-2 shrink-0" />
                  <span className="leading-relaxed">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RiskLegendContent = () => {
  const { language } = useLanguage();
  const t = translations[language].riskLegend;

  return (
    <div className="space-y-8 relative">
      {/* Header with modern design */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 blur-3xl" />
        <div className="relative space-y-3 text-center py-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm mb-2">
            <CloudRain className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200">
            {t.title}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {t.description}
          </p>
        </div>
      </div>

      {/* Risk levels grid */}
      <div className="grid gap-4">
        <RiskLevel
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
          color="text-emerald-300"
          bgGradient="bg-gradient-to-br from-emerald-900/30 via-emerald-800/20 to-emerald-900/30"
          borderColor="border-emerald-700/40"
          title={t.goodConditions.title}
          description={t.goodConditions.description}
          details={t.goodConditions.details}
          index={0}
        />

        <RiskLevel
          icon={<AlertCircle className="h-6 w-6 text-amber-400" />}
          color="text-amber-300"
          bgGradient="bg-gradient-to-br from-amber-900/30 via-amber-800/20 to-amber-900/30"
          borderColor="border-amber-700/40"
          title={t.minorImpact.title}
          description={t.minorImpact.description}
          details={t.minorImpact.details}
          index={1}
        />

        <RiskLevel
          icon={<AlertTriangle className="h-6 w-6 text-orange-400" />}
          color="text-orange-300"
          bgGradient="bg-gradient-to-br from-orange-900/30 via-orange-800/20 to-orange-900/30"
          borderColor="border-orange-700/40"
          title={t.weatherAdvisory.title}
          description={t.weatherAdvisory.description}
          details={t.weatherAdvisory.details}
          index={2}
        />

        <RiskLevel
          icon={<AlertTriangle className="h-6 w-6 text-red-400" />}
          color="text-red-300"
          bgGradient="bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30"
          borderColor="border-red-700/40"
          title={t.majorImpact.title}
          description={t.majorImpact.description}
          details={t.majorImpact.details}
          index={3}
        />
      </div>

      {/* Pro tips section with modern design */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-700/30 bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-purple-900/20 backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-blue-300" />
            </div>
            <h3 className="font-semibold text-lg text-blue-200">{t.proTips}</h3>
          </div>
          
          <div className="grid gap-3">
            {t.tips.map((tip, i) => {
              const icons = [Phone, Calendar, FileText];
              const Icon = icons[i % icons.length];
              return (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group"
                  style={{
                    animationDelay: `${i * 100}ms`,
                    animation: "fadeInUp 0.5s ease-out forwards"
                  }}
                >
                  <div className="p-1.5 rounded-lg bg-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-sm text-slate-300 leading-relaxed pt-0.5">{tip}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="border-t border-slate-700/50 pt-4 mt-2">
        <p className="text-xs text-slate-500 leading-relaxed text-center">
          {language === 'pl' 
            ? 'Informacje mają charakter wyłącznie orientacyjny i edukacyjny. Nie stanowią porady ani rekomendacji. Wszystkie decyzje dotyczące podróży należy podejmować wyłącznie na podstawie oficjalnych komunikatów przewoźnika i lotniska. Operator serwisu nie ponosi odpowiedzialności za decyzje podjęte na podstawie tych informacji.'
            : 'Information is for general guidance and educational purposes only. It does not constitute advice or recommendations. All travel decisions should be made based solely on official communications from your airline and airport. The service operator assumes no liability for decisions made based on this information.'}
        </p>
      </div>
    </div>
  );
};

export function RiskLegendDialog() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { language } = useLanguage();
  const t = translations[language].riskLegend;

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 hover:text-slate-200 text-slate-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            {t.title}
          </Button>
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
        <Button 
          variant="outline" 
          className="w-full bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 hover:text-slate-200 text-slate-300 transition-colors"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          {t.title}
        </Button>
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