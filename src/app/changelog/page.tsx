// src/app/changelog/page.tsx
import { Alert } from "@/components/ui/alert";
import { Changelog } from "@/components/Changelog";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog & Updates',
};

export default function Page() {
    return (
        <div className="min-h-screen">
            <div className="bg-[#1a1f36]">
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                    <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
                    
                        <Link
                            href="/"
                            className="text-sm flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to App
                        </Link>
                    </div>
                </Alert>

                <div className="max-w-4xl mx-auto px-6 pb-16">
                    <h1 className="text-3xl font-bold mt-16 mb-4 text-white">What&apos;s New?</h1>

                    <div className="text-xl mb-8 text-white/80">Keep track of changes and improvements.</div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 pb-8">
                <Changelog />
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