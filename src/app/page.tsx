// src/app/page.tsx
import { getAirportWeather } from "@/lib/weather";
import { Alert } from "@/components/ui/alert";
import { getFlightStats } from "@/lib/flights";
import { FlightStatsDisplay } from "@/components/ui/flight-stats";
import WeatherTimeline from "@/components/WeatherTimeline";

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

                            <WeatherTimeline 
                                current={weather.current}
                                forecast={weather.forecast}
                                isLoading={false}
                                isError={false}
                                retry={() => {}}
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto -mt-16 px-6 pb-8">
                <h2 className="text-xl font-semibold mb-4 text-white">Flight Status</h2>
                <FlightStatsDisplay 
                    stats={flightStats || { 
                        delayed: 0, 
                        cancelled: 0, 
                        diverted: 0, 
                        onTime: 0, 
                        affectedFlights: [] 
                    }}
                />
            </div>

            {/* Info cards section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto px-6">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <h3 className="font-semibold mb-2 text-slate-200">How we get our data?</h3>
                    <p className="text-slate-400 mb-4 text-sm">We combine data from three reliable sources:</p>
                    <ul className="text-slate-400 space-y-2 text-sm">
                        <li>• Official METAR reports (the stuff pilots actually use)</li>
                        <li>• TAF forecasts (fancy airport weather predictions)</li>
                        <li>• Flight status information provided by airlines</li>
                    </ul>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <h3 className="font-semibold mb-2 text-slate-200">Important notice</h3>
                    <p className="text-slate-400 mb-4 text-sm">
                        While we try our best to provide accurate information, we are not meteorologists, air
                        traffic controllers, or fortune tellers.
                    </p>
                    <p className="text-slate-400 text-sm">
                        Always check with your airline for the final word on your flight status. They are the ones
                        with the actual planes, after all!
                    </p>
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-4">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-400">
                    <div>Built by Mateusz Kozłowski</div>
                    <div className="flex gap-4">
                        <a href="/changelog" className="hover:text-slate-200">
                            Changelog
                        </a>
                        <a href="mailto:mateusz.kozlowski@gmail.com" className="hover:text-slate-200">
                            Email
                        </a>
                        <a href="https://mateuszkozlowski.xyz/" className="hover:text-slate-200">
                            WWW
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}