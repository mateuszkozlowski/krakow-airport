import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/weather/collect/route";
test("unconfigured cron fails closed, including Bearer undefined", async () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const response = await GET(
      new Request("https://www.krk.flights/api/weather/collect", {
        headers: { authorization: "Bearer undefined" },
      }),
    );
    assert.equal(response.status, 503);
  } finally {
    if (previous !== undefined) process.env.CRON_SECRET = previous;
  }
});
test("configured cron rejects missing and incorrect tokens before accessing weather", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-only-secret";
  try {
    for (const authorization of [
      "",
      "Bearer undefined",
      "Bearer test-only-secrex",
    ]) {
      const response = await GET(
        new Request("https://www.krk.flights/api/weather/collect", {
          headers: { authorization },
        }),
      );
      assert.equal(response.status, 401);
    }
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
