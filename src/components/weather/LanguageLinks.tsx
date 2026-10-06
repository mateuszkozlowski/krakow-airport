"use client";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { slugs } from "@/lib/weather/copy";
export function LanguageLinks() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname() ?? `/${language}`;
  const slug = pathname.split("/")[2];
  const key = Object.entries(slugs[language]).find(
    ([, value]) => value === slug,
  )?.[0] as keyof typeof slugs.pl | undefined;
  return (
    <nav aria-label={language === "pl" ? "Język" : "Language"}>
      {(["pl", "en"] as const).map((locale) => (
        <a
          key={locale}
          href={`/${locale}${key ? "/" + slugs[locale][key] : ""}`}
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
