import { after } from "next/server";
import { readFeeds, refreshFeeds } from "@/lib/transport/feeds";
import { planJourney } from "@/lib/transport/engine";
import { parseQuery } from "@/lib/transport/query";
import { getRealtime } from "@/lib/transport/realtime";
import { getConnectionWeather } from "@/lib/transport/weather-service";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (request.url.length > 2500)
    return Response.json({ error: "Query too long" }, { status: 400 });
  const params = new URL(request.url).searchParams;
  const query = parseQuery(Object.fromEntries(params));
  const now = new Date();
  const [feeds, weather] = await Promise.all([
    readFeeds(),
    getConnectionWeather(query, now),
  ]);
  after(async () => {
    await refreshFeeds();
  });
  const realtime =
    params.get("live") === "1" &&
    Math.abs(Date.parse(query.date + "T12:00Z") - now.getTime()) < 2 * 86400000
      ? await getRealtime(feeds)
      : undefined;
  return Response.json(planJourney(feeds, query, realtime, now, weather), {
    headers: { "Cache-Control": "no-store" },
  });
}
