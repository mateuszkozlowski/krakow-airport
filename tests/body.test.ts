import { test } from "node:test";
import assert from "node:assert/strict";
import { BodyTooLarge, limitedJson } from "../src/lib/http-body";
test("JSON request limits apply to UTF-8 bytes even without Content-Length", async () => {
  const raw = JSON.stringify({ name: "ąćęłńóśźż" });
  const request = () =>
    new Request("https://www.krk.flights/api/notifications", {
      method: "POST",
      body: raw,
    });
  await assert.rejects(limitedJson(request(), raw.length), BodyTooLarge);
  assert.deepEqual(await limitedJson(request(), Buffer.byteLength(raw)), {
    name: "ąćęłńóśźż",
  });
});
