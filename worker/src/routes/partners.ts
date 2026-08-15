import type { Env } from "../env.d";
import { json } from "../http";

function withUrl(p: any) {
  return { ...p, logo_url: p.logo_r2_key ? `/media/${p.logo_r2_key}` : null };
}

export async function listPublicPartners(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(`SELECT * FROM partners ORDER BY sort_order ASC, id ASC`).all();
  return json({ partners: results.map(withUrl) }, 200, { "Cache-Control": "public, max-age=60" });
}

export async function listAdminPartners(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(`SELECT * FROM partners ORDER BY sort_order ASC, id ASC`).all();
  return json({ partners: results.map(withUrl) });
}

export async function createPartner(req: Request, env: Env): Promise<Response> {
  const body = await req.json<Record<string, unknown>>().catch(() => null);
  const logoKey = typeof body?.logo_r2_key === "string" ? body.logo_r2_key : "";
  if (!logoKey) return json({ error: "logo_r2_key is required" }, 400);

  const name = typeof body?.name === "string" ? body.name : null;
  const linkUrl = typeof body?.link_url === "string" ? body.link_url : null;
  const maxOrder = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), -1) as m FROM partners`).first<{ m: number }>();

  const result = await env.DB.prepare(
    `INSERT INTO partners (name, logo_r2_key, link_url, sort_order) VALUES (?, ?, ?, ?)`,
  )
    .bind(name, logoKey, linkUrl, (maxOrder?.m ?? -1) + 1)
    .run();

  return json({ id: result.meta.last_row_id }, 201);
}

export async function updatePartner(req: Request, env: Env, id: string): Promise<Response> {
  const body = await req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return json({ error: "invalid body" }, 400);

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of [
    ["name", "name"],
    ["link_url", "link_url"],
    ["logo_r2_key", "logo_r2_key"],
    ["sort_order", "sort_order"],
  ] as const) {
    if (key in body) {
      fields.push(`${col} = ?`);
      values.push(body[key]);
    }
  }
  if (fields.length === 0) return json({ error: "no fields to update" }, 400);
  values.push(id);
  await env.DB.prepare(`UPDATE partners SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  return json({ ok: true });
}

export async function deletePartner(env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`DELETE FROM partners WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}
