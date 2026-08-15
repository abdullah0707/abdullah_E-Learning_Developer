import type { Env } from "../env.d";

const ALLOWED_MEDIA_PREFIXES = ["thumbnails/", "partners/", "site/"];

export async function serveMedia(env: Env, key: string): Promise<Response> {
  if (!ALLOWED_MEDIA_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return new Response("Not found", { status: 404 });
  }
  const object = await env.SAMPLES_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
