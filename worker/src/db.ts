export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface ProjectRow {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  external_url: string | null;
  thumbnail_r2_key: string | null;
  sample_id: string | null;
  sort_order: number;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: number;
  name: string;
  slug: string;
}

export interface SampleRow {
  id: string;
  title: string;
  entry_file: string;
  manifest: string;
  total_size_bytes: number;
  status: "draft" | "ready";
}
