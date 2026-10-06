import {
  pushConfig,
  pushEnabled,
  rateLimit,
  subscribe,
  deleteSubscription,
} from "@/lib/weather/notifications";
import { validPush } from "@/lib/weather/push-validation";
import { limitedJson, BodyTooLarge } from "@/lib/http-body";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await pushConfig(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ enabled: false }, { status: 503 });
  }
}
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export async function POST(request: Request) {
  if (!pushEnabled())
    return Response.json({ error: "Unavailable" }, { status: 503 });
  if (
    !sameOrigin(request) ||
    Number(request.headers.get("content-length")) > 10000
  )
    return new Response(null, { status: 403 });
  try {
    if (
      !(await rateLimit(
        request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      ))
    )
      return new Response(null, { status: 429 });
    const body = await limitedJson(request, 10000);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return new Response(null, { status: 400 });
    const b = body as Record<string, unknown>;
    const at = typeof b.at === "string" ? Date.parse(b.at) : NaN;
    const ahead = at - Date.now();
    if (
      !validPush(b.subscription) ||
      !Number.isFinite(at) ||
      ahead <= 0 ||
      ahead > 48 * 3600000 ||
      (b.locale !== "pl" && b.locale !== "en") ||
      (b.operation !== "arrival" && b.operation !== "departure")
    )
      return Response.json(
        { error: "Invalid trip or subscription" },
        { status: 400 },
      );
    if (b.replace) {
      const r = b.replace as Record<string, unknown>;
      if (
        typeof r.id !== "string" ||
        typeof r.token !== "string" ||
        !(await deleteSubscription(r.id, r.token))
      )
        return new Response(null, { status: 403 });
    }
    return Response.json(
      await subscribe({
        at: new Date(at).toISOString(),
        operation: b.operation,
        locale: b.locale,
        subscription: b.subscription,
      }),
    );
  } catch (error) {
    return Response.json(
      { error: "Could not store subscription" },
      {
        status:
          error instanceof BodyTooLarge
            ? 413
            : error instanceof SyntaxError
              ? 400
              : 503,
      },
    );
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  try {
    const b = (await limitedJson(request, 500)) as {
      id?: unknown;
      token?: unknown;
    } | null;
    if (typeof b?.id !== "string" || typeof b?.token !== "string")
      return new Response(null, { status: 400 });
    return new Response(null, {
      status: (await deleteSubscription(b.id, b.token)) ? 204 : 403,
    });
  } catch (error) {
    return new Response(null, {
      status:
        error instanceof BodyTooLarge
          ? 413
          : error instanceof SyntaxError
            ? 400
            : 503,
    });
  }
}
