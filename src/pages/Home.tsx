import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, ShoppingBag, Star, TrendingUp, Sparkles, MessageCircle, Quote, Crown } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import heroImage from "@/assets/hero-marketplace.jpg";
import iconProducts from "@/assets/icon-products.png";
import iconPayment from "@/assets/icon-payment.png";
import iconGlobal from "@/assets/icon-global.png";
import iconSecure from "@/assets/icon-secure.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const { t } = useLanguage();

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

  // Fetch regular products (20 for 4 rows x 5 columns)
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest reviews with product and buyer info
  const { data: latestReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["latest-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          buyer_id,
          order_id
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;

      // Fetch buyer profiles and orders with products for each review
      const reviewsWithDetails = await Promise.all(
        (data || []).map(async (review) => {
          const [buyerResult, orderResult] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", review.buyer_id).maybeSingle(),
            supabase.from("orders").select("product_id").eq("id", review.order_id).maybeSingle()
          ]);

          let product = null;
          if (orderResult.data?.product_id) {
            const productResult = await supabase
              .from("products")
              .select("id, title, thumbnail_url")
              .eq("id", orderResult.data.product_id)
              .maybeSingle();
            product = productResult.data;
          }

          return {
            ...review,
            buyer_name: buyerResult.data?.full_name || "Anonymous",
            product
          };
        })
      );

      return reviewsWithDetails;
    },
  });

  // Fetch popular sellers this month (top 3 by sales count)
  const { data: popularSellers, isLoading: loadingSellers } = useQuery({
    queryKey: ["popular-sellers-month"],
    queryFn: async () => {
      // Get the first day of the current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get all paid orders from this month
      const { data: orders, error } = await supabase
        .from("orders")
        .select("seller_id")
        .eq("payment_status", "paid")
        .gte("paid_at", firstDayOfMonth.toISOString());
      
      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      // Count sales per seller
      const salesCount: Record<string, number> = {};
      orders.forEach((order) => {
        if (order.seller_id) {
          salesCount[order.seller_id] = (salesCount[order.seller_id] || 0) + 1;
        }
      });

      // Sort and get top 3
      const topSellerIds = Object.entries(salesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id, count]) => ({ id, count }));

      if (topSellerIds.length === 0) return [];

      // Fetch seller profiles
      const sellerProfiles = await Promise.all(
        topSellerIds.map(async ({ id, count }) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, description")
            .eq("id", id)
            .maybeSingle();

          // Get total products count for this seller
          const { count: productsCount } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("seller_id", id)
            .eq("status", "active");

          return {
            ...profile,
            sales_count: count,
            products_count: productsCount || 0
          };
        })
      );

      return sellerProfiles.filter(Boolean);
    },
  });

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

  const ProductSkeletonCompact = () => (
    <Card>
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-2 sm:p-3">
        <Skeleton className="h-3 w-12 mb-1" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-5 w-16" />
      </CardContent>
    </Card>
  );

  const howItWorksSteps = [
    { step: "01", title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.desc') },
    { step: "02", title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.desc') },
    { step: "03", title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.desc') },
    { step: "04", title: t('howItWorks.step4.title'), desc: t('howItWorks.step4.desc') },
  ];

  const advantages = [
    { icon: iconPayment, title: t('advantages.payments.title'), desc: t('advantages.payments.desc') },
    { icon: iconGlobal, title: t('advantages.global.title'), desc: t('advantages.global.desc') },
    { icon: iconProducts, title: t('advantages.upload.title'), desc: t('advantages.upload.desc') },
    { icon: iconSecure, title: t('advantages.platform.title'), desc: t('advantages.platform.desc') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Digisellix - Buy & Sell Digital Products | Templates, Design Assets & More"
        description="Discover premium digital products on Digisellix. Buy editable design bundles, templates, PLR resources, software & creative assets. Start selling your digital products today."
        canonicalUrl="https://digisellix.com/"
        keywords="buy digital products, sell digital products online, design bundles download, PLR design resources, digital assets for creators"
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
                  {t('hero.badge')}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-7xl font-bold leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto text-base sm:text-lg">
                    {t('hero.startSelling')}
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </Link>
                <Link to="/products" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg">
                    {t('hero.viewProducts')}
                  </Button>
                </Link>
                <Link to="/products" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base sm:text-lg">
                    {t('hero.escrow')}
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
      <section className="py-8 sm:py-10 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">{t('howItWorks.title')}</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('howItWorks.subtitle')}
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {howItWorksSteps.map((item, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-[140px] sm:w-auto sm:flex-1 bg-card rounded-lg p-3 sm:p-4 border border-border hover:shadow-md transition-all"
              >
                <div className="text-2xl sm:text-3xl font-bold text-primary/20 mb-1">{item.step}</div>
                <h3 className="text-sm sm:text-base font-bold mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 sm:py-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">{t('advantages.title')}</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('advantages.subtitle')}
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {advantages.map((feature, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-[140px] sm:w-auto sm:flex-1 bg-card rounded-lg p-3 sm:p-4 border border-border hover:shadow-md transition-all text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-2">
                  <img src={feature.icon} alt={feature.title} className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
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
                <span className="font-semibold text-accent">{t('featured.badge')}</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">{t('featured.title')}</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('featured.subtitle')}
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

      {/* Popular Sellers This Month */}
      {popularSellers && popularSellers.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">{t('popularSellers.badge')}</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">{t('popularSellers.title')}</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('popularSellers.subtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {loadingSellers
                ? [...Array(3)].map((_, i) => (
                    <Card key={i} className="p-6">
                      <div className="flex flex-col items-center text-center">
                        <Skeleton className="h-20 w-20 rounded-full mb-4" />
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-24 mb-4" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </Card>
                  ))
                : popularSellers.map((seller, index) => (
                    <Card key={seller?.id} className="p-6 hover:shadow-lg transition-shadow relative overflow-hidden">
                      {index === 0 && (
                        <div className="absolute top-0 right-0 bg-yellow-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                          #1
                        </div>
                      )}
                      {index === 1 && (
                        <div className="absolute top-0 right-0 bg-gray-400 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                          #2
                        </div>
                      )}
                      {index === 2 && (
                        <div className="absolute top-0 right-0 bg-amber-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                          #3
                        </div>
                      )}
                      <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 mb-4 border-4 border-primary/20">
                          <AvatarImage src={seller?.avatar_url || undefined} />
                          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                            {seller?.full_name?.charAt(0)?.toUpperCase() || "S"}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg font-bold mb-1">{seller?.full_name}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {seller?.description || t('popularSellers.noDescription')}
                        </p>
                        <div className="flex items-center gap-4 text-sm mb-4">
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{seller?.sales_count}</span>
                            <span className="text-muted-foreground">{t('popularSellers.sales')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{seller?.products_count}</span>
                            <span className="text-muted-foreground">{t('popularSellers.products')}</span>
                          </div>
                        </div>
                        <Link to={`/seller/${seller?.id}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full">
                            {t('popularSellers.viewStore')}
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Products */}
      {popularProducts && popularProducts.length > 0 && (
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">{t('popular.badge')}</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">{t('popular.title')}</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('popular.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
              {loadingPopular
                ? [...Array(5)].map((_, i) => <ProductSkeletonCompact key={i} />)
                : popularProducts.map((product) => (
                    <ProductCard key={product.id} product={product} compact />
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
                <span className="font-semibold text-accent">{t('newest.badge')}</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">{t('newest.title')}</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('newest.subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
              {loadingNewest
                ? [...Array(5)].map((_, i) => <ProductSkeletonCompact key={i} />)
                : newestProducts.map((product) => (
                    <ProductCard key={product.id} product={product} compact />
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Reviews */}
      {latestReviews && latestReviews.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <Quote className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">{t('reviews.badge')}</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">{t('reviews.title')}</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('reviews.subtitle')}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {loadingReviews
                ? [...Array(5)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-4 w-20 mb-3" />
                      <Skeleton className="h-16 w-full mb-3" />
                      <Skeleton className="h-4 w-32" />
                    </Card>
                  ))
                : latestReviews.map((review) => (
                    <Card key={review.id} className="p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        "{review.comment || t('reviews.noComment')}"
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {review.buyer_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{review.buyer_name}</span>
                      </div>
                      {review.product && (
                        <Link
                          to={`/products/${review.product.id}`}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          {review.product.thumbnail_url && (
                            <img
                              src={review.product.thumbnail_url}
                              alt={review.product.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <span className="text-xs font-medium line-clamp-2 flex-1">
                            {review.product.title}
                          </span>
                        </Link>
                      )}
                    </Card>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* All Products */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">{t('explore.title')}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('explore.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {loadingProducts
              ? [...Array(20)].map((_, i) => <ProductSkeletonCompact key={i} />)
              : products?.slice(0, 20).map((product) => (
                  <ProductCard key={product.id} product={product} compact />
                ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/products">
              <Button variant="hero" size="lg">
                {t('explore.viewAll')}
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
            {t('cta.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto opacity-90 px-4">
            {t('cta.subtitle')}
          </p>
          <Link to="/auth">
            <Button
              variant="secondary"
              size="lg"
              className="text-base sm:text-lg bg-white text-primary hover:bg-white/90 font-bold"
            >
              {t('cta.button')}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Language Switcher */}
      <div className="bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <LanguageSwitcher />
        </div>
      </div>

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
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/products" className="hover:text-primary">{t('footer.browseProducts')}</Link></li>
                <li><Link to="/auth" className="hover:text-primary">{t('footer.sellProducts')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary">{t('footer.about')}</Link></li>
                <li><Link to="/contact" className="hover:text-primary">{t('footer.contact')}</Link></li>
                <li><Link to="/blog" className="hover:text-primary">{t('nav.blog') || 'Blog'}</Link></li>
                <li>
                  <a 
                    href="https://wa.me/6283822199640?text=Hello!%20I%20need%20assistance%20with%20Digisellix." 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary inline-flex items-center gap-1"
                  >
                    <MessageCircle className="h-3 w-3" />
                    {t('footer.contactAdmin')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/terms" className="hover:text-primary">{t('footer.terms')}</Link></li>
                <li><Link to="/privacy" className="hover:text-primary">{t('footer.privacy')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            {t('footer.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
