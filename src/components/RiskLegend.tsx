"use client"

import React from 'react';
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
import { AlertTriangle, CheckCircle2, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

interface RiskLevelProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  details: readonly string[];
  recommendations: readonly string[];
}

const RiskLevel: React.FC<RiskLevelProps> = ({ icon, color, title, description, details, recommendations }) => {
  const { language } = useLanguage();
  const t = translations[language].riskLegend;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="shrink-0">{icon}</div>
        <span className={cn("font-medium", color)}>{title}</span>
      </div>
      <div className="ml-6 space-y-2">
        <p className="text-sm text-slate-200">{description}</p>
        
        <div className="space-y-1">
          <div className="flex gap-2 items-center text-slate-300">
            <Info className="h-3 w-3 shrink-0" />
            <span className="font-medium text-sm">{t.whatToExpect}</span>
          </div>
          <ul className="ml-5 space-y-0.5 text-sm text-slate-400 list-disc">
            {details.map((detail, idx) => (
              <li key={idx}>{detail}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <div className="flex gap-2 items-center text-slate-300">
            <HelpCircle className="h-3 w-3 shrink-0" />
            <span className="font-medium text-sm">{t.whatToDo}</span>
          </div>
          <ul className="ml-5 space-y-0.5 text-sm text-slate-400 list-disc">
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const RiskLegendContent = () => {
  const { language } = useLanguage();
  const t = translations[language].riskLegend;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-lg text-slate-200">
          {t.title}
        </h2>
        <p className="text-sm text-slate-400">
          {t.description}
        </p>
      </div>

      <div className="grid gap-6">
        <RiskLevel
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          color="text-emerald-500"
          title={t.goodConditions.title}
          description={t.goodConditions.description}
          details={t.goodConditions.details}
          recommendations={t.goodConditions.recommendations}
        />

        <RiskLevel
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          color="text-orange-500"
          title={t.minorImpact.title}
          description={t.minorImpact.description}
          details={t.minorImpact.details}
          recommendations={t.minorImpact.recommendations}
        />

        <RiskLevel
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          color="text-red-500"
          title={t.weatherAdvisory.title}
          description={t.weatherAdvisory.description}
          details={t.weatherAdvisory.details}
          recommendations={t.weatherAdvisory.recommendations}
        />

        <RiskLevel
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          color="text-red-500"
          title={t.majorImpact.title}
          description={t.majorImpact.description}
          details={t.majorImpact.details}
          recommendations={t.majorImpact.recommendations}
        />
      </div>

      <div className="rounded-lg bg-slate-800/50 p-4 text-sm">
        <div className="flex gap-3">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-medium text-slate-200">{t.proTips}</p>
            <ul className="space-y-1.5 text-slate-400">
              {t.tips.map((tip, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="block w-1 h-1 rounded-full bg-slate-600" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
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