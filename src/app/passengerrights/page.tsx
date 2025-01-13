// src/app/passengerrights/page.tsx
'use client';

import { Alert } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PassengerRights } from "@/components/PassengerRights";
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { LanguageSelector } from "@/components/LanguageSelector";

const PassengerRightsPage = () => {
    const { language } = useLanguage();
    const t = translations[language];

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
                            {t.backToAirportInfo}
                        </Link>
                        <div className="flex items-center gap-2">
                            <a 
                                href="https://x.com/KrkFlights"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium 
                                hover:bg-white/20 h-9 w-9 transition-colors"
                                aria-label="Twitter"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 fill-current text-white"
                                    aria-hidden="true"
                                >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                            <LanguageSelector />
                        </div>
                    </div>
                </Alert>

                <div className="max-w-4xl mx-auto px-6 pb-16">
                    <h1 className="text-2xl md:text-4xl font-bold mt-24 mb-2 md:mb-4 text-white">
                        {t.pageTitle}
                    </h1>
                    <div className="text-xl md:text-3xl mb-8 text-white/80">
                        {t.pageSubtitle}
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