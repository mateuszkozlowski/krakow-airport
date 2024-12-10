// src/app/changelog/page.tsx
import { Alert } from "@/components/ui/alert";
import { Changelog } from "@/components/Changelog";

export default function Page() {
    return (
        <div className="min-h-screen">
            <div className="bg-[#1a1f36]">
                <Alert className="rounded-none border-0 bg-white/10 backdrop-blur text-white">
                    <div className="max-w-4xl mx-auto w-full">
                        <p className="text-sm">
                            This is not an official Kraków Airport page. For official information, visit{" "}
                            <a href="https://krakowairport.pl" className="underline">
                                krakowairport.pl
                            </a>
                        </p>
                    </div>
                </Alert>

                <div className="max-w-4xl mx-auto px-6 pb-48">
                    <h1 className="text-5xl font-bold mt-36 mb-4 text-white">What&apos;s New?</h1>

                    <div className="text-2xl mb-8 text-white/80">Keep track of changes and improvements.</div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-16 pb-8">
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