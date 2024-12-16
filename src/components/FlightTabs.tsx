import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { FlightStats } from "@/lib/types/flight";
import { AlertCircle } from "lucide-react";

interface FlightTabsProps {
    arrivalsStats: FlightStats;
    departuresStats: FlightStats;
}

export function FlightTabs({ arrivalsStats, departuresStats }: FlightTabsProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Flights Insights</h2>
            <Card className="bg-white shadow-sm">
                <CardContent className="p-6">
                    <Tabs defaultValue="arrivals" className="w-full">
                        <TabsList className="grid grid-cols-2 w-full mb-6 bg-slate-100">
                            <TabsTrigger 
                                value="arrivals" 
                                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm hover:bg-white/80 transition-colors"
                            >
                                Arrivals
                            </TabsTrigger>
                            <TabsTrigger 
                                value="departures" 
                                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm hover:bg-white/80 transition-colors"
                            >
                                Departures
                            </TabsTrigger>
                        </TabsList>
                    
                    <TabsContent value="arrivals" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className={`p-4 rounded-lg ${arrivalsStats.cancelled > 2 ? 'bg-red-100' : 'bg-red-50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-red-700">{arrivalsStats.cancelled}</div>
                                    {arrivalsStats.cancelled > 2 && <AlertCircle className="h-5 w-5 text-red-600" />}
                                </div>
                                <div className="text-red-600">Cancelled</div>
                            </div>
                            <div className={`p-4 rounded-lg ${arrivalsStats.diverted > 2 ? 'bg-yellow-100' : 'bg-yellow-50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-yellow-700">{arrivalsStats.diverted}</div>
                                    {arrivalsStats.diverted > 2 && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                                </div>
                                <div className="text-yellow-600">Diverted</div>
                            </div>
                            <div className={`p-4 rounded-lg ${arrivalsStats.delayed > 8 ? 'bg-orange-100' : 'bg-orange-50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-orange-700">{arrivalsStats.delayed}</div>
                                    {arrivalsStats.delayed > 8 && <AlertCircle className="h-5 w-5 text-orange-600" />}
                                </div>
                                <div className="text-orange-600">Delayed</div>
                            </div>
                        </div>
                        
                        {arrivalsStats.affectedFlights.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Affected arrivals in last 6 hours</h3>
                                <div className="space-y-2 h-[calc(5.7*4rem)] overflow-y-auto">
                                    {arrivalsStats.affectedFlights.map((flight) => (
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
                    </TabsContent>
                    
                    <TabsContent value="departures" className="mt-0">
                        {/* Similar content for departures */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className={`p-4 rounded-lg ${departuresStats.cancelled > 2 ? 'bg-red-100' : 'bg-red-50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-red-700">{departuresStats.cancelled}</div>
                                    {departuresStats.cancelled > 2 && <AlertCircle className="h-5 w-5 text-red-600" />}
                                </div>
                                <div className="text-red-600">Cancelled</div>
                            </div>
                            <div className={`p-4 rounded-lg ${departuresStats.diverted > 2 ? 'bg-yellow-100' : 'bg-yellow-50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-yellow-700">{departuresStats.diverted}</div>
                                    {departuresStats.diverted > 2 && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                                </div>
                                <div className="text-yellow-600">Diverted</div>
                            </div>
                            <div className={`p-4 rounded-lg ${departuresStats.delayed > 8 ? 'bg-orange-100' : 'bg-orange-50'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-orange-700">{departuresStats.delayed}</div>
                                    {departuresStats.delayed > 8 && <AlertCircle className="h-5 w-5 text-orange-600" />}
                                </div>
                                <div className="text-orange-600">Delayed</div>
                            </div>
                        </div>

                        {departuresStats.affectedFlights.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Affected departures in last 6 hours</h3>
                                <div className="space-y-2 h-[calc(5.7*4rem)] overflow-y-auto">
                                    {departuresStats.affectedFlights.map((flight) => (
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
                                                        To: {flight.origin}
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
                    </TabsContent>
                </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}