"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { transportKind, transportPath } from "@/lib/transport/paths";
import type { Locale } from "@/lib/weather/model";
export function SiteNavigation({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  const transport = !!transportKind(locale, pathname.split("/")[2]);
  return (
    <nav
      className="site-sections"
      aria-label={locale === "pl" ? "Sekcje strony" : "Site sections"}
    >
      <Link href={`/${locale}`} aria-current={!transport ? "page" : undefined}>
        {locale === "pl" ? "Pogoda" : "Weather"}
      </Link>
      <Link
        href={transportPath(locale)}
        aria-current={transport ? "page" : undefined}
      >
        {locale === "pl" ? "Dojazd" : "Transport"}
      </Link>
    </nav>
  );
}
