import { getWeather } from "@/lib/weather/service";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(await getWeather(), {
    headers: { "Cache-Control": "no-store" },
  });
}
