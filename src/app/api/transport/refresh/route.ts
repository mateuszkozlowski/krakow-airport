import { timingSafeEqual } from "node:crypto";
import { refreshFeeds } from "@/lib/transport/feeds";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  const actual = Buffer.from(request.headers.get("authorization") ?? ""),
    expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return new Response(null, { status: 401 });
  const sources = await refreshFeeds(true);
  return Response.json(
    { sources },
    {
      status: sources.every((s) => s.refreshed) ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
