import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ShoppingBag, Zap, Globe, Shield, Star, TrendingUp, Sparkles } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import heroImage from "@/assets/hero-marketplace.jpg";
import iconProducts from "@/assets/icon-products.png";
import iconPayment from "@/assets/icon-payment.png";
import iconGlobal from "@/assets/icon-global.png";
import iconSecure from "@/assets/icon-secure.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const Home = () => {
  // Fetch featured products
  const { data: featuredProducts, isLoading: loadingFeatured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // Fetch popular products (sorted by total_sales)
  const { data: popularProducts, isLoading: loadingPopular } = useQuery({
    queryKey: ["popular-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("total_sales", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch newest products (sorted by created_at)
  const { data: newestProducts, isLoading: loadingNewest } = useQuery({
    queryKey: ["newest-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch regular products (at least 30)
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const ProductCard = ({ product }: { product: any }) => (
    <Link to={`/products/${product.id}`}>
      <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 overflow-hidden h-full">
        <div className="aspect-video overflow-hidden bg-muted">
          {product.thumbnail_url ? (
            <img
              src={product.thumbnail_url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-4xl">📦</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <Badge variant="secondary" className="mb-2">
            {product.category}
          </Badge>
          <h3 className="font-bold text-lg mb-2 line-clamp-2">
            {product.title}
          </h3>
          <div className="text-2xl font-bold text-primary">
            ${Number(product.price_usd).toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">
            Rp {Number(product.price_idr).toLocaleString('id-ID')}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button variant="outline" className="w-full">
            View Details
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );

  const ProductSkeleton = () => (
    <Card>
      <Skeleton className="aspect-video w-full" />
      <CardContent className="p-4">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-8 w-24" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${SITE_NAME} — Global Digital Product Marketplace`}
        description="Buy and sell digital products on Digisellix — templates, AI prompts, e-books, design assets, and software. Instant download, secure global checkout."
        path="/"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/products?q={search_term_string}`, "query-input": "required name=search_term_string" } },
          { "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        ]}
      />
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 py-12 sm:py-16 lg:py-20 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left duration-700">
              <div className="inline-block">
                <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary text-secondary-foreground rounded-full text-xs sm:text-sm font-semibold">
                  Global Digital Marketplace
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-7xl font-bold leading-tight">
                Buy & Sell Digital Products With Ease
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
                Global platform for creators to sell e-books, designs, music, software, templates, and much more.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto text-base sm:text-lg">
                    Start Selling Now
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
                <Link to="/products" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg">
                    View Products
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-in fade-in slide-in-from-right duration-700 delay-300">
              <img
                src={heroImage}
                alt="Digital Marketplace"
                className="rounded-2xl shadow-[var(--shadow-card-hover)] hover:scale-105 transition-transform duration-500 w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 space-y-3 sm:space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">How It Works</h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Start selling your digital products in 4 easy steps
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              { step: "01", title: "Create Account", desc: "Sign up free in seconds" },
              { step: "02", title: "Upload Product", desc: "Add file or download link" },
              { step: "03", title: "Receive Payment", desc: "Automatic & secure payment" },
              { step: "04", title: "Buyer Downloads", desc: "Instant access for buyers" },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="relative overflow-hidden group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-8">
                  <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 sm:mb-16 space-y-3 sm:space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Digisellix Advantages</h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Trusted marketplace platform with complete features for creators
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                icon: iconPayment,
                title: "Fast Payments",
                desc: "Receive payments from around the world securely",
              },
              {
                icon: iconGlobal,
                title: "Global Sellers",
                desc: "Sell to customers in various countries",
              },
              {
                icon: iconProducts,
                title: "Upload File or Link",
                desc: "Flexible to use file or external link",
              },
              {
                icon: iconSecure,
                title: "Modern Marketplace",
                desc: "Responsive and user-friendly platform",
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                className="text-center group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-8 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src={feature.icon} alt={feature.title} className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts && featuredProducts.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
                <Star className="h-5 w-5 text-accent fill-accent" />
                <span className="font-semibold text-accent">Featured Products</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">Premium Picks</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Handpicked premium products from top creators
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingFeatured
                ? [...Array(6)].map((_, i) => <ProductSkeleton key={i} />)
                : featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Products */}
      {popularProducts && popularProducts.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">Best Sellers</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">Popular Products</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Most purchased products by our community
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {loadingPopular
                ? [...Array(5)].map((_, i) => <ProductSkeleton key={i} />)
                : popularProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Newest Products */}
      {newestProducts && newestProducts.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full">
                <Sparkles className="h-5 w-5 text-accent" />
                <span className="font-semibold text-accent">Just Added</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">Newest Products</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Fresh products just added to the marketplace
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {loadingNewest
                ? [...Array(5)].map((_, i) => <ProductSkeleton key={i} />)
                : newestProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* All Products */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">Explore All Products</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Browse our complete collection of digital products
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loadingProducts
              ? [...Array(30)].map((_, i) => <ProductSkeleton key={i} />)
              : products?.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/products">
              <Button variant="hero" size="lg">
                View All Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container mx-auto px-4 text-center space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold px-4">
            Ready to Start Your Digital Business?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto opacity-90 px-4">
            Join thousands of creators who trust Digisellix
          </p>
          <Link to="/auth">
            <Button
              variant="secondary"
              size="lg"
              className="text-base sm:text-lg bg-white text-primary hover:bg-white/90 font-bold"
            >
              Start Free Now
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Digisellix</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Global marketplace for digital products
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/products" className="hover:text-primary">Browse Products</Link></li>
                <li><Link to="/auth" className="hover:text-primary">Sell Products</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Terms</a></li>
                <li><a href="#" className="hover:text-primary">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2024 Digisellix. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
