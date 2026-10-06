import { slugs } from "./weather/copy";
import { transportKind, transportPath } from "./transport/paths";
import type { Locale } from "./weather/model";
export function translatedPath(pathname: string, from: Locale, to: Locale) {
  const slug = pathname.split("/")[2];
  const transport = transportKind(from, slug);
  if (transport) return transportPath(to, transport);
  const key = Object.entries(slugs[from]).find(
    ([, value]) => value === slug,
  )?.[0] as keyof typeof slugs.pl | undefined;
  return `/${to}${key ? "/" + slugs[to][key] : ""}`;
}
