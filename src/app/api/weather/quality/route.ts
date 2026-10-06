import { getQuality } from "@/lib/weather/history";
export async function GET() {
  return Response.json(await getQuality(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
