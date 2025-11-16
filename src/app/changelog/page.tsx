// src/app/changelog/page.tsx
'use client';

import { Alert } from "@/components/ui/alert";
import { Changelog } from "@/components/Changelog";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Page() {
    const { language } = useLanguage();
    const t = translations[language];

    return (
        <div className="min-h-screen">
            <div className="bg-[#1a1f36]">
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                    <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
                        <Link
                            href="/"
                            className="text-sm flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            {t.backToApp}
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
                    <h1 className="text-3xl font-bold mt-16 mb-4 text-white">{t.changelogTitle}</h1>
                    <div className="text-xl mb-8 text-white/80">{t.changelogSubtitle}</div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pb-8">
                <Changelog />
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-200 py-6 bg-white">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="text-sm text-slate-700">{t.builtBy}</div>
                        <div className="flex flex-wrap gap-4">
                            <a href="/changelog" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                                {t.changelog}
                            </a>
                            <a href="mailto:mateusz.kozlowski@gmail.com" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                                {t.email}
                            </a>
                            <a href="https://mateuszkozlowski.xyz/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                                {t.website}
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}