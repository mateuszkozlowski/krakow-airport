export class BodyTooLarge extends Error {}
export async function limitedJson(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new BodyTooLarge();
  if (!request.body) throw new SyntaxError("Missing body");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let raw = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new BodyTooLarge();
      }
      raw += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(raw + decoder.decode());
}
