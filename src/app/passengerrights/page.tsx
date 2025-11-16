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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
                <Alert className="rounded-none border-0 bg-transparent">
                    <div className="max-w-6xl mx-auto w-full px-6 flex justify-between items-center">
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
                                className="inline-flex items-center justify-center rounded-md hover:bg-white/10 h-9 w-9 transition-colors"
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
            </div>

            {/* Hero Section */}
            <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
                <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4 text-white">
                    {t.pageTitle}
                </h1>
                <div className="text-xl md:text-2xl mb-8 text-slate-300">
                    {t.pageSubtitle}
                </div>
            </div>

            {/* Main Content */}
            <PassengerRights />

            {/* Footer */}
            <footer className="border-t border-slate-700 py-6 bg-black/20 mt-12">
                <div className="max-w-6xl mx-auto px-6">
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">{t.disclaimer}</p>
                    <div className="border-t border-slate-700 my-4"></div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="text-sm text-slate-500">{t.builtBy}</div>
                        <div className="flex flex-wrap gap-4">
                            <a href="/changelog" className="text-sm text-slate-400 hover:text-white transition-colors">
                                {t.changelog}
                            </a>
                            <a href="mailto:mateusz.kozlowski@gmail.com" className="text-sm text-slate-400 hover:text-white transition-colors">
                                {t.email}
                            </a>
                            <a href="https://mateuszkozlowski.xyz/" className="text-sm text-slate-400 hover:text-white transition-colors">
                                {t.website}
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PassengerRightsPage;