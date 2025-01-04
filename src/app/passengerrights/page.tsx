// src/app/passengerrights/page.tsx
import { Alert } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PassengerRights } from "@/components/PassengerRights";

const PassengerRightsPage = () => {
    return (
        <div className="min-h-screen">
            <div 
                className="bg-[#1a1f36] bg-cover bg-center" 
                style={{ backgroundImage: "url('/background.png')" }}
            >
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                    <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
                        <Link
                            href="/"
                            className="text-sm flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Airport Info
                        </Link>
                    </div>
                </Alert>

                <div className="max-w-4xl mx-auto px-6 pb-16">
                    <h1 className="text-2xl md:text-4xl font-bold mt-24 mb-2 md:mb-4 text-white">
                        Delayed Flight? We're Here to Help
                    </h1>
                    <div className="text-xl md:text-3xl mb-8 text-white/80">
                        Find out what support is available and where to get immediate assistance at Kraków Airport
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pb-8">
                <PassengerRights />
            </div>

            <footer className="border-t border-slate-200 py-4">
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-900">
                    <p>
                        This application is not an official Krakow Airport service. It is intended for informational purposes only and should not be used as the sole source for flight planning or decision-making. Always check with official sources and your airline for the most accurate and up-to-date information.
                    </p>
                </div>
                <div className="max-w-4xl mx-auto border-t border-slate-200 my-4"></div>
                <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-900">
                    <div>Built by Mateusz Kozłowski</div>
                    <div className="flex gap-4">
                        <a href="/changelog" className="hover:text-slate-600">
                            Changelog
                        </a>
                        <a href="mailto:mateusz.kozlowski@gmail.com" className="hover:text-slate-600">
                            Email
                        </a>
                        <a href="https://mateuszkozlowski.xyz/" className="hover:text-slate-600">
                            WWW
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PassengerRightsPage;