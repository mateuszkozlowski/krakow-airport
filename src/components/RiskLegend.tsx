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

interface RiskLevelProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  details: string[];
  recommendations: string[];
}

const RiskLevel: React.FC<RiskLevelProps> = ({ icon, color, title, description, details, recommendations }) => (
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
          <span className="font-medium text-sm">What to expect:</span>
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
          <span className="font-medium text-sm">What you should do:</span>
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

const RiskLegendContent = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <h2 className="font-semibold text-lg text-slate-200">
        Understanding Weather Impact
      </h2>
      <p className="text-sm text-slate-400">
        This guide helps you understand how weather conditions might affect your flight and what actions to take.
      </p>
    </div>

    <div className="grid gap-6">
      <RiskLevel
        icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        color="text-emerald-400"
        title="Good Flying Conditions"
        description="Weather conditions are favorable for normal flight operations."
        details={[
          "Regular flight schedules maintained",
          "Standard visibility and ceiling conditions",
          "Normal approach and landing procedures",
          "Routine ground operations"
        ]}
        recommendations={[
          "Check in at regular time",
          "Follow standard airport procedures",
          "No special preparations needed"
        ]}
      />

      <RiskLevel
        icon={<AlertTriangle className="h-5 w-5 text-orange-400" />}
        color="text-orange-400"
        title="Minor Weather Impact"
        description="Some weather-related disruptions possible, but generally manageable."
        details={[
          "Possible short delays (15-30 minutes)",
          "Light precipitation or reduced visibility",
          "De-icing procedures may be required",
          "Slight adjustments to flight paths"
        ]}
        recommendations={[
          "Check flight status before leaving",
          "Allow extra 15-30 minutes for travel",
          "Keep your phone charged",
          "Monitor airport/airline updates"
        ]}
      />

      <RiskLevel
        icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
        color="text-red-400"
        title="Weather Advisory"
        description="Significant weather conditions affecting flight operations."
        details={[
          "Moderate to long delays (30-90 minutes)",
          "Possible flight cancellations",
          "Extended de-icing procedures",
          "Modified approach procedures",
          "Reduced airport capacity"
        ]}
        recommendations={[
          "Check flight status frequently",
          "Arrive 30-45 minutes earlier than usual",
          "Have airline contact information ready",
          "Consider flexible booking options",
          "Monitor weather updates"
        ]}
      />

      <RiskLevel
        icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
        color="text-red-500"
        title="Major Weather Impact"
        description="Severe weather conditions causing significant disruptions."
        details={[
          "Extended delays (2+ hours)",
          "High probability of cancellations",
          "Possible airport operational changes",
          "Limited runway availability",
          "Ground stop programs possible"
        ]}
        recommendations={[
          "Contact airline before traveling to airport",
          "Check rebooking/refund policies",
          "Consider alternative travel dates",
          "Monitor airport operational status",
          "Have backup travel plans ready"
        ]}
      />
    </div>

    <div className="rounded-lg bg-slate-800/50 p-4 text-sm">
      <div className="flex gap-3">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="font-medium text-slate-200">Pro Tips</p>
          <ul className="space-y-1.5 text-slate-400">
            <li className="flex items-center gap-2">
              <span className="block w-1 h-1 rounded-full bg-slate-600" />
              Download your airline's mobile app for instant updates
            </li>
            <li className="flex items-center gap-2">
              <span className="block w-1 h-1 rounded-full bg-slate-600" />
              Save airline contact numbers in your phone
            </li>
            <li className="flex items-center gap-2">
              <span className="block w-1 h-1 rounded-full bg-slate-600" />
              Take a screenshot of your booking details
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

export function RiskLegendDialog() {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full bg-slate-800/50 border-slate-700 hover:bg-slate-800/80 hover:text-slate-200 text-slate-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Understanding weather impact
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 shadow-xl">
          <DialogHeader className="border-b border-slate-800 pb-4">
            <DialogTitle className="text-slate-200 px-1">Weather Impact Guide</DialogTitle>
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
          Understanding weather impact
        </Button>
      </DrawerTrigger>
      <DrawerContent className="flex flex-col h-[85vh]">
        <DrawerHeader className="border-b border-slate-800">
          <DrawerTitle className="text-slate-200 px-1 pl-7">Weather Impact Guide</DrawerTitle>
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
              Close
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
} 