// SEO helpers: slugs, dynamic content generation, JSON-LD builders.

export const SITE_URL = "https://digisellix-global-store.lovable.app";
export const SITE_NAME = "Digisellix";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function unslugify(slug: string): string {
  return slug.replace(/-/g, " ");
}

export function truncate(text: string, n: number): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= n ? clean : clean.slice(0, n - 1).trimEnd() + "…";
}

export function categorySlug(name: string): string {
  return slugify(name);
}

export function findCategoryName(slug: string, categories: { name: string }[]): string | undefined {
  return categories.find((c) => slugify(c.name) === slug)?.name;
}

// ---------- Product SEO content ----------

export interface ProductLike {
  title: string;
  description: string;
  category: string;
  price_usd: number | string;
  thumbnail_url?: string | null;
  total_sales?: number | null;
}

export function productMetaTitle(p: ProductLike): string {
  return truncate(`${p.title} — ${p.category} | ${SITE_NAME}`, 60);
}

export function productMetaDescription(p: ProductLike): string {
  const base = `${p.title}. ${p.description}`;
  return truncate(`${base} Buy instantly on ${SITE_NAME}.`, 158);
}

export function productOverview(p: ProductLike): string {
  return `${p.title} is a premium ${p.category.toLowerCase()} digital product available on ${SITE_NAME}. ${p.description.slice(0, 400)} Delivered instantly after purchase with secure global payment and lifetime access to your download.`;
}

export function productBenefits(p: ProductLike): string[] {
  return [
    `Instant digital delivery — access ${p.title} immediately after checkout.`,
    `High-quality ${p.category.toLowerCase()} crafted for real-world use.`,
    `One-time payment with no recurring fees or hidden costs.`,
    `Secure global checkout with PayPal and local payment methods.`,
    `Backed by verified seller reviews and buyer protection.`,
  ];
}

export function productUseCases(p: ProductLike): string[] {
  const cat = p.category.toLowerCase();
  return [
    `Use ${p.title} to accelerate ${cat} projects and ship faster.`,
    `Integrate it into your existing workflow with minimal setup.`,
    `Resell-friendly licensing for qualified ${cat} use cases.`,
    `Perfect for freelancers, agencies, and creators who need proven ${cat} resources.`,
  ];
}

export function productAudience(p: ProductLike): string {
  return `${p.title} is built for creators, entrepreneurs, freelancers, and teams looking for reliable ${p.category.toLowerCase()} that saves time and delivers measurable results. Whether you're starting out or scaling, this product fits real workflows on day one.`;
}

export function productFAQ(p: ProductLike): { q: string; a: string }[] {
  return [
    {
      q: `What's included with ${p.title}?`,
      a: `You get the complete ${p.category.toLowerCase()} package as described, delivered as an instant download right after payment is confirmed.`,
    },
    {
      q: `How do I download ${p.title} after buying?`,
      a: `Once payment is confirmed you'll get a secure download link in your dashboard and via email. Access never expires.`,
    },
    {
      q: `Is ${p.title} a one-time payment?`,
      a: `Yes. You pay once and own your copy. There are no subscriptions or recurring fees.`,
    },
    {
      q: `Does ${p.title} come with a refund policy?`,
      a: `Refunds follow the seller's policy and ${SITE_NAME}'s buyer protection. Reach out via the product page if anything is wrong with your download.`,
    },
    {
      q: `Can I use ${p.title} for commercial work?`,
      a: `Most ${p.category.toLowerCase()} products on ${SITE_NAME} allow commercial use. Check the product description and license notes for specifics.`,
    },
    {
      q: `How do I contact the seller of ${p.title}?`,
      a: `Use the seller link on the product page to view their store, see other products, and reach out with questions.`,
    },
  ];
}

// ---------- JSON-LD builders ----------

export function jsonLd(obj: unknown): string {
  return JSON.stringify(obj);
}

export function productJsonLd(p: ProductLike & { id: string; seller_name?: string }) {
  const url = `${SITE_URL}/products/${p.id}`;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: truncate(p.description, 5000),
    image: p.thumbnail_url || `${SITE_URL}/placeholder.svg`,
    category: p.category,
    sku: p.id,
    brand: { "@type": "Brand", name: p.seller_name || SITE_NAME },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: Number(p.price_usd).toFixed(2),
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: p.seller_name || SITE_NAME },
    },
    aggregateRating:
      (p.total_sales ?? 0) > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            reviewCount: Math.max(p.total_sales ?? 0, 1),
          }
        : undefined,
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url.startsWith("http") ? c.url : `${SITE_URL}${c.url}`,
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// ---------- Category SEO content ----------

export function categoryIntro(name: string): string {
  return `Discover the best ${name} on ${SITE_NAME} — a curated marketplace of high-quality digital products created by independent makers from around the world. Every ${name.toLowerCase()} listing is reviewed for quality, delivered instantly, and backed by secure global payments. Whether you're searching for proven, ready-to-use ${name.toLowerCase()} or fresh releases from rising creators, this collection brings together the tools, templates, and assets that real builders rely on day to day. Browse the latest, sort by popularity, and skip the endless searching — every product here is downloadable in seconds with a one-time payment and lifetime access.`;
}

