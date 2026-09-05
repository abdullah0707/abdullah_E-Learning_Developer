import type { Env } from "../env.d";
import { json } from "../http";
import { createPreviewCookie, verifyPreviewAccess } from "../auth";

interface ManifestEntry {
  path: string;
  size: number;
  contentType: string;
}

export async function mintPreviewToken(req: Request, env: Env, sampleId: string): Promise<Response> {
  const { success } = await env.PREVIEW_LIMITER.limit({ key: req.headers.get("CF-Connecting-IP") ?? "unknown" });
  if (!success) return json({ error: "Too many requests, try again later" }, 429);

  const sample = await env.DB.prepare(`SELECT id, entry_file, status FROM samples WHERE id = ?`)
    .bind(sampleId)
    .first<{ id: string; entry_file: string; status: string }>();
  if (!sample || sample.status !== "ready") return json({ error: "Sample not available" }, 404);

  const project = await env.DB.prepare(`SELECT id FROM projects WHERE sample_id = ? AND status = 'published'`)
    .bind(sampleId)
    .first();
  if (!project) return json({ error: "Sample not available" }, 404);

  const cookie = await createPreviewCookie(env, sampleId);
  return json({ entryFile: sample.entry_file }, 200, { "Set-Cookie": cookie });
}

export async function servePreviewFile(req: Request, env: Env, sampleId: string, relPath: string): Promise<Response> {
  const allowed = await verifyPreviewAccess(req, env, sampleId);
  if (!allowed) return new Response("Unauthorized", { status: 401 });

  const cache = caches.default;

  let sample = await cache.match(`https://internal/sample-meta/${sampleId}`).then((r) =>
    r ? r.json<{ manifest: ManifestEntry[] }>() : null,
  );
  if (!sample) {
    const row = await env.DB.prepare(`SELECT manifest FROM samples WHERE id = ?`).bind(sampleId).first<{ manifest: string }>();
    if (!row) return new Response("Not found", { status: 404 });
    sample = { manifest: JSON.parse(row.manifest) as ManifestEntry[] };
    await cache.put(
      `https://internal/sample-meta/${sampleId}`,
      new Response(JSON.stringify(sample), { headers: { "Cache-Control": "max-age=60" } }),
    );
  }

  const entry = sample.manifest.find((f) => f.path === relPath);
  if (!entry) return new Response("Not found", { status: 404 });

  const object = await env.SAMPLES_BUCKET.get(`samples/${sampleId}/${relPath}`);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": entry.contentType || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "frame-ancestors https://abdullah-e-learning-developer.pages.dev",
    },
  });
}
