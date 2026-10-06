import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { storage, hasStorage } from "@/lib/cache";
import { levelLabel } from "@/lib/weather/copy";
import type { Snapshot } from "@/lib/weather/model";
const endpoint = "https://api.twitter.com/2/tweets";
const encode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
// Legacy X integration is isolated from weather reads and opt-in on the cron.
export async function publishWeather(snapshot: Snapshot) {
  const key = process.env.TWITTER_API_KEY;
  const secret = process.env.TWITTER_API_SECRET;
  const token = process.env.TWITTER_ACCESS_TOKEN;
  const tokenSecret = process.env.TWITTER_ACCESS_SECRET;
  if (
    process.env.X_ALERTS_ENABLED !== "true" ||
    !key ||
    !secret ||
    !token ||
    !tokenSecret ||
    !hasStorage() ||
    snapshot.sources.metar.state !== "fresh"
  )
    return { enabled: false, published: false };
  const level = Math.max(
    snapshot.current.arrival.level ?? 0,
    snapshot.current.departure.level ?? 0,
  );
  if (!level) return { enabled: true, published: false };
  const previous = await storage<string | null>("GET", "krk:v2:x-level");
  if (
    String(level) === previous ||
    (level < 3 && (previous === null || Number(previous) < 3))
  )
    return { enabled: true, published: false };
  const monthKey = `krk:v2:x-month:${new Date().toISOString().slice(0, 7)}`;
  if (Number((await storage("GET", monthKey)) ?? 0) >= 90)
    return { enabled: true, published: false };
  if (!(await storage("SET", "krk:v2:x-lock", "1", "NX", "EX", 900)))
    return { enabled: true, published: false };
  const oauth: Record<string, string> = {
    oauth_consumer_key: key,
    oauth_token: token,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_version: "1.0",
  };
  const parameters = Object.entries(oauth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encode(k)}=${encode(v)}`)
    .join("&");
  oauth.oauth_signature = createHmac(
    "sha1",
    `${encode(secret)}&${encode(tokenSecret)}`,
  )
    .update(`POST&${encode(endpoint)}&${encode(parameters)}`)
    .digest("base64");
  const authorization =
    "OAuth " +
    Object.entries(oauth)
      .map(([k, v]) => `${encode(k)}="${encode(v)}"`)
      .join(", ");
  const message = `Kraków Balice · pogoda\nPrzyloty: ${levelLabel(snapshot.current.arrival.level, "pl")}\nOdloty: ${levelLabel(snapshot.current.departure.level, "pl")}\nOcena pogody, nie status lotów.\nhttps://www.krk.flights/pl`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: message }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("X publication failed");
  await storage("SET", "krk:v2:x-level", String(level));
  await storage("INCR", monthKey);
  await storage("EXPIRE", monthKey, 40 * 86400);
  return { enabled: true, published: true };
}
