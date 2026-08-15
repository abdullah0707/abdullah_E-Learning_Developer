import { AwsClient } from "aws4fetch";
import type { Env } from "../env.d";
import { json } from "../http";

const PRESIGN_TTL_SECONDS = 900; // 15 min
const MAX_FILES_PER_SAMPLE = 500;

interface FileDescriptor {
  path: string;
  size: number;
  contentType: string;
}

function sanitizeRelativePath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.length > 500) return null;
  if (normalized.includes("://")) return null;
  if (normalized.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return null;
  return normalized;
}

async function presignPut(env: Env, key: string, contentType: string): Promise<string> {
  const client = new AwsClient({ accessKeyId: env.R2_S3_ACCESS_KEY_ID, secretAccessKey: env.R2_S3_SECRET_ACCESS_KEY });
  const url = new URL(`${env.R2_S3_ENDPOINT}/portfolio-assets/${key}`);
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_TTL_SECONDS));
  const signed = await client.sign(
    new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

const SINGLE_FILE_PREFIXES: Record<string, string> = {
  thumbnail: "thumbnails",
  "partner-logo": "partners",
  "about-photo": "site",
};

export async function presignUploads(req: Request, env: Env): Promise<Response> {
  const body = await req
    .json<{ kind?: "sample" | keyof typeof SINGLE_FILE_PREFIXES; sampleId?: string; files?: FileDescriptor[] }>()
    .catch(() => null);
  if (!body?.files?.length) return json({ error: "files array is required" }, 400);
  if (body.files.length > MAX_FILES_PER_SAMPLE) return json({ error: "too many files" }, 400);

  if (body.kind && body.kind in SINGLE_FILE_PREFIXES) {
    const prefix = SINGLE_FILE_PREFIXES[body.kind];
    const file = body.files[0];
    const ext = (file.path.split(".").pop() || "bin").toLowerCase();
    const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const url = await presignPut(env, key, file.contentType || "application/octet-stream");
    return json({ uploads: [{ path: file.path, key, url }] });
  }

  const sampleId = body.sampleId ?? crypto.randomUUID();
  const uploads: { path: string; key: string; url: string }[] = [];
  for (const file of body.files) {
    const safePath = sanitizeRelativePath(file.path);
    if (!safePath) return json({ error: `invalid file path: ${file.path}` }, 400);
    const key = `samples/${sampleId}/${safePath}`;
    const url = await presignPut(env, key, file.contentType || "application/octet-stream");
    uploads.push({ path: safePath, key, url });
  }

  return json({ sampleId, uploads });
}
