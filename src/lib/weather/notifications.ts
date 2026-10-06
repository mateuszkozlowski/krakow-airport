import "server-only";
import webpush from "web-push";
import { createHash, randomBytes } from "node:crypto";
import { hasStorage, storage } from "@/lib/cache";
import { eveningBefore, formatTime } from "./time";
import { levelLabel } from "./copy";
import type { Locale, Operation, Snapshot } from "./model";
interface Subscription {
  id: string;
  token: string;
  at: string;
  operation: Operation;
  locale: Locale;
  subscription: webpush.PushSubscription;
  lastLevel: number | null;
}
const index = "krk:v2:subscriptions";
export const pushEnabled = () =>
  process.env.WEB_PUSH_ENABLED === "true" &&
  !!process.env.CRON_SECRET &&
  hasStorage();
async function vapid() {
  const stored = await storage<string | null>("GET", "krk:v2:vapid");
  if (stored)
    return JSON.parse(stored) as { publicKey: string; privateKey: string };
  const pair = webpush.generateVAPIDKeys();
  await storage("SET", "krk:v2:vapid", JSON.stringify(pair), "NX");
  return JSON.parse(
    await storage<string>("GET", "krk:v2:vapid"),
  ) as typeof pair;
}
export async function pushConfig() {
  return pushEnabled()
    ? { enabled: true, publicKey: (await vapid()).publicKey }
    : { enabled: false };
}
export async function rateLimit(ip: string) {
  const hash = createHash("sha256").update(ip).digest("hex").slice(0, 24);
  const key = `krk:v2:push-rate:${hash}:${Math.floor(Date.now() / 900000)}`;
  const count = await storage<number>("INCR", key);
  if (count === 1) await storage("EXPIRE", key, 1000);
  return count <= 20;
}
export async function deleteSubscription(id: string, token: string) {
  if (!/^[a-f0-9]{32}$/.test(id) || !/^[a-f0-9]{48}$/.test(token)) return false;
  const raw = await storage<string | null>("GET", `krk:v2:subscription:${id}`);
  if (!raw) return true;
  const item = JSON.parse(raw) as Subscription;
  if (item.token !== token) return false;
  await storage("DEL", `krk:v2:subscription:${id}`);
  await storage("ZREM", index, id);
  return true;
}
export async function subscribe(
  input: Omit<Subscription, "id" | "token" | "lastLevel">,
) {
  const id = randomBytes(16).toString("hex");
  const token = randomBytes(24).toString("hex");
  const row: Subscription = { ...input, id, token, lastLevel: null };
  const ttl = Math.ceil((Date.parse(input.at) - Date.now()) / 1000) + 3600;
  await storage("ZREMRANGEBYSCORE", index, "-inf", Date.now());
  if ((await storage<number>("ZCARD", index)) >= 2000)
    throw new Error("Subscription capacity reached");
  await storage(
    "SET",
    `krk:v2:subscription:${id}`,
    JSON.stringify(row),
    "EX",
    ttl,
  );
  await storage("ZADD", index, Date.parse(input.at), id);
  return { id, token };
}
export async function sendNotifications(
  snapshot: Snapshot,
  deadline = Date.now() + 45000,
) {
  if (!pushEnabled())
    return { sent: 0, failed: 0, disabled: true, deferred: 0 };
  const pair = await vapid();
  webpush.setVapidDetails(
    "https://www.krk.flights",
    pair.publicKey,
    pair.privateKey,
  );
  await storage("ZREMRANGEBYSCORE", index, "-inf", Date.now());
  const ids = await storage<string[]>("ZRANGE", index, 0, -1);
  const savedCursor = Number(
    (await storage<string | null>("GET", "krk:v2:push-cursor")) ?? 0,
  );
  const start =
    ids.length && Number.isInteger(savedCursor) && savedCursor >= 0
      ? savedCursor % ids.length
      : 0;
  const ordered = [...ids.slice(start), ...ids.slice(0, start)];
  let sent = 0;
  let failed = 0;
  let visited = 0;
  // Small batches protect cron duration and provider capacity.
  for (let offset = 0; offset < ordered.length; offset += 10) {
    if (Date.now() >= deadline) break;
    const batch = ordered.slice(offset, offset + 10);
    const records = await storage<(string | null)[]>(
      "MGET",
      ...batch.map((id) => `krk:v2:subscription:${id}`),
    );
    await Promise.all(
      batch.map(async (id, i) => {
        try {
          const raw = records[i];
          if (!raw) {
            await storage("ZREM", index, id);
            return;
          }
          const row = JSON.parse(raw) as Subscription;
          const p = snapshot.forecast.find(
            (p) => p.start <= row.at && p.end > row.at,
          );
          const level = p
            ? Math.max(
                p[row.operation].level ?? 0,
                ...p.scenarios.map((s) => s[row.operation].level ?? 0),
              ) || null
            : null;
          const evening = Date.parse(eveningBefore(row.at));
          const isEvening =
            Date.now() >= evening && Date.now() <= evening + 6 * 3600000;
          const worsened =
            row.lastLevel !== null &&
            level !== null &&
            level >= 3 &&
            level > row.lastLevel;
          const kind = isEvening
            ? "evening"
            : worsened
              ? `level-${level}`
              : null;
          if (kind) {
            const claim = `krk:v2:push:${id}:${kind}`;
            if (
              await storage<string | null>(
                "SET",
                claim,
                "sending",
                "NX",
                "EX",
                120,
              )
            ) {
              try {
                const pl = row.locale === "pl";
                const payload = {
                  title: pl
                    ? "Pogoda przed podróżą z Balic"
                    : "Kraków Airport travel weather",
                  body: `${formatTime(row.at, row.locale, true)} · ${levelLabel(level as 1 | 2 | 3 | 4 | null, row.locale)}. ${pl ? "Sprawdź aktualną prognozę i komunikat linii." : "Check the latest forecast and airline information."}`,
                  url: `/${row.locale}?at=${encodeURIComponent(row.at)}&operation=${row.operation}`,
                  tag: `krk-${id}`,
                };
                await webpush.sendNotification(
                  row.subscription,
                  JSON.stringify(payload),
                  {
                    TTL: Math.min(
                      3600,
                      Math.max(
                        1,
                        Math.floor((Date.parse(row.at) - Date.now()) / 1000),
                      ),
                    ),
                    timeout: 6000,
                  },
                );
                await storage("SET", claim, "sent", "EX", 3 * 86400);
                sent++;
              } catch (error) {
                await storage("DEL", claim);
                if (
                  [404, 410].includes(
                    (error as { statusCode?: number }).statusCode ?? 0,
                  )
                ) {
                  await storage("DEL", `krk:v2:subscription:${id}`);
                  await storage("ZREM", index, id);
                  return;
                }
                failed++;
                return;
              }
            }
          }
          if (level !== null && row.lastLevel !== level) {
            row.lastLevel = level;
            await storage(
              "SET",
              `krk:v2:subscription:${id}`,
              JSON.stringify(row),
              "KEEPTTL",
            );
          }
        } catch {
          failed++;
        }
      }),
    );
    visited += batch.length;
  }
  if (visited < ids.length)
    await storage(
      "SET",
      "krk:v2:push-cursor",
      String((start + visited) % ids.length),
      "EX",
      86400,
    );
  else await storage("DEL", "krk:v2:push-cursor");
  return { sent, failed, disabled: false, deferred: ids.length - visited };
}
