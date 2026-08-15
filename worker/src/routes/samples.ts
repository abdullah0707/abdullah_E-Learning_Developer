import type { Env } from "../env.d";
import { json } from "../http";

interface ManifestEntry {
  path: string;
  size: number;
  contentType: string;
}

export async function finalizeSample(req: Request, env: Env): Promise<Response> {
  const body = await req
    .json<{ sampleId?: string; title?: string; entryFile?: string; manifest?: ManifestEntry[] }>()
    .catch(() => null);
  if (!body?.sampleId || !body.title || !body.manifest?.length) {
    return json({ error: "sampleId, title and manifest are required" }, 400);
  }
  const entryFile = body.entryFile || "index.html";
  if (!body.manifest.some((f) => f.path === entryFile)) {
    return json({ error: `entryFile "${entryFile}" not present in manifest` }, 400);
  }

  const manifestJson = JSON.stringify(body.manifest);
  if (manifestJson.length > 1_500_000) return json({ error: "manifest too large" }, 400);

  const totalSize = body.manifest.reduce((sum, f) => sum + (f.size || 0), 0);

  await env.DB.prepare(
    `INSERT INTO samples (id, title, entry_file, manifest, total_size_bytes, status, updated_at)
     VALUES (?, ?, ?, ?, ?, 'ready', datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       entry_file = excluded.entry_file,
       manifest = excluded.manifest,
       total_size_bytes = excluded.total_size_bytes,
       status = 'ready',
       updated_at = datetime('now')`,
  )
    .bind(body.sampleId, body.title, entryFile, manifestJson, totalSize)
    .run();

  return json({ ok: true, sampleId: body.sampleId });
}

export async function deleteSample(env: Env, id: string): Promise<Response> {
  const sample = await env.DB.prepare(`SELECT manifest FROM samples WHERE id = ?`).bind(id).first<{ manifest: string }>();
  if (sample) {
    const manifest = JSON.parse(sample.manifest) as ManifestEntry[];
    const keys = manifest.map((f) => `samples/${id}/${f.path}`);
    for (let i = 0; i < keys.length; i += 1000) {
      await env.SAMPLES_BUCKET.delete(keys.slice(i, i + 1000));
    }
  }
  await env.DB.prepare(`DELETE FROM samples WHERE id = ?`).bind(id).run();
  await env.DB.prepare(`UPDATE projects SET sample_id = NULL WHERE sample_id = ?`).bind(id).run();
  return json({ ok: true });
}
