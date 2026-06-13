/**
 * Sitemap generator — runs via `predev` / `prebuild`, writes public/sitemap.xml.
 * Pulls dynamic product / category / seller / blog entries from Supabase.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://digisellix-global-store.lovable.app";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/best-notion-templates", changefreq: "weekly", priority: "0.8" },
  { path: "/best-canva-templates", changefreq: "weekly", priority: "0.8" },
  { path: "/top-ai-prompts", changefreq: "weekly", priority: "0.8" },
  { path: "/trending-ebooks", changefreq: "weekly", priority: "0.8" },
];

async function fetchDynamicEntries(): Promise<Entry[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[sitemap] Supabase env vars missing; skipping dynamic entries.");
    return [];
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const entries: Entry[] = [];

  const [{ data: products }, { data: categories }, { data: sellers }, { data: posts }] = await Promise.all([
    sb.from("products").select("id, updated_at").eq("status", "active"),
    sb.from("categories").select("name"),
    sb.from("products").select("seller_id").eq("status", "active"),
    sb.from("blog_posts").select("slug, updated_at").eq("status", "published"),
  ]);

  for (const p of products || []) {
    entries.push({ path: `/products/${p.id}`, lastmod: p.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.8" });
  }
  for (const c of categories || []) {
    entries.push({ path: `/category/${slugify(c.name)}`, changefreq: "weekly", priority: "0.7" });
  }
  const sellerIds = Array.from(new Set((sellers || []).map((s: { seller_id: string }) => s.seller_id)));
  for (const id of sellerIds) {
    entries.push({ path: `/seller/${id}`, changefreq: "weekly", priority: "0.6" });
  }
  for (const post of posts || []) {
    entries.push({ path: `/blog/${post.slug}`, lastmod: post.updated_at?.slice(0, 10), changefreq: "monthly", priority: "0.6" });
  }
  return entries;
}

function generate(entries: Entry[]): string {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ].filter(Boolean).join("\n")
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

async function main() {
  const dynamic = await fetchDynamicEntries().catch((e) => {
    console.warn("[sitemap] dynamic fetch failed:", e?.message || e);
    return [] as Entry[];
  });
  const all = [...staticEntries, ...dynamic];
  writeFileSync(resolve("public/sitemap.xml"), generate(all));
  console.log(`[sitemap] wrote ${all.length} entries`);
}

main();
