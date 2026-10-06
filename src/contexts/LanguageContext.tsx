"use client";
import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/weather/model";
import { slugs } from "@/lib/weather/copy";
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
    const slug = window.location.pathname.split("/")[2];
    const key = Object.entries(slugs[initial]).find(
      ([, value]) => value === slug,
    )?.[0] as keyof typeof slugs.pl | undefined;
    router.push(
      `/${language}${key ? "/" + slugs[language][key] : ""}${window.location.search}`,
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
