'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { ProcessedFlight } from '@/lib/types/flight';

interface FlightTabsProps {
  error?: string;
}

interface PaginationState {
  departures: {
    before: boolean;
    after: boolean;
  };
  arrivals: {
    before: boolean;
    after: boolean;
  };
}

export function FlightTabs({ error }: FlightTabsProps) {
  const [activeTab, setActiveTab] = useState('departures');
  const [searchQuery, setSearchQuery] = useState('');
  const [flights, setFlights] = useState<{ departures: ProcessedFlight[], arrivals: ProcessedFlight[] }>({
    departures: [],
    arrivals: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 2 * 60 * 60 * 1000), // Default to 2 hours ago
    end: new Date(Date.now() + 4 * 60 * 60 * 1000)    // Default to 4 hours ahead
  });

  // Track if we can load more in either direction
  const [canLoadMore, setCanLoadMore] = useState<PaginationState>({
    departures: { before: true, after: true },
    arrivals: { before: true, after: true }
  });

  const ITEMS_PER_PAGE = 5;
  const MAX_HISTORY_HOURS = 12;
  const MAX_FUTURE_HOURS = 12;

    useEffect(() => {
    fetchFlights();
  }, []);
    
  const fetchFlights = async (force = false, newTimeRange?: { start: Date; end: Date }) => {
    setIsLoading(true);
    setFetchError(null);
    
    try {
      const range = newTimeRange || timeRange;
      const startTime = range.start.toISOString().split('.')[0] + 'Z';
      const endTime = range.end.toISOString().split('.')[0] + 'Z';

      const [departuresRes, arrivalsRes] = await Promise.all([
        fetch(`/api/flights/departures?start=${startTime}&end=${endTime}`),
        fetch(`/api/flights/arrivals?start=${startTime}&end=${endTime}`)
      ]);

      if (!departuresRes.ok || !arrivalsRes.ok) {
        throw new Error('Failed to fetch flight data');
      }

      const [departuresData, arrivalsData] = await Promise.all([
        departuresRes.json(),
        arrivalsRes.json()
      ]);

      if (newTimeRange) {
        setTimeRange(newTimeRange);
        // Combine with existing flights, removing duplicates
        setFlights(prev => ({
          departures: [...new Map([...prev.departures, ...departuresData].map(f => [f.flightNumber, f])).values()],
          arrivals: [...new Map([...prev.arrivals, ...arrivalsData].map(f => [f.flightNumber, f])).values()]
        }));
      } else {
        setFlights({
          departures: departuresData,
          arrivals: arrivalsData
        });
      }

      // Update canLoadMore state based on the response
      const now = new Date();
      const minAllowedTime = new Date(now.getTime() - MAX_HISTORY_HOURS * 60 * 60 * 1000);
      const maxAllowedTime = new Date(now.getTime() + MAX_FUTURE_HOURS * 60 * 60 * 1000);

      setCanLoadMore({
        departures: {
          before: range.start > minAllowedTime && departuresData.length > 0,
          after: range.end < maxAllowedTime && departuresData.length > 0
        },
        arrivals: {
          before: range.start > minAllowedTime && arrivalsData.length > 0,
          after: range.end < maxAllowedTime && arrivalsData.length > 0
        }
      });
    } catch (error) {
      console.error('Error fetching flights:', error);
      setFetchError('Failed to load flight data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

 const loadMoreFlights = async (direction: 'earlier' | 'later', type: 'departures' | 'arrivals') => {
    if (isLoading) return;

    const currentFlights = flights[type];
    if (!currentFlights.length) {
      console.log('No current flights to base pagination on');
      return;
    }

    // Sort flights by time
    const sortedFlights = [...currentFlights].sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );

    let newStart, newEnd;
    const currentTime = new Date();

    if (direction === 'earlier') {
      const earliestFlight = sortedFlights[0];
      newEnd = new Date(earliestFlight.scheduledTime);
      newStart = new Date(newEnd.getTime() - 4 * 60 * 60 * 1000);

      // Check history limit
      const minAllowedTime = new Date(currentTime.getTime() - MAX_HISTORY_HOURS * 60 * 60 * 1000);
      if (newStart < minAllowedTime) {
        newStart = minAllowedTime;
      }
    } else {
      const latestFlight = sortedFlights[sortedFlights.length - 1];
      newStart = new Date(latestFlight.scheduledTime);
      newEnd = new Date(newStart.getTime() + 4 * 60 * 60 * 1000);

      // Check future limit
      const maxAllowedTime = new Date(currentTime.getTime() + MAX_FUTURE_HOURS * 60 * 60 * 1000);
      if (newEnd > maxAllowedTime) {
        newEnd = maxAllowedTime;
      }
    }

    console.log('Loading more flights:', {
      direction,
      type,
      newTimeRange: {
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      }
    });

    await fetchFlights(false, { start: newStart, end: newEnd });
  };



  // Format status text properly
  const formatStatus = (status: string) => {
    return status.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get status chip color
  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    if (normalizedStatus === 'CANCELLED') return 'bg-red-100 text-red-700';
    if (normalizedStatus === 'DIVERTED') return 'bg-yellow-100 text-yellow-700';
    if (normalizedStatus.includes('ON TIME') || normalizedStatus.includes('EN ROUTE')) {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-orange-100 text-orange-700';
  };
  const debugFlights = () => {
    console.log('Current data state:', {
      departures: {
        count: flights.departures.length,
        timeRange: flights.departures.map(f => new Date(f.scheduledTime).toISOString())
      },
      arrivals: {
        count: flights.arrivals.length,
        timeRange: flights.arrivals.map(f => new Date(f.scheduledTime).toISOString())
      }
    });
  };
  const getTimeForComparison = (flight: ProcessedFlight) => {
    const flightTime = new Date(flight.scheduledTime);
    return flightTime.getTime();
  };

  // Sort and filter flights
  const getFilteredAndSortedFlights = (type: 'departures' | 'arrivals') => {
    console.log(`Processing ${flights[type].length} ${type}`);
    
    const filtered = flights[type]
      .filter(flight => {
        // Apply search filter if exists
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          return flight.flightNumber.toLowerCase().includes(searchLower) ||
                 flight.airline.toLowerCase().includes(searchLower) ||
                 flight.destination.toLowerCase().includes(searchLower);
        }
        return true;
      })
      .sort((a, b) => {
        // Always sort chronologically (earliest first) for both arrivals and departures
        const timeA = new Date(a.scheduledTime).getTime();
        const timeB = new Date(b.scheduledTime).getTime();
        return timeA - timeB;
      });

    console.log(`Found ${filtered.length} flights after filtering/sorting`);
    return filtered;
  };

  // Create a function to get paginated flights
  const getPaginatedFlights = (type: 'departures' | 'arrivals') => {
    const sortedFlights = getFilteredAndSortedFlights(type);
    return sortedFlights.slice(0, ITEMS_PER_PAGE);
  };

  const FlightCard = ({ flight, type }: { flight: ProcessedFlight; type: 'departures' | 'arrivals' }) => (
    <div key={flight.flightNumber} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{flight.flightNumber}</span>
            <span className="text-sm text-gray-500">{flight.airline}</span>
          </div>
          <div className="text-sm text-gray-600">
            {type === 'departures' ? 'To: ' : 'From: '}{flight.destination}
          </div>
          <div className="text-sm text-gray-600">
            {new Date(flight.scheduledTime).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Warsaw',
            })}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(flight.status)}`}>
            {formatStatus(flight.status)}
          </span>
          {flight.delayMinutes && (
            <span className="text-sm text-gray-500">
              {flight.delayMinutes} min delay
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardContent className="p-6">
        <Tabs defaultValue="departures" className="w-full" onValueChange={setActiveTab}>
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <TabsList className="w-full bg-muted/50 grid grid-cols-2 p-1">
                <TabsTrigger 
                  value="departures"
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-medium px-8 py-2.5"
                >
                  Departures
                </TabsTrigger>
                <TabsTrigger 
                  value="arrivals"
                  className="flex-1 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm font-medium px-8 py-2.5"
                >
                  Arrivals
                </TabsTrigger>
              </TabsList>
              
              <Button 
                onClick={() => fetchFlights(true)}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by flight number, airline, or destination"
                className="flex-1"
              />
            </div>

            <TabsContent value="departures" className="mt-0">
              <div className="h-[400px] overflow-y-auto space-y-2 pr-2">
                {canLoadMore.departures.before && (
                  <Button 
                    variant="ghost" 
                    className="w-full hover:bg-blue-50"
                    onClick={() => loadMoreFlights('earlier', 'departures')}
                    disabled={isLoading}
                  >
                    Load earlier flights
                  </Button>
                )}

                {getFilteredAndSortedFlights('departures').map((flight) => (
                  <FlightCard key={flight.flightNumber} flight={flight} type="departures" />
                ))}

                {canLoadMore.departures.after && (
                  <Button 
                    variant="ghost" 
                    className="w-full hover:bg-blue-50"
                    onClick={() => loadMoreFlights('later', 'departures')}
                    disabled={isLoading}
                  >
                    Load later flights
                  </Button>
                )}

                {getFilteredAndSortedFlights('departures').length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No flights found
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="arrivals" className="mt-0">
              <div className="h-[400px] overflow-y-auto space-y-2 pr-2">
                {canLoadMore.arrivals.before && (
                  <Button 
                    variant="ghost" 
                    className="w-full hover:bg-blue-50"
                    onClick={() => loadMoreFlights('earlier', 'arrivals')}
                    disabled={isLoading}
                  >
                    Load earlier flights
                  </Button>
                )}

                {getFilteredAndSortedFlights('arrivals').map((flight) => (
                  <FlightCard key={flight.flightNumber} flight={flight} type="arrivals" />
                ))}

                {canLoadMore.arrivals.after && (
                  <Button 
                    variant="ghost" 
                    className="w-full hover:bg-blue-50"
                    onClick={() => loadMoreFlights('later', 'arrivals')}
                    disabled={isLoading}
                  >
                    Load later flights
                  </Button>
                )}

                {getFilteredAndSortedFlights('arrivals').length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No flights found
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}