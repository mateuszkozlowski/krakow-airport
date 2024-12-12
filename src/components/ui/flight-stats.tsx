import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlightStats, AffectedFlight, FlightStatus } from "@/lib/types/flight";
import { AlertTriangle, Plane, PlaneLanding, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface FlightStatsDisplayProps {
  stats: FlightStats;
  error?: string;
}

export function FlightStatsDisplay({ stats, error }: FlightStatsDisplayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFlights, setFilteredFlights] = useState<{
    departures: AffectedFlight[];
    arrivals: AffectedFlight[];
  }>({ departures: [], arrivals: [] });

  useEffect(() => {
    const filtered = {
      departures: stats.affectedFlights.departures.filter((flight) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          flight.flightNumber.toLowerCase().includes(searchLower) ||
          flight.airline.toLowerCase().includes(searchLower) ||
          (flight.destination?.toLowerCase() || '').includes(searchLower)
        );
      }),
      arrivals: stats.affectedFlights.arrivals.filter((flight) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          flight.flightNumber.toLowerCase().includes(searchLower) ||
          flight.airline.toLowerCase().includes(searchLower) ||
          (flight.origin?.toLowerCase() || '').includes(searchLower)
        );
      })
    };
    setFilteredFlights(filtered);
  }, [searchQuery, stats.affectedFlights]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load flight data</AlertDescription>
      </Alert>
    );
  }

  const StatusBadge = ({ status, delayMinutes }: { status: FlightStatus; delayMinutes?: number }) => {
    const variants: Record<FlightStatus, string> = {
      'CANCELLED': 'bg-red-100 text-red-800',
      'DIVERTED': 'bg-yellow-100 text-yellow-800',
      'DELAYED': 'bg-orange-100 text-orange-800',
      'ON TIME': 'bg-green-100 text-green-800',
      'DEPARTED': 'bg-blue-100 text-blue-800',
      'DEPARTED_WITH_DELAY': 'bg-orange-100 text-orange-800'
    };

    const displayStatus = status === 'DEPARTED_WITH_DELAY' ? 'Departed with delay' : status;

    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="secondary" className={variants[status]}>
          {displayStatus}
        </Badge>
        {delayMinutes && (
          <span className="text-xs text-gray-500">
            Delay: {delayMinutes} min
          </span>
        )}
      </div>
    );
  };

  const renderFlightList = (flights: AffectedFlight[], type: 'departures' | 'arrivals') => {
    if (flights.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Search className="h-12 w-12 mb-2" />
          <p>No {type} found</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-2">
          {flights.map((flight) => {
            const flightScheduledTime = new Date(flight.scheduledTime).getTime();
            const currentTime = new Date().getTime();
            let flightStatus = flight.status;

            if (flightScheduledTime < currentTime && !['CANCELLED', 'DIVERTED'].includes(flight.status)) {
              flightStatus = flight.delayMinutes ? 'DEPARTED_WITH_DELAY' : 'DEPARTED';
            }

            return (
              <Card key={flight.flightNumber} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{flight.flightNumber}</span>
                        <span className="text-sm text-gray-500">{flight.airline}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {type === 'departures' ? (
                          <>To: {flight.destination}</>
                        ) : (
                          <>From: {flight.origin}</>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        Scheduled: {new Date(flight.scheduledTime).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Warsaw',
                        })}
                      </div>
                    </div>
                    <StatusBadge status={flightStatus as FlightStatus} delayMinutes={flight.delayMinutes} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Flight Status</CardTitle>
        <CardDescription>Real-time flight information for Kraków Airport</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-700">{stats.cancelled}</div>
              <div className="text-red-600">Cancelled</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-700">{stats.diverted}</div>
              <div className="text-yellow-600">Diverted</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-700">{stats.delayed}</div>
              <div className="text-orange-600">Delayed</div>
            </CardContent>
          </Card>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by flight number, airline, or destination/origin"
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="departures" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="departures" className="flex-1">
              <Plane className="h-4 w-4 mr-2" />
              Departures ({filteredFlights.departures.length})
            </TabsTrigger>
            <TabsTrigger value="arrivals" className="flex-1">
              <PlaneLanding className="h-4 w-4 mr-2" />
              Arrivals ({filteredFlights.arrivals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departures">
            {renderFlightList(filteredFlights.departures, 'departures')}
          </TabsContent>

          <TabsContent value="arrivals">
            {renderFlightList(filteredFlights.arrivals, 'arrivals')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}