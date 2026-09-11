import { Link, useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { SITE_NAME, SITE_URL, breadcrumbJsonLd, categorySlug, faqJsonLd, truncate } from "@/lib/seo";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PublicSeller = {
  id: string;
  full_name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  country: string | null;
  created_at: string;
};

const SellerProfile = () => {
  const params = useParams();
  const key = params.id || params.slug || "";
  const isId = UUID_RE.test(key);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["seller-profile", key],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("public_sellers")
        .select("id, full_name, slug, description, avatar_url, country, created_at")
        .eq(isId ? "id" : "slug", key)
        .maybeSingle();
      if (error) throw error;
      return data as PublicSeller | null;
    },
    enabled: !!key,
  });

  const sellerId = profile?.id;

  const { data: products } = useQuery({
    queryKey: ["seller-products", sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", sellerId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  const name = profile?.full_name || "Seller";
  const categories = Array.from(new Set((products || []).map((p) => p.category)));
  const totalSales = (products || []).reduce((s, p) => s + (p.total_sales || 0), 0);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;
  const specialization = categories.length
    ? categories.slice(0, 3).join(", ")
    : "digital products";

  const path = profile?.slug ? `/store/${profile.slug}` : `/seller/${key}`;
  const faqs = [
    { q: `Who is ${name} on ${SITE_NAME}?`, a: `${name} is an independent creator on ${SITE_NAME} publishing ${specialization}. Every product is delivered instantly with secure global checkout.` },
    { q: `What does ${name} specialize in?`, a: `${name} focuses on ${specialization}, with ${products?.length || 0} active listing(s) on ${SITE_NAME}.` },
    { q: `How do I buy from ${name}?`, a: `Open any of ${name}'s products below, click Buy Now, and complete checkout. The download is available immediately after payment.` },
    { q: `Is buying from ${name} safe?`, a: `Yes. Every order on ${SITE_NAME} is processed through secure global payment providers, with buyer protection and instant access.` },
  ];

  if (!isLoading && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SEOHead title={`Seller not found | ${SITE_NAME}`} description="The seller you're looking for doesn't exist." path={path} noindex />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Seller not found</h1>
          <Link to="/products" className="text-primary underline">Browse products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SEOHead
        title={truncate(`${name} — ${specialization} on ${SITE_NAME}`, 60)}
        description={truncate(`Shop digital products by ${name} on ${SITE_NAME}. Specializing in ${specialization}. Instant download, secure checkout.`, 158)}
        path={path}
        image={profile?.avatar_url || null}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name,
            url: `${SITE_URL}${path}`,
            image: profile?.avatar_url || undefined,
            description: profile?.description || `Independent creator on ${SITE_NAME}.`,
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Sellers", url: "/products" },
            { name, url: path },
          ]),
          faqJsonLd(faqs),
        ]}
      />

      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={name} loading="lazy" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold">
                {name[0]}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{name}</h1>
              <p className="text-sm text-muted-foreground">
                {[profile?.country, memberSince ? `Joined ${memberSince}` : null].filter(Boolean).join(" • ")}
              </p>
            </div>
            <div className="flex gap-2 ml-auto">
              <div className="rounded-lg bg-card px-3 py-2 text-center">
                <div className="text-lg font-bold text-primary">{products?.length ?? 0}</div>
                <div className="text-[11px] text-muted-foreground">Products</div>
              </div>
              <div className="rounded-lg bg-card px-3 py-2 text-center">
                <div className="text-lg font-bold text-primary">{totalSales}</div>
                <div className="text-[11px] text-muted-foreground">Sales</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-xl font-bold mb-2">About {name}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {profile?.description ||
            `${name} is an independent digital creator on ${SITE_NAME}, publishing ${specialization}. Every product is reviewed for quality, delivered instantly after purchase, and backed by secure global payments. Follow this store to discover new releases.`}
        </p>

        <h2 className="text-xl font-bold mt-6 mb-2">Specialization</h2>
        <p className="text-sm text-muted-foreground">{name} specializes in {specialization}.</p>

        {categories.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-6 mb-2">Product Categories</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link key={c} to={`/category/${categorySlug(c)}`}>
                  <Badge variant="outline" className="hover:bg-secondary cursor-pointer">{c}</Badge>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="container mx-auto px-4 pb-8">
        <h2 className="text-xl font-bold mb-4">Products by {name}</h2>
        {!products ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {products.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`}>
                <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all overflow-hidden h-full">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={`${p.title} by ${name}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                  </div>
                  <CardContent className="p-3">
                    <Badge variant="secondary" className="mb-1.5 text-[10px] px-1.5 py-0">{p.category}</Badge>
                    <h3 className="text-sm font-semibold line-clamp-2 mb-1">{p.title}</h3>
                    <div className="text-base font-bold text-primary">${Number(p.price_usd).toFixed(2)}</div>
                  </CardContent>
                  <CardFooter className="p-3 pt-0">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs">View Details</Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        ) : <p className="text-muted-foreground">No active products yet.</p>}
      </section>

      <section className="container mx-auto px-4 pb-12 max-w-4xl">
        <h2 className="text-xl font-bold mb-3">FAQ about {name}</h2>
        <Accordion type="single" collapsible>
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`s-${i}`}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
};

export default SellerProfile;
