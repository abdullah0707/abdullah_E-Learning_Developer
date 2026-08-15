import type { Env } from "../env.d";
import { json } from "../http";
import { slugify } from "../db";

export async function listTags(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(`SELECT * FROM tags ORDER BY name ASC`).all();
  return json({ tags: results });
}

export async function createTag(req: Request, env: Env): Promise<Response> {
  const body = await req.json<{ name?: string }>().catch(() => null);
  const name = body?.name?.trim();
  if (!name) return json({ error: "name is required" }, 400);

  const slug = slugify(name);
  const existing = await env.DB.prepare(`SELECT * FROM tags WHERE slug = ?`).bind(slug).first();
  if (existing) return json({ tag: existing }, 200);

  const result = await env.DB.prepare(`INSERT INTO tags (name, slug) VALUES (?, ?)`).bind(name, slug).run();
  return json({ tag: { id: result.meta.last_row_id, name, slug } }, 201);
}

export async function deleteTag(env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`DELETE FROM tags WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}
