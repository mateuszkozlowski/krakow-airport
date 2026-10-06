import type { Metadata } from "next";
import type { Locale } from "./weather/model";
export const site = "https://www.krk.flights";
export function seo(
  locale: Locale,
  title: string,
  description: string,
  paths: { pl: string; en: string },
  imageTopic?: "transport",
): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: `${site}${paths[locale]}`,
      languages: {
        "pl-PL": `${site}${paths.pl}`,
        "en-GB": `${site}${paths.en}`,
        "x-default": `${site}${paths.pl}`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "pl" ? "pl_PL" : "en_GB",
      title,
      description,
      url: `${site}${paths[locale]}`,
      images: [
        {
          url: `${site}/api/og?lang=${locale}${imageTopic ? "&topic=" + imageTopic : ""}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        `${site}/api/og?lang=${locale}${imageTopic ? "&topic=" + imageTopic : ""}`,
      ],
    },
  };
}
