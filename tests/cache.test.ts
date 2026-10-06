import { test } from "node:test";
import assert from "node:assert/strict";
import { cached, storage } from "../src/lib/cache";

test("missing Redis never blocks fresh weather", async () => {
  const previous = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    const value = await cached("test-no-storage", async () => ({ value: 42 }));
    assert.deepEqual(value.data, { value: 42 });
  } finally {
    if (previous !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = previous;
  }
});
test("cache read/write failures preserve fresh data and deduplicate concurrent fetches", async () => {
  const originalFetch = globalThis.fetch;
  const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://cache.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  globalThis.fetch = async () => {
    throw new Error("Cache offline");
  };
  try {
    let calls = 0;
    const fetcher = async () => {
      calls++;
      await Promise.resolve();
      return "fresh";
    };
    const result = await Promise.all([
      cached("test-cache-offline", fetcher),
      cached("test-cache-offline", fetcher),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(
      result.map((r) => r.data),
      ["fresh", "fresh"],
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = oldUrl;
    if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
  }
});
test("stale fallback retains the original timestamp and expires eventually", async () => {
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  try {
    const first = await cached("test-stale", async () => "original", 3600);
    now += 4 * 60000;
    const fallback = await cached(
      "test-stale",
      async () => {
        throw new Error("Provider offline");
      },
      3600,
    );
    assert.equal(fallback.data, "original");
    assert.equal(fallback.fetchedAt, first.fetchedAt);
    now += 3600000;
    await assert.rejects(
      cached(
        "test-stale",
        async () => {
          throw new Error("Provider offline");
        },
        3600,
      ),
    );
  } finally {
    Date.now = originalNow;
    if (oldToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
  }
});
test("storage rejects insecure Redis endpoints before transmitting credentials", async () => {
  const previous = process.env.UPSTASH_REDIS_REST_URL;
  process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1234";
  try {
    await assert.rejects(storage("GET", "x"));
  } finally {
    if (previous === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previous;
  }
});
