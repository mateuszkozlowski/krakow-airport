import { readFeeds } from "@/lib/transport/feeds";
export const runtime = "nodejs";
export async function GET() {
  const feed = (await readFeeds()).find((f) => f.source === "coach")!;
  return Response.json(
    {
      attribution: "FlixMobility Tech GmbH / FlixBus",
      license: "ODbL-1.0",
      licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
      source: "https://gtfs.gis.flix.tech/gtfs_generic_eu.zip",
      description:
        "Filtered and normalized scheduled services serving Kraków Airport and selected regional stops. No real-time or seat-availability data.",
      feed,
    },
    {
      headers: {
        "Content-Disposition": "attachment; filename=krk-flixbus-odbl.json",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
