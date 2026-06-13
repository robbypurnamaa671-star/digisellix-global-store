import { Link, useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { LANDING_PAGES, SITE_NAME, breadcrumbJsonLd, matchLandingProducts, truncate } from "@/lib/seo";

const Landing = () => {
  const { slug = "" } = useParams();
  const cfg = LANDING_PAGES.find((l) => l.slug === slug);

  const { data: products } = useQuery({
    queryKey: ["landing-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("total_sales", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });

  if (!cfg) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SEOHead title={`Page not found | ${SITE_NAME}`} description="Page not found." path={`/${slug}`} noindex />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
        </div>
      </div>
    );
  }

  const matched = products ? matchLandingProducts(cfg, products) : [];
  const fallback = products?.slice(0, 8) ?? [];
  const display = matched.length ? matched : fallback;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SEOHead
        title={truncate(cfg.title, 60)}
        description={truncate(cfg.description, 158)}
        path={`/${cfg.slug}`}
        jsonLd={[
          breadcrumbJsonLd([{ name: "Home", url: "/" }, { name: cfg.heading, url: `/${cfg.slug}` }]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: cfg.heading,
            itemListElement: display.slice(0, 20).map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `https://digisellix-global-store.lovable.app/products/${p.id}`,
              name: p.title,
            })),
          },
        ]}
      />

      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{cfg.heading}</h1>
          <p className="text-muted-foreground max-w-3xl">{cfg.intro}</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-6">{matched.length ? `Top ${cfg.heading}` : `Trending picks from ${SITE_NAME}`}</h2>
        {display.length === 0 ? (
          <p className="text-muted-foreground">No matching products right now. Browse <Link to="/products" className="text-primary underline">all products</Link>.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {display.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`}>
                <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all overflow-hidden h-full">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={`${p.title} — ${cfg.heading}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="mb-2">{p.category}</Badge>
                    <h3 className="font-bold line-clamp-2 mb-2">{p.title}</h3>
                    <div className="text-xl font-bold text-primary">${Number(p.price_usd).toFixed(2)}</div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button variant="outline" size="sm" className="w-full">View Details</Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Landing;
