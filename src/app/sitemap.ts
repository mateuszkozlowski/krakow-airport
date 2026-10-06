import type { MetadataRoute } from "next";
import { site } from "@/lib/seo";
import { slugs } from "@/lib/weather/copy";
export default function sitemap(): MetadataRoute.Sitemap {
  return (["pl", "en"] as const).flatMap((locale) =>
    ["", ...Object.values(slugs[locale])].map((slug) => {
      const key = Object.entries(slugs[locale]).find(
        ([, value]) => value === slug,
      )?.[0] as keyof typeof slugs.pl | undefined;
      return {
        url: `${site}/${locale}${slug ? "/" + slug : ""}`,
        changeFrequency: slug ? ("monthly" as const) : ("hourly" as const),
        alternates: {
          languages: {
            "pl-PL": `${site}/pl${key ? "/" + slugs.pl[key] : ""}`,
            "en-GB": `${site}/en${key ? "/" + slugs.en[key] : ""}`,
          },
        },
      };
    }),
  );
}
