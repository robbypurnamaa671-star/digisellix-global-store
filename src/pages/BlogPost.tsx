import { Link, useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { SITE_NAME, SITE_URL, breadcrumbJsonLd, truncate } from "@/lib/seo";

const BlogPost = () => {
  const { slug = "" } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <Skeleton className="h-10 w-3/4 mb-6" />
          <Skeleton className="h-72 w-full mb-6" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <SEOHead title={`Article not found | ${SITE_NAME}`} description="The article you requested doesn't exist." path={`/blog/${slug}`} noindex />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <Link to="/blog" className="text-primary underline">Back to blog</Link>
        </div>
      </div>
    );
  }

  const path = `/blog/${post.slug}`;
  const title = truncate(post.meta_title || `${post.title} | ${SITE_NAME}`, 60);
  const description = truncate(post.meta_description || post.excerpt || post.content.slice(0, 160), 158);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SEOHead
        title={title}
        description={description}
        path={path}
        image={post.featured_image}
        type="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description,
            image: post.featured_image || undefined,
            datePublished: post.published_at || post.created_at,
            dateModified: post.updated_at,
            mainEntityOfPage: `${SITE_URL}${path}`,
            publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          },
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: path },
          ]),
        ]}
      />
      <article className="container mx-auto px-4 py-10 max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
          <Link to="/blog" className="hover:text-primary">Blog</Link> › <span className="text-foreground">{post.title}</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">{post.title}</h1>
        {post.published_at && (
          <p className="text-sm text-muted-foreground mb-6">
            Published {new Date(post.published_at).toLocaleDateString()}
          </p>
        )}
        {post.featured_image && (
          <img src={post.featured_image} alt={post.title} className="w-full rounded-xl mb-6" loading="lazy" />
        )}
        <div className="prose prose-neutral max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
          {post.content}
        </div>
      </article>
    </div>
  );
};

export default BlogPost;
