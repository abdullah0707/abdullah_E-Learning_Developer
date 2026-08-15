import type { Env } from "../env.d";

export async function serveMedia(env: Env, key: string): Promise<Response> {
  if (!key.startsWith("thumbnails/")) return new Response("Not found", { status: 404 });
  const object = await env.SAMPLES_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
