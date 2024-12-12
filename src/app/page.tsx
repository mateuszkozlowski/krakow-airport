// src/app/page.tsx
import { getAirportWeather } from "@/lib/weather";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getFlightStats } from "@/lib/flights";
import { FlightStatsDisplay } from "@/components/ui/flight-stats";
import HourlyForecast from "@/components/HourlyForecast";

export default async function Page() {
    const weather = await getAirportWeather();
    const flightStats = await getFlightStats();

    return (
        <div className="min-h-screen">
            {/* Top section with dark background */}
            <div className="bg-[#1a1f36]">
                {/* Alert banner */}
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                    <div className="max-w-4xl mx-auto w-full flex-wrap md:flex justify-between items-center">
                        <p className="text-sm">
                            This is not an official Kraków Airport page. For official information, visit{" "}
                            <a href="https://krakowairport.pl" className="underline">
                                krakowairport.pl
                            </a>
                        </p>
                        {weather?.current && (
                            <p className="text-sm text-white/60">
                                Last update:{" "}
                                {(() => {
                                    const date = new Date(weather.current.observed);
                                    date.setHours(date.getHours()); // Add one hour
                                    return date.toLocaleTimeString("en-GB", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "Europe/Warsaw"
                                    });
                                })()}
                            </p>
                        )}
                    </div>
                </Alert>

                {/* Main content */}
                <div className="max-w-4xl mx-auto px-6 pb-48">
                    <h1 className="text-5xl font-bold mt-36 mb-4 text-white">Will I fly today from Krakow?</h1>

                    {weather?.current && (
                        <>
                            <p className="text-2xl mb-8 text-white/80">
                                {weather.current.riskLevel.level === 3
                                    ? "It does not look promising. Your flight might be canceled or seriously delayed."
                                    : weather.current.riskLevel.level === 2
                                      ? "There is a chance, but be ready for possible delays."
                                      : "Yes, it looks like you are good to go!"}
                            </p>

                            {/* Status alert */}
                            <div
                                className={`p-4 rounded-lg ${
                                    weather.current.riskLevel.level === 3
                                        ? "bg-red-500/10"
                                        : weather.current.riskLevel.level === 2
                                          ? "bg-orange-500/10"
                                          : "bg-emerald-500/10"
                                }`}>
                                <div className="flex gap-3">
                                    {weather.current.riskLevel.level === 1 ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    ) : (
                                        <AlertTriangle
                                            className={`h-5 w-5 ${
                                                weather.current.riskLevel.level === 3
                                                    ? "text-red-400"
                                                    : "text-orange-400"
                                            }`}
                                        />
                                    )}
                                    <div>
                                        <div
                                            className={`font-medium ${
                                                weather.current.riskLevel.level === 3
                                                    ? "text-red-400"
                                                    : weather.current.riskLevel.level === 2
                                                      ? "text-orange-400"
                                                      : "text-emerald-400"
                                            }`}>
                                            {weather.current.riskLevel.level === 1
                                                ? "No weather-related disruptions expected"
                                                : weather.current.riskLevel.title}
                                        </div>
                                        <div className="text-white/80">
                                            {weather.current.riskLevel.level === 1
                                                ? "Weather conditions are looking good"
                                                : weather.current.riskLevel.message}
                                        </div>
                                        {weather.current.conditions.phenomena &&
                                            weather.current.conditions.phenomena.length > 0 && (
                                                <div className="flex gap-2 flex-wrap mt-3">
                                                    {weather.current.conditions.phenomena.map((phenomenon, index) => (
                                                        <span
                                                            key={index}
                                                            className="bg-white/10 px-3 py-1 rounded-full text-sm text-white">
                                                            {phenomenon}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto -mt-16 px-6 pb-8">
                <h2 className="text-xl font-semibold mb-4 text-white">Arrivals Insights</h2>
                <FlightStatsDisplay stats={flightStats} />
            </div>

            {/* Bottom section with forecast */}
            <div className="max-w-4xl mx-auto px-6 pb-8">
                {weather?.forecast && <HourlyForecast forecast={weather.forecast} />}
            </div>

            {/* Info cards section */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto px-6">
                <Card className="bg-white">
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-2">How we get our data?</h3>
                        <p className="text-slate-600 mb-4 text-sm">We combine data from three reliable sources:</p>
                        <ul className="text-slate-600 space-y-2 text-sm">
                            <li>- Official METAR reports (the stuff pilots actually use)</li>
                            <li>- TAF forecasts (fancy airport weather predictions)</li>
                            <li>- Flight status information provided by airlines to show you up-to-date stats</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="bg-white">
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-2">Important notice</h3>
                        <p className="text-slate-600 mb-4 text-sm">
                            While we try our best to provide accurate information, we are not meteorologists, air
                            traffic controllers, or fortune tellers.
                        </p>
                        <p className="text-slate-600 text-sm">
                            Always check with your airline for the final word on your flight status. They are the ones
                            with the actual planes, after all!
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <footer className="bottom-0 left-0 right-0 bg-white border-t py-4">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-600">
                    <div>Built by Mateusz Kozłowski.</div>
                    <div className="flex gap-4">
                        <a href="/changelog" className="hover:text-slate-900">
                            Changelog
                        </a>
                        <a href="mailto:mateusz.kozlowski@gmail.com" className="hover:text-slate-900">
                            Email
                        </a>
                        <a href="https://mateuszkozlowski.xyz/" className="hover:text-slate-900">
                            WWW
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}