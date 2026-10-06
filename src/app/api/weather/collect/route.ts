import { timingSafeEqual } from "node:crypto";
import { getWeather } from "@/lib/weather/service";
import { collect } from "@/lib/weather/history";
import { sendNotifications } from "@/lib/weather/notifications";
import { publishWeather } from "@/lib/twitter";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return new Response(null, { status: 401 });
  try {
    const deadline = Date.now() + 45000;
    const snapshot = await getWeather();
    if (
      snapshot.sources.metar.state !== "fresh" &&
      snapshot.sources.taf.state !== "fresh"
    )
      return Response.json(
        { error: "No fresh aviation data" },
        { status: 503 },
      );
    await collect(snapshot);
    const notifications = await sendNotifications(snapshot, deadline);
    const publication = await publishWeather(snapshot);
    return Response.json(
      { collected: true, notifications, publication },
      {
        status: notifications.failed ? 503 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      { error: "Collection failed; retry later" },
      { status: 503 },
    );
  }
}
