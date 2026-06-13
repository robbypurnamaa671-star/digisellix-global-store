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

const SellerProfile = () => {
  const { id = "" } = useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["seller-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, description, avatar_url, country")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["seller-products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const name = profile?.full_name || "Seller";
  const categories = Array.from(new Set((products || []).map((p) => p.category)));
  const specialization = categories.length
    ? categories.slice(0, 3).join(", ")
    : "digital products";

  const path = `/seller/${id}`;
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

      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold">
                {name[0]}
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{name}</h1>
              {profile?.country && <p className="text-muted-foreground">{profile.country}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10 max-w-4xl">
        <h2 className="text-2xl font-bold mb-3">About {name}</h2>
        <p className="text-muted-foreground leading-relaxed">
          {profile?.description ||
            `${name} is an independent digital creator on ${SITE_NAME}, publishing ${specialization}. Every product is reviewed for quality, delivered instantly after purchase, and backed by secure global payments. Follow this store to discover new releases.`}
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-3">Specialization</h2>
        <p className="text-muted-foreground">{name} specializes in {specialization}.</p>

        {categories.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mt-8 mb-3">Product Categories</h2>
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

      <section className="container mx-auto px-4 pb-10">
        <h2 className="text-2xl font-bold mb-6">Products by {name}</h2>
        {!products ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : products.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`}>
                <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all overflow-hidden h-full">
                  <div className="aspect-video overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={`${p.title} by ${name}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
        ) : <p className="text-muted-foreground">No active products yet.</p>}
      </section>

      <section className="container mx-auto px-4 pb-16 max-w-4xl">
        <h2 className="text-2xl font-bold mb-4">FAQ about {name}</h2>
        <Accordion type="single" collapsible>
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`s-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
};

export default SellerProfile;
