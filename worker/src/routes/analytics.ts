import type { Env } from "../env.d";
import { json } from "../http";

function parseDevice(ua: string): string {
  if (/mobile/i.test(ua) && !/ipad|tablet/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

export async function trackEvent(req: Request, env: Env): Promise<Response> {
  const { success } = await env.TRACK_LIMITER.limit({ key: req.headers.get("CF-Connecting-IP") ?? "unknown" });
  if (!success) return json({ ok: true }); // fail open/quiet — never let tracking errors surface to visitors

  const body = await req
    .json<{ visitorId?: string; eventType?: string; path?: string; referrer?: string; label?: string }>()
    .catch(() => null);
  if (!body?.visitorId || !body?.eventType) return json({ error: "invalid" }, 400);

  const ua = req.headers.get("User-Agent") || "";
  const country = req.headers.get("CF-IPCountry") || "XX";
  const device = parseDevice(ua);

  await env.DB.prepare(
    `INSERT INTO analytics_events (visitor_id, event_type, path, referrer, country, device, label) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.visitorId.slice(0, 64),
      body.eventType.slice(0, 32),
      (body.path || "").slice(0, 500),
      (body.referrer || "").slice(0, 500),
      country,
      device,
      (body.label || "").slice(0, 200),
    )
    .run();

  return json({ ok: true });
}

export async function getAnalyticsSummary(env: Env, days: number): Promise<Response> {
  const since = `-${days} days`;

  const totals = await env.DB.prepare(
    `SELECT COUNT(*) as pageviews, COUNT(DISTINCT visitor_id) as visitors
     FROM analytics_events WHERE event_type='pageview' AND created_at >= datetime('now', ?)`,
  )
    .bind(since)
    .first();

  const daily = await env.DB.prepare(
    `SELECT date(created_at) as day, COUNT(*) as pageviews, COUNT(DISTINCT visitor_id) as visitors
     FROM analytics_events WHERE event_type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY day ORDER BY day ASC`,
  )
    .bind(since)
    .all();

  const topPages = await env.DB.prepare(
    `SELECT path, COUNT(*) as count FROM analytics_events WHERE event_type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY path ORDER BY count DESC LIMIT 10`,
  )
    .bind(since)
    .all();

  const topReferrers = await env.DB.prepare(
    `SELECT CASE WHEN referrer = '' OR referrer IS NULL THEN '(direct)' ELSE referrer END as referrer, COUNT(*) as count
     FROM analytics_events WHERE event_type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY referrer ORDER BY count DESC LIMIT 10`,
  )
    .bind(since)
    .all();

  const devices = await env.DB.prepare(
    `SELECT device, COUNT(*) as count FROM analytics_events WHERE event_type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY device ORDER BY count DESC`,
  )
    .bind(since)
    .all();

  const countries = await env.DB.prepare(
    `SELECT country, COUNT(*) as count FROM analytics_events WHERE event_type='pageview' AND created_at >= datetime('now', ?)
     GROUP BY country ORDER BY count DESC LIMIT 10`,
  )
    .bind(since)
    .all();

  const topEvents = await env.DB.prepare(
    `SELECT event_type, label, COUNT(*) as count FROM analytics_events WHERE event_type != 'pageview' AND created_at >= datetime('now', ?)
     GROUP BY event_type, label ORDER BY count DESC LIMIT 15`,
  )
    .bind(since)
    .all();

  return json({
    totals,
    daily: daily.results,
    topPages: topPages.results,
    topReferrers: topReferrers.results,
    devices: devices.results,
    countries: countries.results,
    topEvents: topEvents.results,
  });
}

export async function getRecentEvents(env: Env, limit: number): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT event_type, path, referrer, country, device, label, created_at FROM analytics_events ORDER BY id DESC LIMIT ?`,
  )
    .bind(limit)
    .all();
  return json({ events: results });
}