export function categoryGuide(name: string): string {
  const lc = name.toLowerCase();
  return `When choosing the right ${lc}, focus first on fit: read the description carefully, check screenshots, and look at the seller's other products to gauge their style and reliability. Strong ${lc} listings on ${SITE_NAME} clearly explain what's included, who the product is for, and how to put it to work — vague descriptions are usually a sign to keep looking. Next, weigh price against included assets: a slightly higher price often unlocks bonus files, commercial licenses, or ongoing updates that save hours later. Total sales and seller reputation are quick proxies for quality, but newer ${lc} products from specialised creators can be just as strong — they just haven't accumulated social proof yet. Before buying, confirm the licensing terms match your project (personal vs. commercial, single use vs. team), and double-check file formats so the ${lc} drops into your existing workflow without friction. Finally, plan for the long term: pick ${lc} that you can extend, remix, or build on as your work grows, rather than one-off assets that only solve today's problem. Following this short checklist makes every purchase on ${SITE_NAME} a confident one.`;
}

export function categoryFAQ(name: string): { q: string; a: string }[] {
  const lc = name.toLowerCase();
  return [
    { q: `What is ${name} on ${SITE_NAME}?`, a: `${name} is a curated category of digital products covering ${lc}, available as instant downloads from verified creators worldwide.` },
    { q: `How do I buy ${lc} on ${SITE_NAME}?`, a: `Open any product in the ${name} category, click Buy Now, complete secure checkout with PayPal or local payments, and download immediately from your dashboard.` },
    { q: `Are the ${lc} products original?`, a: `Yes. Every listing is published by an independent creator and reviewed for quality before going live on the marketplace.` },
    { q: `Can I use ${lc} from ${SITE_NAME} for commercial projects?`, a: `Most ${lc} products allow commercial use. Check the licensing details on each product page before purchase.` },
    { q: `How fast is delivery for ${lc}?`, a: `Delivery is instant. As soon as payment is confirmed, the download link appears in your buyer dashboard and is sent to your email.` },
  ];
}

// ---------- Programmatic landing pages ----------

export interface LandingConfig {
  slug: string;
  title: string;
  heading: string;
  description: string;
  // Matching rules against product title / category / description (case-insensitive).
  match: { keywords: string[]; categories?: string[] };
  intro: string;
}

export const LANDING_PAGES: LandingConfig[] = [
  {
    slug: "best-notion-templates",
    title: "Best Notion Templates 2026 — Curated on Digisellix",
    heading: "Best Notion Templates",
    description: "Hand-picked Notion templates for productivity, planning, business, and content creation. Instant download, lifetime access.",
    match: { keywords: ["notion"] },
    intro:
      "The best Notion templates turn an empty workspace into a fully working system in minutes — dashboards, planners, CRMs, content calendars, second brains, and more. This collection rounds up the top-rated Notion templates on Digisellix, sourced from independent creators and ready to duplicate into your workspace right after checkout. Every template includes setup instructions and lifetime updates.",
  },
  {
    slug: "best-canva-templates",
    title: "Best Canva Templates — Editable Designs on Digisellix",
    heading: "Best Canva Templates",
    description: "Top Canva templates for Instagram, presentations, e-books, and marketing — fully editable, instant download.",
    match: { keywords: ["canva"] },
    intro:
      "Canva templates remove the blank canvas problem. This collection brings together the most popular Canva templates from Digisellix sellers — social media kits, presentation decks, lead magnets, e-book layouts, and branding bundles. Open the link, duplicate to your Canva account, swap your colors and copy, and ship. Every template is fully editable and delivered instantly.",
  },
  {
    slug: "top-ai-prompts",
    title: "Top AI Prompts — ChatGPT, Midjourney & More | Digisellix",
    heading: "Top AI Prompts",
    description: "Proven AI prompt packs for ChatGPT, Claude, Midjourney, and image models — productivity, marketing, and creative workflows.",
    match: { keywords: ["prompt", "ai"], categories: ["AI Tools & Prompts"] },
    intro:
      "The right prompt turns any AI model into a specialist. This page collects the top AI prompts on Digisellix — battle-tested prompt packs for ChatGPT, Claude, Midjourney, and Stable Diffusion, covering marketing copy, SEO, product research, image generation, coding assistants, and more. Each pack is downloadable instantly, with one-time pricing and no subscriptions.",
  },
  {
    slug: "trending-ebooks",
    title: "Trending E-books — Bestselling Digital Reads on Digisellix",
    heading: "Trending E-books",
    description: "Bestselling e-books on Digisellix — business, marketing, design, productivity, and creator playbooks. Instant PDF delivery.",
    match: { keywords: ["ebook", "e-book", "book", "guide"], categories: ["Education & Learning"] },
    intro:
      "These are the trending e-books on Digisellix right now — independent guides, playbooks, and deep dives written by practitioners across business, marketing, design, and the creator economy. Every e-book is delivered as an instant PDF download with lifetime access, and you support an indie author with every purchase.",
  },
];

export function matchLandingProducts<T extends ProductLike>(cfg: LandingConfig, products: T[]): T[] {
  const kw = cfg.match.keywords.map((k) => k.toLowerCase());
  const cats = (cfg.match.categories || []).map((c) => c.toLowerCase());
  return products.filter((p) => {
    const hay = `${p.title} ${p.description}`.toLowerCase();
    const matchKw = kw.some((k) => hay.includes(k));
    const matchCat = cats.length > 0 && cats.includes(p.category.toLowerCase());
    return matchKw || matchCat;
  });
}
