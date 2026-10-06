import "server-only";

export const hasStorage = () =>
  !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
export async function storage<T>(...command: (string | number)[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || new URL(url).protocol !== "https:")
    throw new Error("Storage unavailable");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error("Storage request failed");
  const body = await response.json();
  if (body.error) throw new Error("Storage command failed");
  return body.result as T;
}
interface Entry<T> {
  data: T;
  fetchedAt: number;
}
const memory = new Map<string, Entry<unknown>>();
const pending = new Map<string, Promise<Entry<unknown>>>();
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  retention = 48 * 3600,
  freshSeconds = 180,
): Promise<Entry<T>> {
  const name = `krk:v2:cache:${key}`;
  let old = memory.get(name) as Entry<T> | undefined;
  if (!old && hasStorage()) {
    try {
      const saved = await storage<string | null>("GET", name);
      if (saved) old = JSON.parse(saved);
    } catch {
      /* Cache failure must not stop weather requests. */
    }
  }
  if (old && Date.now() - old.fetchedAt < freshSeconds * 1000) return old;
  if (pending.has(name)) return pending.get(name)! as Promise<Entry<T>>;
  const task = (async () => {
    try {
      const entry = { data: await fetcher(), fetchedAt: Date.now() };
      memory.set(name, entry);
      if (hasStorage()) {
        try {
          await storage("SET", name, JSON.stringify(entry), "EX", retention);
        } catch {
          /* Preserve fresh data. */
        }
      }
      return entry;
    } catch (error) {
      if (old && Date.now() - old.fetchedAt < retention * 1000) return old;
      throw error;
    } finally {
      pending.delete(name);
    }
  })();
  pending.set(name, task);
  return task;
}
