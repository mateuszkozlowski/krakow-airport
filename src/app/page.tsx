import { getAirportWeather } from "@/lib/weather"; // Make sure this path matches your file structure
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Footer from "@/components/footer";

export default async function AirportStatus() {
    const weather = await getAirportWeather();

    return (
        <div className="min-h-screen">
            {/* Top section with dark background */}
            <div className="bg-[#1a1f36]">
                {/* Alert banner */}
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
 <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
   <p className="text-sm">
     This is not an official Kraków Airport page. For official information, visit{" "}
     <a href="https://krakowairport.pl" className="underline">krakowairport.pl</a>
   </p>
   {weather?.current && (
     <p className="text-sm text-white/60">
       Last update: {new Date(weather.current.observed).toLocaleTimeString('en-GB', { 
         hour: '2-digit',
         minute: '2-digit',
         timeZone: 'Europe/Warsaw'
       })}
     </p>
   )}
 </div>
</Alert>

                {/* Main content */}
                <div className="max-w-4xl mx-auto px-6 pb-32">
                    <h1 className="text-5xl font-bold mt-32 mb-4 text-white">
                        Will I fly today from Krakow?
                    </h1>
                    
                    {weather?.current && (
                        <>
                            <p className="text-3xl mb-8 text-white/80">
                                {weather.current.riskLevel.level === 3
                                    ? "I don't think so. Have you heard about Katowice or Rzeszów?"
                                    : weather.current.riskLevel.level === 2
                                    ? "Maybe yes, maybe not. Be prepared for some delays."
                                    : "I would say so."}
                            </p>

                            {/* Status alert */}
                            <div className={`p-4 rounded-lg ${
                                weather.current.riskLevel.level === 3 
                                    ? 'bg-red-500/10' 
                                    : weather.current.riskLevel.level === 2 
                                    ? 'bg-orange-500/10'
                                    : 'bg-emerald-500/10'
                            }`}>
                                <div className="flex gap-3">
                                    {weather.current.riskLevel.level === 1 ? (
                                        <CheckCircle2 className={`h-5 w-5 ${
                                            weather.current.riskLevel.level === 1 ? 'text-emerald-400' : ''
                                        }`} />
                                    ) : (
                                        <AlertTriangle className={`h-5 w-5 ${
                                            weather.current.riskLevel.level === 3 
                                                ? 'text-red-400' 
                                                : 'text-orange-400'
                                        }`} />
                                    )}
                                    <div>
                                        <div className={`font-medium ${
                                            weather.current.riskLevel.level === 3 
                                                ? 'text-red-400' 
                                                : weather.current.riskLevel.level === 2 
                                                ? 'text-orange-400'
                                                : 'text-emerald-400'
                                        }`}>
                                            {weather.current.riskLevel.level === 1 
                                                ? 'No weather-related disruptions expected'
                                                : weather.current.riskLevel.title}
                                        </div>
                                        <div className="text-white/80">
                                            {weather.current.riskLevel.level === 1 
                                                ? 'Weather conditions are looking good'
                                                : weather.current.riskLevel.message}
                                        </div>
                                        {weather.current.conditions.phenomena?.length > 0 && (
                                            <div className="flex gap-2 flex-wrap mt-3">
                                                {weather.current.conditions.phenomena.map((phenomenon, index) => (
                                                    <span key={index} className="bg-white/10 px-3 py-1 rounded-full text-sm text-white">
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

            {/* Bottom section with forecast */}
            <div className="max-w-4xl mx-auto px-6 -mt-16 pb-8">
                <h2 className="text-lg text-white mb-4">
                    Forecast for changes expected in next 24 hours
                </h2>
                
                <div className="space-y-3">
                    {weather?.forecast?.map((period, index) => (
                        <Card key={index} className="bg-white shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-500">
                                        {period.timeDescription}
                                    </span>
                                    {period.changeType === "TEMPO" && (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                            Temporary Changes
                                        </span>
                                    )}
                                    <span className={`px-2 py-1 rounded-full text-sm ${
                                        period.riskLevel.level === 3 
                                            ? 'bg-red-100 text-red-800'
                                            : period.riskLevel.level === 2 
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                        {period.riskLevel.level === 1 
                                            ? 'No disruptions expected'
                                            : period.riskLevel.title}
                                    </span>
                                </div>

                                <div className="space-y-3 text-sm text-slate-600">
                                    {period.conditions.phenomena?.length > 0 && (
                                        <div className="flex gap-2 flex-wrap">
                                            {period.conditions.phenomena.map((phenomenon, idx) => (
                                                <span key={idx} className="bg-slate-100 px-3 py-1 rounded-full">
                                                    {phenomenon}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        {period.conditions.wind && (
                                            <div>Wind: {period.conditions.wind}</div>
                                        )}
                                        {period.conditions.visibility && (
                                            <div>Visibility: {period.conditions.visibility}</div>
                                        )}
                                        {period.conditions.clouds && (
                                            <div className="col-span-2">Clouds: {period.conditions.clouds}</div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 max-w-4xl mx-auto px-6">
 <Card className="bg-white">
   <CardContent className="p-6">
     <h3 className="font-semibold mb-2">How we get our data?</h3>
     <p className="text-slate-600 mb-4">We combine data from three reliable sources:</p>
     <ul className="text-slate-600 space-y-2">
       <li>Official METAR reports (the stuff pilots actually use)</li>
       <li>TAF forecasts (fancy airport weather predictions)</li>
     </ul>
   </CardContent>
 </Card>

 <Card className="bg-white">
   <CardContent className="p-6">
     <h3 className="font-semibold mb-2">Important notice</h3>
     <p className="text-slate-600 mb-4">
       While we try our best to provide accurate information, we're not meteorologists, air traffic controllers, or fortune tellers.
     </p>
     <p className="text-slate-600">
       Always check with your airline for the final word on your flight status. They're the ones with the actual planes, after all!
     </p>
   </CardContent>
 </Card>
</div>
            <Footer />
        </div>
    );
}