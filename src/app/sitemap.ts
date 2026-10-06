import type { MetadataRoute } from "next";
import { site } from "@/lib/seo";
import { slugs } from "@/lib/weather/copy";
import { transportSlugs, transportPath } from "@/lib/transport/paths";
import { translatedPath } from "@/lib/routes";
export default function sitemap(): MetadataRoute.Sitemap {
  return (["pl", "en"] as const).flatMap((locale) =>
    [
      "",
      ...Object.values(slugs[locale]),
      ...Object.values(transportSlugs[locale]),
    ].map((slug) => {
      const path = `/${locale}${slug ? "/" + slug : ""}`;
      return {
        url: `${site}${path}`,
        changeFrequency:
          path === transportPath(locale)
            ? ("daily" as const)
            : slug
              ? ("monthly" as const)
              : ("hourly" as const),
        alternates: {
          languages: {
            "pl-PL": `${site}${translatedPath(path, locale, "pl")}`,
            "en-GB": `${site}${translatedPath(path, locale, "en")}`,
          },
        },
      };
    }),
  );
}
