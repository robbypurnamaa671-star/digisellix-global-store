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
import {
  SITE_NAME,
  breadcrumbJsonLd,
  categoryFAQ,
  categoryGuide,
  categoryIntro,
  categorySlug,
  faqJsonLd,
  findCategoryName,
  truncate,
} from "@/lib/seo";

const CategoryDetail = () => {
  const { slug = "" } = useParams();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const categoryName = categories ? findCategoryName(slug, categories) : undefined;

  const { data: products, isLoading } = useQuery({
    queryKey: ["category-products", categoryName],
    enabled: !!categoryName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .eq("category", categoryName!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (categories && !categoryName) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SEOHead title={`Category not found | ${SITE_NAME}`} description="The category you requested doesn't exist." path={`/category/${slug}`} noindex />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Link to="/products" className="text-primary underline">Browse all products</Link>
        </div>
      </div>
    );
  }

  const name = categoryName || "Category";
  const intro = categoryIntro(name);
  const guide = categoryGuide(name);
  const faqs = categoryFAQ(name);
  const path = `/category/${slug}`;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SEOHead
        title={truncate(`Best ${name} — Digital Marketplace | ${SITE_NAME}`, 60)}
        description={truncate(`Browse the best ${name.toLowerCase()} on ${SITE_NAME}. Instant download, verified creators, secure checkout.`, 158)}
        path={path}
        jsonLd={[
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Products", url: "/products" },
            { name, url: path },
          ]),
          faqJsonLd(faqs),
        ]}
      />

      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-10">
        <div className="container mx-auto px-4">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-3">
            <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
            <Link to="/products" className="hover:text-primary">Products</Link> › <span className="text-foreground">{name}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Best {name} on {SITE_NAME}</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">{intro}</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-6">Top {name} Products</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : products && products.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`}>
                <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all overflow-hidden h-full">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={`${p.title} – ${name} on ${SITE_NAME}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
        ) : (
          <p className="text-muted-foreground">No products in this category yet. Check back soon.</p>
        )}
      </section>

      <section className="container mx-auto px-4 py-10 max-w-4xl">
        <h2 className="text-2xl font-bold mb-4">{name} Buying Guide</h2>
        <p className="text-muted-foreground leading-relaxed">{guide}</p>
      </section>

      <section className="container mx-auto px-4 pb-16 max-w-4xl">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions about {name}</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-10">
          <h2 className="text-xl font-bold mb-3">Explore other categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories?.filter((c) => c.name !== name).map((c) => (
              <Link key={c.name} to={`/category/${categorySlug(c.name)}`}>
                <Badge variant="outline" className="hover:bg-secondary cursor-pointer">{c.name}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CategoryDetail;
