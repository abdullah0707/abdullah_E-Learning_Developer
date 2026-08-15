import type { Env } from "./env.d";
import { json } from "./http";
import { isAuthenticated } from "./auth";
import { handleLogin, handleLogout, handleSession } from "./routes/login";
import { listPublicProjects, listAdminProjects, createProject, updateProject, deleteProject, setProjectTags } from "./routes/projects";
import { listTags, createTag, deleteTag } from "./routes/tags";
import { presignUploads } from "./routes/uploads";
import { finalizeSample, deleteSample } from "./routes/samples";
import { mintPreviewToken, servePreviewFile } from "./routes/preview";
import { serveMedia } from "./routes/media";
import { getSiteSettings, updateSiteSettings } from "./routes/site";
import { listPublicPartners, listAdminPartners, createPartner, updatePartner, deletePartner } from "./routes/partners";

// Exact origin of the public portfolio site. Kept as a constant (not a secret) because
// it must be echoed back verbatim in Access-Control-Allow-Origin for credentialed CORS
// (preview-token minting) to work — the browser rejects a wildcard "*" when
// credentials are involved.
const PUBLIC_SITE_ORIGIN = "https://abdullah-e-learning-developer.pages.dev";

function corsHeaders(req: Request, credentialed: boolean): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = credentialed ? PUBLIC_SITE_ORIGIN : origin || "*";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (credentialed) headers["Access-Control-Allow-Credentials"] = "true";
  return headers;
}

function withCors(res: Response, req: Request, credentialed: boolean): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(req, credentialed))) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

async function requireAuth(req: Request, env: Env): Promise<Response | null> {
  const authed = await isAuthenticated(req, env);
  if (!authed) return json({ error: "Unauthorized" }, 401);
  return null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "OPTIONS") {
      const credentialed = pathname.startsWith("/api/preview-token/");
      return new Response(null, { status: 204, headers: corsHeaders(req, credentialed) });
    }

    // ---- Public API ----
    if (pathname === "/api/projects" && req.method === "GET") {
      return withCors(await listPublicProjects(env), req, false);
    }

    if (pathname === "/api/site" && req.method === "GET") {
      return withCors(await getSiteSettings(env), req, false);
    }

    if (pathname === "/api/partners" && req.method === "GET") {
      return withCors(await listPublicPartners(env), req, false);
    }

    const previewTokenMatch = pathname.match(/^\/api\/preview-token\/([a-zA-Z0-9-]+)$/);
    if (previewTokenMatch && req.method === "POST") {
      return withCors(await mintPreviewToken(req, env, previewTokenMatch[1]), req, true);
    }

    const previewFileMatch = pathname.match(/^\/preview\/([a-zA-Z0-9-]+)\/(.+)$/);
    if (previewFileMatch && req.method === "GET") {
      return servePreviewFile(req, env, previewFileMatch[1], previewFileMatch[2]);
    }

    const mediaMatch = pathname.match(/^\/media\/(.+)$/);
    if (mediaMatch && req.method === "GET") {
      return serveMedia(env, mediaMatch[1]);
    }

    // ---- Admin auth ----
    if (pathname === "/admin/api/login" && req.method === "POST") return handleLogin(req, env);
    if (pathname === "/admin/api/logout" && req.method === "POST") return handleLogout();
    if (pathname === "/admin/api/session" && req.method === "GET") return handleSession(req, env);

    // ---- Admin API (auth required) ----
    if (pathname.startsWith("/admin/api/")) {
      const unauthorized = await requireAuth(req, env);
      if (unauthorized) return unauthorized;

      if (pathname === "/admin/api/projects" && req.method === "GET") return listAdminProjects(env);
      if (pathname === "/admin/api/projects" && req.method === "POST") return createProject(req, env);

      const projectMatch = pathname.match(/^\/admin\/api\/projects\/(\d+)$/);
      if (projectMatch && req.method === "PUT") return updateProject(req, env, projectMatch[1]);
      if (projectMatch && req.method === "DELETE") return deleteProject(env, projectMatch[1]);

      const projectTagsMatch = pathname.match(/^\/admin\/api\/projects\/(\d+)\/tags$/);
      if (projectTagsMatch && req.method === "POST") return setProjectTags(req, env, projectTagsMatch[1]);

      if (pathname === "/admin/api/tags" && req.method === "GET") return listTags(env);
      if (pathname === "/admin/api/tags" && req.method === "POST") return createTag(req, env);
      const tagMatch = pathname.match(/^\/admin\/api\/tags\/(\d+)$/);
      if (tagMatch && req.method === "DELETE") return deleteTag(env, tagMatch[1]);

      if (pathname === "/admin/api/uploads/presign" && req.method === "POST") return presignUploads(req, env);
      if (pathname === "/admin/api/samples" && req.method === "POST") return finalizeSample(req, env);
      const sampleMatch = pathname.match(/^\/admin\/api\/samples\/([a-zA-Z0-9-]+)$/);
      if (sampleMatch && req.method === "DELETE") return deleteSample(env, sampleMatch[1]);

      if (pathname === "/admin/api/site" && req.method === "GET") return getSiteSettings(env);
      if (pathname === "/admin/api/site" && req.method === "PUT") return updateSiteSettings(req, env);

      if (pathname === "/admin/api/partners" && req.method === "GET") return listAdminPartners(env);
      if (pathname === "/admin/api/partners" && req.method === "POST") return createPartner(req, env);
      const partnerMatch = pathname.match(/^\/admin\/api\/partners\/(\d+)$/);
      if (partnerMatch && req.method === "PUT") return updatePartner(req, env, partnerMatch[1]);
      if (partnerMatch && req.method === "DELETE") return deletePartner(env, partnerMatch[1]);

      return json({ error: "Not found" }, 404);
    }

    // ---- Admin UI (static assets) ----
    return env.ASSETS.fetch(req);
  },
};
