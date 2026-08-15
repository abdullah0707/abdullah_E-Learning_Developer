export interface Env {
  DB: D1Database;
  SAMPLES_BUCKET: R2Bucket;
  ASSETS: Fetcher;
  LOGIN_LIMITER: RateLimit;
  PREVIEW_LIMITER: RateLimit;

  ADMIN_PASSWORD_HASH: string;
  SESSION_HMAC_SECRET: string;
  PREVIEW_HMAC_SECRET: string;
  R2_S3_ACCESS_KEY_ID: string;
  R2_S3_SECRET_ACCESS_KEY: string;
  R2_S3_ENDPOINT: string;
}
