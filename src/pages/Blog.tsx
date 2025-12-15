import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { SEOHead, generateBreadcrumbSchema } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const Blog = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["blog-posts", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select(`
          *,
          blog_categories(name, slug),
          profiles(full_name)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (selectedCategory) {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://digisellix.com/" },
    { name: "Blog", url: "https://digisellix.com/blog" },
  ]);

  const PostSkeleton = () => (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Blog | Digital Product Tips, Guides & Resources - Digisellix"
        description="Explore our blog for expert guides on selling digital products, design tips, creator resources, and strategies to grow your online business."
        canonicalUrl="https://digisellix.com/blog"
        keywords="digital product blog, selling digital products guide, design resources tips, creator economy, online business strategies"
        structuredData={breadcrumbSchema}
      />
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-12 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            {t("blog.title") || "Digisellix Blog"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("blog.subtitle") || "Tips, guides, and resources for digital creators and sellers"}
          </p>
        </div>
      </section>

      {/* Category Filter */}
      {categories && categories.length > 0 && (
        <section className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Posts
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {postsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="overflow-hidden h-full group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-video overflow-hidden bg-muted">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                          <span className="text-4xl">📝</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 sm:p-6 space-y-3">
                      {post.blog_categories && (
                        <Badge variant="secondary" className="text-xs">
                          {post.blog_categories.name}
                        </Badge>
                      )}
                      <h2 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                        {post.profiles && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{post.profiles.full_name}</span>
                          </div>
                        )}
                        {post.published_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(post.published_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold mb-2">No posts yet</h2>
              <p className="text-muted-foreground mb-6">
                Check back soon for helpful articles and guides.
              </p>
              <Link to="/products">
                <Button>
                  Browse Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to Start Selling?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of creators selling digital products on Digisellix.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/products">
              <Button variant="outline" size="lg">
                Browse Products
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero" size="lg">
                Start Selling
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog;
