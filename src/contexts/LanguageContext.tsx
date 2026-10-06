"use client";
import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/weather/model";
import { translatedPath } from "@/lib/routes";
const Context = createContext<{
  language: Locale;
  setLanguage: (language: Locale) => void;
} | null>(null);
export function LanguageProvider({
  children,
  initial = "pl",
}: {
  children: React.ReactNode;
  initial?: Locale;
}) {
  const router = useRouter();
  useEffect(() => {
    document.documentElement.lang = initial;
  }, [initial]);
  function setLanguage(language: Locale) {
    router.push(
      `${translatedPath(window.location.pathname, initial, language)}${window.location.search}`,
    );
  }
  return (
    <Context.Provider value={{ language: initial, setLanguage }}>
      {children}
    </Context.Provider>
  );
}
export function useLanguage() {
  const value = useContext(Context);
  if (!value) throw new Error("LanguageProvider required");
  return value;
}
