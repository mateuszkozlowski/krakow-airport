// src/components/Changelog.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChangelogEntry {
  date: string;
  version?: string;
  changes: string[];
}

const changelog: ChangelogEntry[] = [
    {
    date: "2024-12-16",
    version: "0.0.5",
    changes: [
      "Changes in the current conditions display. Now users are aware what impacted on the risk calculation.",
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

export function Changelog() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4 text-white">Changelog</h2>
      <div className="space-y-4">
        {changelog.map((entry, index) => (
          <Card key={index} className="bg-white">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  {entry.version && (
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-sm mr-2">
                      v{entry.version}
                    </span>
                  )}
                  <span className="text-slate-500 text-sm">{entry.date}</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                {entry.changes.map((change, changeIndex) => (
                  <li key={changeIndex} className="text-slate-600">
                    {change}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}