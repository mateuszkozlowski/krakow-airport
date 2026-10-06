import { notFound } from "next/navigation";
import { getWeather } from "@/lib/weather/service";
import { Dashboard } from "@/components/weather/Dashboard";
import { seo } from "@/lib/seo";
import { text } from "@/lib/weather/copy";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "pl" && locale !== "en") notFound();
  return seo(
    locale,
    locale === "pl"
      ? "Mgła Balice i pogoda na lotnisku Kraków"
      : "Kraków Airport fog and travel weather",
    text[locale].description,
    { pl: "/pl", en: "/en" },
  );
}
export default async function WeatherPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (locale !== "pl" && locale !== "en") notFound();
  const snapshot = await getWeather();
  const query = await searchParams;
  const at =
    typeof query.at === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/.test(
      query.at,
    ) &&
    Number.isFinite(Date.parse(query.at))
      ? new Date(query.at).toISOString()
      : null;
  const operation = query.operation === "arrival" ? "arrival" : "departure";
  return (
    <>
      <div className="hero">
        <h1>{text[locale].title}</h1>
      </div>
      <Dashboard
        key={`${locale}:${at ?? ""}`}
        initial={snapshot}
        locale={locale}
        initialTrip={{ at, operation }}
      />
    </>
  );
}
