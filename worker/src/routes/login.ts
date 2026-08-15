import type { Env } from "../env.d";
import { createSessionCookie, clearSessionCookie, isAuthenticated, verifyPassword } from "../auth";
import { json } from "../http";

export async function handleLogin(req: Request, env: Env): Promise<Response> {
  const { success } = await env.LOGIN_LIMITER.limit({ key: req.headers.get("CF-Connecting-IP") ?? "unknown" });
  if (!success) return json({ error: "Too many attempts, try again later" }, 429);

  const body = await req.json<{ password?: string }>().catch(() => null);
  if (!body?.password) return json({ error: "Missing password" }, 400);

  const ok = await verifyPassword(body.password, env.ADMIN_PASSWORD_HASH);
  if (!ok) return json({ error: "Invalid credentials" }, 401);

  const cookie = await createSessionCookie(env);
  return json({ ok: true }, 200, { "Set-Cookie": cookie });
}

export async function handleLogout(): Promise<Response> {
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

export async function handleSession(req: Request, env: Env): Promise<Response> {
  const authed = await isAuthenticated(req, env);
  return json({ authenticated: authed });
}
