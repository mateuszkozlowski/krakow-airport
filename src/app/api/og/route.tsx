import { ImageResponse } from "next/og";
import { getWeather } from "@/lib/weather/service";
import { levelLabel, text } from "@/lib/weather/copy";
import { formatTime } from "@/lib/weather/time";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const locale =
    new URL(request.url).searchParams.get("lang") === "en" ? "en" : "pl";
  const snapshot = await getWeather();
  const pl = locale === "pl";
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0c1525",
        color: "#eaf0f8",
        padding: "60px 70px",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", fontSize: 28, color: "#7de7d4" }}>
        KRK.flights · KRAKÓW BALICE
      </div>
      <div style={{ display: "flex", fontSize: 55, fontWeight: 700 }}>
        {text[locale].title}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 27,
          gap: 20,
        }}
      >
        <div style={{ display: "flex" }}>
          {pl ? "Przyloty" : "Arrivals"}:{" "}
          {levelLabel(snapshot.current.arrival.level, locale)}
        </div>
        <div style={{ display: "flex" }}>
          {pl ? "Odloty" : "Departures"}:{" "}
          {levelLabel(snapshot.current.departure.level, locale)}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 21, color: "#b8c9df" }}>
        {snapshot.observed
          ? `${pl ? "METAR z" : "METAR at"} ${formatTime(snapshot.observed.at, locale, true)} · Europe/Warsaw`
          : pl
            ? "Brak aktualnej obserwacji"
            : "No current observation"}{" "}
        ·{" "}
        {pl
          ? "Ocena pogody, nie status lotu"
          : "Weather guidance, not flight status"}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=180, s-maxage=180" },
    },
  );
}
