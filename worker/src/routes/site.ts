import type { Env } from "../env.d";
import { json } from "../http";

export const SETTINGS_KEYS = [
  "hero_title",
  "hero_tagline",
  "hero_welcome_text",
  "about_bio",
  "about_photo_r2_key",
  "cv_url",
  "social_facebook",
  "social_linkedin",
  "social_github",
  "social_whatsapp_number",
  "social_email",
  "social_phone",
  "font_choice",
] as const;

export async function getSiteSettings(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(`SELECT key, value FROM site_settings`).all<{ key: string; value: string }>();
  const map: Record<string, string> = {};
  for (const row of results) map[row.key] = row.value;
  if (map.about_photo_r2_key) map.about_photo_url = `/media/${map.about_photo_r2_key}`;
  return json({ settings: map }, 200, { "Cache-Control": "public, max-age=60" });
}

export async function updateSiteSettings(req: Request, env: Env): Promise<Response> {
  const body = await req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return json({ error: "invalid body" }, 400);

  const statements = [];
  for (const key of SETTINGS_KEYS) {
    if (key in body && typeof body[key] === "string") {
      statements.push(
        env.DB.prepare(
          `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        ).bind(key, body[key]),
      );
    }
  }
  if (statements.length === 0) return json({ error: "no valid fields" }, 400);
  await env.DB.batch(statements);
  return json({ ok: true });
}
