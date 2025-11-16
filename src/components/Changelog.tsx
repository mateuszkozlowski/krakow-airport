// src/components/Changelog.tsx
import React from 'react';
import { PartyPopper, Rocket, GitMerge } from "lucide-react";

interface ChangelogEntry {
  date: string;
  version?: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
  {
    date: "2025-01-16",
    version: "0.3.3",
    changes: [
      "Fixed critical weather risk assessment bugs affecting extreme conditions. The system now correctly identifies zero visibility (0m) and ground-level clouds (BKN000/OVC000) as Level 4 emergency conditions. Previously, these extreme weather situations were incorrectly treated as 'no data' due to JavaScript falsy value handling, potentially showing 'no risk' during the most dangerous conditions.",
      
      "Enhanced METAR parsing with robust fallback mechanisms. Implemented direct parsing from raw METAR text for visibility and cloud ceiling data when primary API data is unavailable. This ensures accurate weather assessment even for extreme low-visibility conditions (50m-100m) and ground-level cloud coverage that some weather APIs fail to parse correctly.",
      
      "Completely redesigned operational impact descriptions to be more specific and actionable. Impact messages now include exact measurements, percentage deviations from operational minimums, and clear recommendations. For example, instead of generic warnings, you'll now see 'Visibility 100m - 82% below minimum (550m)' with specific guidance on expected operational status.",
      
      "Removed predictable time-based risk multipliers for more intelligent weather assessment. The algorithm no longer artificially increases risk based on time of day or season, instead focusing purely on actual meteorological conditions and their operational impacts. This makes the system more accurate and less prone to false alarms during routine morning fog in summer months.",
      
      "Eliminated de-icing risk calculations based solely on temperature thresholds. The system now provides de-icing information only when actual freezing precipitation is present, preventing misleading warnings on clear cold days. This change significantly reduces false positive alerts during winter months with good visibility.",
      
      "Implemented comprehensive checks for numeric zero values throughout the codebase. Fixed 13 instances where zero measurements (0m visibility, 0ft ceiling, 0°C temperature) were incorrectly treated as missing data. This fundamental fix ensures all edge cases in extreme weather are properly assessed.",
      
      "Added special handling for clouds at ground level (BKN000/OVC000). These conditions now trigger immediate Level 4 alerts with clear messaging about zero vertical visibility and suspended operations. The system recognizes this as distinct from low ceiling and applies appropriate emergency-level warnings."
    ]
  },
  {
    date: "2024-01-13",
    version: "0.3.2",
    changes: [
      "Enhanced snow monitoring with cumulative impact assessment. The system now tracks snowfall duration and accumulation, automatically increasing risk levels for prolonged snow events. Added airport recovery time predictions based on snowfall intensity and ground operations capacity.",
      
      "Integrated X/Twitter alerts via @KrkFlights. The system now automatically posts real-time weather alerts and important updates, keeping passengers informed through social media. Follow us at https://x.com/KrkFlights for instant updates!",
      
      "Improved data management with enhanced caching mechanisms. Optimized storage patterns for weather data and implemented more efficient data retrieval systems, resulting in faster load times and reduced server load."
    ]
  },
  {
    date: "2024-01-07",
    version: "0.3.1",
    changes: [
      "Integrated OpenMeteo as a secondary weather data source with intelligent data fusion. The system now combines TAF and OpenMeteo forecasts with weighted impact (0.8) to provide more comprehensive and accurate weather predictions.",

      "Standardized wind condition descriptions across all displays. Introduced consistent terminology for wind reporting: 'Strong Wind Gusts' (≥35kt), 'Strong Winds' (≥25kt), and 'Moderate Winds' (≥15kt). Enhanced weather risk assessment with more sophisticated precipitation analysis.",
     
      "Added detailed 'What to expect' sections throughout the interface to help passengers understand weather impacts. Implemented context-aware impact descriptions that explain how different weather conditions affect flight operations. Enhanced the visibility of operational impacts with intuitive icons and clear explanations.",
      
    ] 
  },
  {
    date: "2024-01-06",
    version: "0.3.0",
    changes: [
      "Major update focusing on EPKK-specific weather risk assessment. Implemented CAT I approach minimums for Kraków Airport, including automatic NO-FLY conditions detection for severe weather phenomena. The system now accounts for local geographical features and adjusts risk calculations based on seasonal patterns (October-February) and early morning conditions specific to Kraków's microclimate.",

      "Introduced comprehensive operational impact assessment with real-time delay predictions. The new de-icing prediction system provides estimated delay times ranging from 15 to 45 minutes based on current conditions. Added monitoring for ground operations status, including runway and taxiway clearing operations. The system now tracks Low Visibility Procedures (LVP) activation and provides warnings for single runway operations.",

      "Enhanced weather monitoring capabilities with new visibility trend tracking system. Implemented rapid change detection that alerts users to deteriorating conditions before they become critical. Weather phenomena descriptions are now more precise and include detailed explanations of their potential impact on flight operations.",

      "Significantly improved the forecast system to focus only on relevant future periods. The new early warning system provides advanced notice of approaching weather changes, while the enhanced risk scoring system now incorporates local factors for more accurate predictions. Delay estimations are now more precise, taking into account multiple contributing factors.",

      "Completely revamped the user interface to provide clearer guidance and recommendations. Status explanations are now more detailed and include specific actions passengers should take. Weather advisories have been enhanced to provide more actionable information, and operational impacts are now more prominently displayed for better decision-making."
    ]
  },
  {
    date: "2024-01-04",
    version: "0.2.0",
    changes: [
      "Added a complete guide to EU261 passenger rights with real examples. The guide now clearly explains what compensation you're entitled to based on your flight distance and delay time. We've also included practical tips on how to claim compensation and what documents you'll need.",

      "Made the airport info much more useful by adding all the important contact numbers and current operating hours. You can now quickly find emergency contacts, lost baggage office numbers, and available transport options. We've also included seasonal schedule changes so you know exactly when services are available.",

      "Streamlined the interface by removing the flight tabs to focus on what matters most - weather conditions and passenger rights. This makes the app faster and easier to use, helping you find important information when you need it.",

      "Built step-by-step guides for dealing with delays and cancellations. Each guide walks you through exactly what to do, what papers you need, and how long things typically take. No more guessing what to do when things go wrong.",

      "Completely rebuilt the mobile experience to work better on phones. Everything's easier to tap, loads faster on mobile networks, and you can now access key information even when your connection is spotty."
    ]
  },
  {
    date: "2024-12-24",
    version: "0.1.1",
    changes: [
      "Rebuilt our caching system from the ground up using the Cache API. It's now much smarter about storing and updating data, which means the app works better even with patchy internet. We've added fallbacks so you'll still get the information you need even if something goes wrong with the live data."
    ]
  },
  {
    date: "2024-12-16",
    version: "0.1.0",
    changes: [
      "Added a new departures board that shows real-time flight status, gate info, and estimated departure times. It works with all airlines operating at the airport and shows codeshare flights too.",

      "Built a smart caching system that keeps data for 10 minutes. It pre-loads frequently checked information and updates in the background, so everything feels faster and more responsive.",

      "Made the app much more reliable when the airport's API is having issues. It now tries again automatically if something fails, waiting longer between each try to avoid overwhelming the system.",

      "Added backup systems so you'll always see some flight information, even if the live data isn't available. We've also added checks to make sure all the data you see is accurate and up-to-date.",

      "Improved how we load flight data by showing up to 10 pages worth of flights. The app now loads this data efficiently and gets ready for what you might want to see next, making everything feel much smoother."
    ]
  },
  {
    date: "2024-12-16",
    version: "0.0.5",
    changes: [
      "Enhanced weather risk assessment system with detailed factor analysis. Implemented comprehensive weather impact scoring that considers multiple atmospheric conditions and their interactions. Added detailed explanations of how specific weather phenomena affect flight operations.",

      "Advanced impact visualization system for weather conditions. Developed intuitive indicators showing severity levels of different weather factors and their combined effects. Added trend analysis to show how conditions are likely to evolve and affect flight operations."
    ]
  },
  {
    date: "2024-12-12",
    version: "0.0.4",
    changes: [
      "Optimized forecast visualization with improved placement and accessibility. Restructured the forecast display to provide better at-a-glance information while maintaining detailed data access. Enhanced the interface with better contrast and readability improvements.",

      "Comprehensive usability enhancements across the platform. Implemented user feedback-driven improvements including better navigation flow, clearer status indicators, and more intuitive controls. Added keyboard shortcuts and screen reader support for better accessibility."
    ]
  },
  {
    date: "2024-12-11",
    version: "0.0.3",
    changes: [
      "Comprehensive flight monitoring system implementation. Introduced real-time statistics tracking for flight disruptions, including detailed analysis of cancellations, diversions, and delays. Added historical trend analysis for better prediction of potential disruptions.",

      "Advanced flight information display system. Developed detailed flight cards showing comprehensive information including aircraft type, estimated delays, and connection impacts. Added smart sorting to prioritize display of most affected flights.",

      "Mobile-first design enhancement focusing on responsive experience. Implemented adaptive layouts that optimize for different screen sizes and orientations. Added touch-friendly controls and gesture support for common actions."
    ]
  },
  {
    date: "2024-12-10",
    version: "0.0.2",
    changes: [
      "Advanced weather risk calculation engine with multi-factor analysis. Implemented sophisticated scoring system that weighs multiple weather parameters and their interactions. Added support for temporal variations in risk assessment.",

      "Expanded weather phenomena coverage with enhanced detection. Added support for complex weather patterns including wind shear, microbursts, and various precipitation types. Implemented better classification of weather severity levels.",

      "Improved handling of dynamic weather conditions. Developed system for tracking and analyzing temporary weather changes and their operational impacts. Added support for rapid update cycle during volatile weather conditions.",

      "Enhanced forecast accuracy with probabilistic analysis. Implemented sophisticated probability calculations for various weather phenomena. Added confidence levels to forecasts based on historical accuracy and current conditions.",

      "Specialized freezing precipitation analysis system. Developed dedicated assessment module for freezing precipitation risks including drizzle, rain, and mixed precipitation. Added impact prediction for ground operations and de-icing requirements."
    ]
  },
  {
    date: "2024-12-09",
    version: "0.0.1",
    changes: [
      "Initial platform launch with core weather monitoring capabilities. Implemented basic weather information display system with support for current conditions and basic forecasts. Established foundation for future weather analysis features.",

      "Essential aviation weather data integration. Implemented METAR and TAF data processing with basic interpretation and display capabilities. Added initial support for standard aviation weather codes and formats.",

      "Basic user interface implementation with essential features. Developed clean, functional interface for accessing weather information and basic flight data. Established core design patterns for future feature expansion."
    ]
  }
];





