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
    date: "2024-01-04",
    version: "0.2.0",
    changes: [
      "Added comprehensive passenger rights guide with detailed EU261 information",
      "Improved airport information with detailed contact details and operational hours",
      "Removed flight tabs to focus on weather and passenger rights",
      "Added step-by-step guidance for delayed/cancelled flight situations",
      "Enhanced mobile responsiveness and user experience"
    ]
  },
  {
    date: "2024-12-24",
    version: "0.1.1",
    changes: [
      "Improved chaching with using external Cache API"
    ]
  },
  {
    date: "2024-12-16",
    version: "0.1.0",
    changes: [
      "Added departures tab to track outbound flights",
      "Implemented in-memory cache system with 10-minute TTL",
      "Added automatic retries for API failures with exponential backoff",
      "Enhanced error handling with fallback to cached data",
      "Improved data loading with better pagination (up to 10 pages)"
    ]
  },
{
    date: "2024-12-16",
    version: "0.0.6",
    changes: [
      "Added Departures tab to track outbound flights",
      "Improved error handling with automatic retries",
      "Enhanced flight data loading with better pagination",
      "Updated UI for better visibility of flight status"
    ]
  }, {
    date: "2024-12-16",
    version: "0.0.5",
    changes: [
      "Enhanced risk level explanation with detailed weather factors that affect flight conditions",
      "Added weather impact indicators to help users understand why certain risk levels are shown"
    ]
  }, {
    date: "2024-12-12",
    version: "0.0.4",
    changes: [
      "Changed forecast placement",
"Some usability improvements",
    ]
  },   {
    date: "2024-12-11",
    version: "0.0.3",
    changes: [
      "Added real-time flight statistics (cancelled, diverted, and delayed flights)",
"Added list of affected flights with detailed flight information",
"Enhanced mobile experience with responsive design",
    ]
  },  {
    date: "2024-12-10",
    version: "0.0.2",
    changes: [
      "Improved weather risk calculation system with weighted scores",
      "Added support for more weather phenomena",
      "Better handling of temporary weather changes",
      "Added probability information for weather forecasts",
      "Fixed issues with freezing drizzle risk assessment"
    ]
  },
  {
    date: "2024-12-09",
    version: "0.0.1",
    changes: [
      "Initial release",
      "Basic weather information display",
      "Support for METAR and TAF data"
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
