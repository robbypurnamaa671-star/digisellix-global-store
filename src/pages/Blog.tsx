import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { SITE_NAME, SITE_URL, breadcrumbJsonLd, truncate } from "@/lib/seo";

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, featured_image, published_at, meta_description")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SEOHead
        title={`Blog — Digital Product Insights | ${SITE_NAME}`}
        description={`Articles, guides, and creator interviews from ${SITE_NAME} — the global marketplace for digital products.`}
        path="/blog"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: `${SITE_NAME} Blog`,
            url: `${SITE_URL}/blog`,
          },
          breadcrumbJsonLd([{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }]),
        ]}
      />

      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Digisellix Blog</h1>
          <p className="text-muted-foreground max-w-2xl">Guides, news, and creator stories from the global digital product marketplace.</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : posts && posts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`}>
                <Card className="h-full overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-all">
                  {p.featured_image && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img src={p.featured_image} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h2 className="font-bold text-lg mb-2 line-clamp-2">{p.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-3">{truncate(p.excerpt || p.meta_description || "", 160)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No posts published yet. Check back soon.</p>
        )}
      </section>
    </div>
  );
};

export default Blog;
