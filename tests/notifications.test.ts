import { test } from "node:test";
import assert from "node:assert/strict";
import webpush from "web-push";
import { sendNotifications } from "../src/lib/weather/notifications";
import { assess } from "../src/lib/weather/engine";
import type { Snapshot, Conditions } from "../src/lib/weather/model";

function fixture(count: number, initialLevel = 3) {
  const keys = [
    "WEB_PUSH_ENABLED",
    "CRON_SECRET",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];
  const previous = keys.map((key) => process.env[key]);
  process.env.WEB_PUSH_ENABLED = "true";
  process.env.CRON_SECRET = "test-only";
  process.env.UPSTASH_REDIS_REST_URL = "https://cache.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-only";
  const fetch = globalThis.fetch;
  const send = webpush.sendNotification;
  const dateNow = Date.now;
  let now = dateNow();
  Date.now = () => now;
  const at = new Date(now + 40 * 3600000).toISOString();
  const ids = Array.from({ length: count }, (_, i) =>
    String(i).padStart(32, "0"),
  );
  const commands: (string | number)[][] = [];
  const rows = new Map(
    ids.map((id) => [
      id,
      JSON.stringify({
        id,
        at,
        locale: "en",
        operation: "arrival",
        lastLevel: initialLevel,
        subscription: {
          endpoint: "https://fcm.googleapis.com/fake-test-only",
          keys: {},
        },
      }),
    ]),
  );
  const pair = webpush.generateVAPIDKeys();
  let cursor: string | null = null;
  let delay = false;
  let sent = 0;
  webpush.sendNotification = async () => {
    sent++;
    return { statusCode: 201, headers: {}, body: "" };
  };
  globalThis.fetch = async (_url, init) => {
    const command = JSON.parse(String(init?.body)) as (string | number)[];
    commands.push(command);
    let result: unknown = 1;
    if (command[0] === "GET")
      result = command[1] === "krk:v2:vapid" ? JSON.stringify(pair) : cursor;
    if (command[0] === "ZRANGE") result = ids;
    if (command[0] === "MGET") {
      if (delay) now += 5000;
      result = command
        .slice(1)
        .map((key) => rows.get(String(key).split(":").pop()!) ?? null);
    }
    if (command[0] === "SET") {
      if (command[1] === "krk:v2:push-cursor") cursor = String(command[2]);
      if (String(command[1]).startsWith("krk:v2:subscription:"))
        rows.set(String(command[1]).split(":").pop()!, String(command[2]));
      result = "OK";
    }
    if (command[0] === "DEL" && command[1] === "krk:v2:push-cursor")
      cursor = null;
    return Response.json({ result });
  };
  const conditions: Conditions = {
    visibility: 700,
    ceiling: null,
    wind: null,
    weather: [],
    temperature: null,
    dewpoint: null,
    rvr: [],
    cavok: false,
  };
  const arrival = assess(conditions, "arrival");
  const departure = assess(conditions, "departure");
  const source = {
    state: "fresh" as const,
    fetchedAt: new Date(now).toISOString(),
    detail: "test",
  };
  const snapshot: Snapshot = {
    version: 2,
    generatedAt: new Date(now).toISOString(),
    observed: null,
    history: [],
    current: { arrival, departure },
    forecast: [
      {
        start: new Date(now).toISOString(),
        end: new Date(now + 48 * 3600000).toISOString(),
        source: "model",
        conditions,
        arrival,
        departure,
        scenarios: [],
      },
    ],
    ensemble: [],
    sources: { metar: source, taf: source, model: source, ensemble: source },
    taf: null,
    fogSignal: null,
  };
  return {
    snapshot,
    commands,
    ids,
    delay(value: boolean) {
      delay = value;
    },
    now: () => now,
    sent: () => sent,
    restore() {
      globalThis.fetch = fetch;
      webpush.sendNotification = send;
      Date.now = dateNow;
      keys.forEach((key, i) => {
        if (previous[i] === undefined) delete process.env[key];
        else process.env[key] = previous[i];
      });
    },
  };
}
test("unchanged assessments do not send notifications or rewrite subscriptions", async () => {
  const f = fixture(2);
  try {
    const result = await sendNotifications(f.snapshot);
    assert.equal(result.sent, 0);
    assert.equal(f.sent(), 0);
    assert.equal(result.deferred, 0);
    assert.equal(
      f.commands.filter(
        (c) =>
          c[0] === "SET" && String(c[1]).startsWith("krk:v2:subscription:"),
      ).length,
      0,
    );
  } finally {
    f.restore();
  }
});
test("a rise to high risk alerts once and persists the new assessment", async () => {
  const f = fixture(2, 1);
  try {
    assert.equal((await sendNotifications(f.snapshot)).sent, 2);
    assert.equal(f.sent(), 2);
    assert.equal((await sendNotifications(f.snapshot)).sent, 0);
    assert.equal(f.sent(), 2);
  } finally {
    f.restore();
  }
});
test("notification work stops at its time budget and resumes with deferred subscriptions", async () => {
  const f = fixture(11);
  try {
    f.delay(true);
    const first = await sendNotifications(f.snapshot, f.now() + 1000);
    assert.equal(first.deferred, 1);
    const reads = f.commands.filter((c) => c[0] === "MGET").length;
    f.delay(false);
    const second = await sendNotifications(f.snapshot, f.now() + 1000);
    assert.equal(second.deferred, 0);
    const batches = f.commands.filter((c) => c[0] === "MGET");
    assert.equal(batches[reads][1], `krk:v2:subscription:${f.ids[10]}`);
    assert.equal(f.sent(), 0);
  } finally {
    f.restore();
  }
});
