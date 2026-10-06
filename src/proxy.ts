import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-krk-locale",
    request.nextUrl.pathname.split("/")[1] === "en" ? "en" : "pl",
  );
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: ["/((?!api|_next|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
