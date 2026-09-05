import type { Env } from "../env.d";
import { json } from "../http";
import { slugify } from "../db";

interface ProjectWithTags {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  sample_id: string | null;
  status: string;
  tags: string[];
}

async function attachTags(env: Env, projects: any[]): Promise<ProjectWithTags[]> {
  if (projects.length === 0) return [];
  const ids = projects.map((p) => p.id);
  const placeholders = ids.map(() => "?").join(",");
  const tagRows = await env.DB.prepare(
    `SELECT pt.project_id as project_id, t.name as name
     FROM project_tags pt JOIN tags t ON t.id = pt.tag_id
     WHERE pt.project_id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<{ project_id: number; name: string }>();

  const tagsByProject = new Map<number, string[]>();
  for (const row of tagRows.results) {
    const list = tagsByProject.get(row.project_id) ?? [];
    list.push(row.name);
    tagsByProject.set(row.project_id, list);
  }

  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    external_url: p.external_url,
    thumbnail_url: p.thumbnail_r2_key ? `/media/${p.thumbnail_r2_key}` : null,
    sample_id: p.sample_id,
    status: p.status,
    tags: tagsByProject.get(p.id) ?? [],
  }));
}

export async function listPublicProjects(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM projects WHERE status = 'published' ORDER BY sort_order ASC, id DESC`,
  ).all();
  const withTags = await attachTags(env, results);
  return json({ projects: withTags }, 200, { "Cache-Control": "public, max-age=60" });
}

export async function listAdminProjects(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(`SELECT * FROM projects ORDER BY sort_order ASC, id DESC`).all();
  const withTags = await attachTags(env, results);
  return json({ projects: withTags });
}

export async function createProject(req: Request, env: Env): Promise<Response> {
  const body = await req.json<Record<string, unknown>>().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return json({ error: "title is required" }, 400);

  const slug = slugify(title) + "-" + crypto.randomUUID().slice(0, 6);
  const description = typeof body?.description === "string" ? body.description : null;
  const external_url = typeof body?.external_url === "string" ? body.external_url : null;
  const thumbnail_r2_key = typeof body?.thumbnail_r2_key === "string" ? body.thumbnail_r2_key : null;
  const sample_id = typeof body?.sample_id === "string" ? body.sample_id : null;
  const status = body?.status === "published" ? "published" : "draft";

  const result = await env.DB.prepare(
    `INSERT INTO projects (title, slug, description, external_url, thumbnail_r2_key, sample_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(title, slug, description, external_url, thumbnail_r2_key, sample_id, status)
    .run();

  return json({ id: result.meta.last_row_id, slug }, 201);
}

export async function updateProject(req: Request, env: Env, id: string): Promise<Response> {
  const body = await req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return json({ error: "invalid body" }, 400);

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of [
    ["title", "title"],
    ["description", "description"],
    ["external_url", "external_url"],
    ["thumbnail_r2_key", "thumbnail_r2_key"],
    ["sample_id", "sample_id"],
    ["sort_order", "sort_order"],
    ["status", "status"],
  ] as const) {
    if (key in body) {
      fields.push(`${col} = ?`);
      values.push(body[key]);
    }
  }
  if (fields.length === 0) return json({ error: "no fields to update" }, 400);

  fields.push("updated_at = datetime('now')");
  values.push(id);
  await env.DB.prepare(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  return json({ ok: true });
}

export async function deleteProject(env: Env, id: string): Promise<Response> {
  await env.DB.prepare(`DELETE FROM projects WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

export async function setProjectTags(req: Request, env: Env, id: string): Promise<Response> {
  const body = await req.json<{ tagIds?: number[]; newTags?: string[] }>().catch(() => null);
  if (!body) return json({ error: "invalid body" }, 400);

  const tagIds = new Set(body.tagIds ?? []);

  for (const name of body.newTags ?? []) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = slugify(trimmed);
    const existing = await env.DB.prepare(`SELECT id FROM tags WHERE slug = ?`).bind(slug).first<{ id: number }>();
    if (existing) {
      tagIds.add(existing.id);
    } else {
      const inserted = await env.DB.prepare(`INSERT INTO tags (name, slug) VALUES (?, ?)`).bind(trimmed, slug).run();
      tagIds.add(Number(inserted.meta.last_row_id));
    }
  }

  await env.DB.prepare(`DELETE FROM project_tags WHERE project_id = ?`).bind(id).run();
  for (const tagId of tagIds) {
    await env.DB.prepare(`INSERT INTO project_tags (project_id, tag_id) VALUES (?, ?)`).bind(id, tagId).run();
  }

  return json({ ok: true, tagIds: [...tagIds] });
}