function getVersionIcon(version: string) {
  if (version.endsWith('.0.0')) {
    return <PartyPopper className="w-6 h-6 text-blue-500" />;
  } else if (version.endsWith('.0')) {
    return <Rocket className="w-6 h-6 text-green-500" />;
  }
  return <GitMerge className="w-6 h-6 text-gray-500" />;
}

function getVersionClasses(version: string) {
  if (version.endsWith('.0.0')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (version.endsWith('.0')) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export function Changelog() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold text-slate-900">Changelog</h2>
      <div className="space-y-8">
        {changelog.map((entry, index) => (
          <div key={index} className="relative pl-12">
            {/* Timeline line */}
            {index !== changelog.length - 1}
            
            {/* Timeline icon */}
<div className="absolute left-4 top-0 transform -translate-x-1/2 bg-white p-1">
  {getVersionIcon(entry.version || '0.0.0')}
</div>

            <div>
              {/* Version and date header */}
              <div className="flex items-baseline gap-3 mb-3">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-sm font-medium border ${getVersionClasses(entry.version || '0.0.0')}`}>
                  v{entry.version}
                </span>
                <span className="text-sm text-gray-500">{entry.date}</span>
              </div>

              {/* Changes list */}
              <ul className="space-y-2">
                {entry.changes.map((change, changeIndex) => (
                  <li 
                    key={changeIndex}
                    className="flex items-start gap-2 text-gray-700 leading-relaxed"
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
