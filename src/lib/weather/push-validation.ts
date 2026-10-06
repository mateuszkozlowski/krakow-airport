export function validEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.pathname.length > 1 &&
      [
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "updates-autopush.stage.mozaws.net",
        "web.push.apple.com",
      ].includes(u.hostname)
    );
  } catch {
    return false;
  }
}
export function validPush(
  value: unknown,
): value is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!value || typeof value !== "object") return false;
  const s = value as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.length < 2048 &&
    validEndpoint(s.endpoint) &&
    typeof s.keys?.p256dh === "string" &&
    /^[\w-]{87}$/.test(s.keys.p256dh) &&
    typeof s.keys?.auth === "string" &&
    /^[\w-]{22}$/.test(s.keys.auth)
  );
}
