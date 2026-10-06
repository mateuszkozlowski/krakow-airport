"use client";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { translatedPath } from "@/lib/routes";
export function LanguageLinks() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname() ?? `/${language}`;
  return (
    <nav aria-label={language === "pl" ? "Język" : "Language"}>
      {(["pl", "en"] as const).map((locale) => (
        <a
          key={locale}
          href={translatedPath(pathname, language, locale)}
          hrefLang={locale}
          aria-current={language === locale ? "page" : undefined}
          onClick={(e) => {
            e.preventDefault();
            setLanguage(locale);
          }}
        >
          {locale.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
