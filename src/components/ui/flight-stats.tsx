import { Card, CardContent } from "@/components/ui/card";
import { FlightStats, AffectedFlight } from "@/lib/types/flight";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface FlightStatsDisplayProps {
  stats: FlightStats;
  error?: string;
}

export function FlightStatsDisplay({ stats, error }: FlightStatsDisplayProps) {
  if (error) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load flight data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAffectedFlights = stats.affectedFlights.length > 0;
  const hasHighDelays = stats.delayed > 8;
  const hasHighCancellations = stats.cancelled >= 3;
  const hasHighDiversions = stats.diverted > 3;

  return (
    <Card className="bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${hasHighCancellations ? 'bg-red-100' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-700">{stats.cancelled}</div>
              {hasHighCancellations && <AlertCircle className="h-5 w-5 text-red-600" />}
            </div>
            <div className="text-red-600">
              {hasHighCancellations ? 'High number of cancellations' : 'Cancelled'}
            </div>
          </div>
          <div className={`p-4 rounded-lg ${hasHighDiversions ? 'bg-yellow-100' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-yellow-700">{stats.diverted}</div>
              {hasHighDiversions && <AlertCircle className="h-5 w-5 text-yellow-600" />}
            </div>
            <div className="text-yellow-600">
              {hasHighDiversions ? 'High number of diversions' : 'Diverted'}
            </div>
          </div>
          <div className={`p-4 rounded-lg ${hasHighDelays ? 'bg-orange-100' : 'bg-orange-50'}`}>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-orange-700">{stats.delayed}</div>
              {hasHighDelays && <AlertCircle className="h-5 w-5 text-orange-600" />}
            </div>
            <div className="text-orange-600">
              {hasHighDelays ? 'High number of delays' : 'Delayed'}
            </div>
          </div>
        </div>
        
        {!hasAffectedFlights && (
          <div className="text-center text-gray-500 py-4">
            No affected flights at the moment
          </div>
        )}

        {hasAffectedFlights && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Affected arrivals in last 6 hours
            </h3>
            <div className="space-y-2 max-h-[calc(5.7*4rem)] overflow-y-auto">
              {stats.affectedFlights.map((flight: AffectedFlight) => (
                <div key={flight.flightNumber} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{flight.flightNumber}</span>
                        <span className="text-sm text-gray-500">
                          {flight.airline}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        From: {flight.origin}
                      </div>
                      <div className="text-sm text-gray-600">
                        Scheduled: {new Date(flight.scheduledTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Warsaw'
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                                              <span className={`px-3 py-1 rounded-full text-sm ${
                        flight.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        flight.status === 'DIVERTED' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {flight.status.charAt(0).toUpperCase() + flight.status.slice(1).toLowerCase()}
                      </span>
                      {flight.status === 'DIVERTED' && flight.divertedTo && (
                        <span className="text-sm text-yellow-700">
                          Diverted to: {flight.divertedTo}
                        </span>
                      )}
                      {flight.delayMinutes && (
                        <span className="text-sm text-gray-500">
                          Delay: {flight.delayMinutes} min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}