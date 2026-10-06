import { notFound } from "next/navigation";
import Link from "next/link";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { text, slugs } from "@/lib/weather/copy";
import { LanguageLinks } from "@/components/weather/LanguageLinks";
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "pl" && locale !== "en") notFound();
  const t = text[locale];
  return (
    <LanguageProvider initial={locale}>
      <div className="site-wrap">
        <a className="skip-link" href="#main">
          {locale === "pl" ? "Przejdź do treści" : "Skip to content"}
        </a>
        <header className="site-header">
          <Link className="brand" href={`/${locale}`}>
            <span className="brand-icon">↗</span> KRK<span>.flights</span>
          </Link>
          <LanguageLinks />
        </header>
        <main id="main">{children}</main>
        <footer>
          <nav>
            <Link href={`/${locale}/${slugs[locale].fog}`}>{t.fogGuide}</Link>
            <Link href={`/${locale}/${slugs[locale].methodology}`}>
              {t.methodology}
            </Link>
            <Link href={`/${locale}/${slugs[locale].accuracy}`}>
              {t.accuracy}
            </Link>
            <Link href={`/${locale}/${slugs[locale].rights}`}>{t.rights}</Link>
          </nav>
          <p>{t.footer}</p>
          <p>
            {locale === "pl" ? "Pomiar i prognoza:" : "Measurement and forecast:"}{" "}
            <a href="https://aviationweather.gov/data/api/">
              NOAA AviationWeather.gov
            </a>{" "}
            ·{" "}
            <a href="https://open-meteo.com/">
              {locale === "pl"
                ? "Dane pogodowe Open-Meteo"
                : "Weather data by Open-Meteo"}
            </a>{" "}
            · <a href="https://www.krakowairport.pl/">Kraków Airport</a>
          </p>
        </footer>
      </div>
    </LanguageProvider>
  );
}
