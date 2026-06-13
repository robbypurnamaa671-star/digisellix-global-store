import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, Shield, ArrowLeft, User, ShoppingCart } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import {
  breadcrumbJsonLd,
  categorySlug,
  faqJsonLd,
  productAudience,
  productBenefits,
  productFAQ,
  productJsonLd,
  productMetaDescription,
  productMetaTitle,
  productOverview,
  productUseCases,
} from "@/lib/seo";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: seller } = useQuery({
    queryKey: ["seller", product?.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", product?.seller_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!product?.seller_id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", product?.category)
        .eq("status", "active")
        .neq("id", id)
        .limit(4);

      if (error) throw error;
      return data;
    },
    enabled: !!product?.category,
  });

  const { data: sellerProducts } = useQuery({
    queryKey: ["seller-products", product?.seller_id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", product?.seller_id)
        .eq("status", "active")
        .neq("id", id)
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!product?.seller_id,
  });

  const handleBuyNow = async () => {
    if (!user) {
      toast.error("Please sign in to purchase");
      navigate("/auth");
      return;
    }

    if (user.id === product?.seller_id) {
      toast.error("You cannot buy your own product");
      return;
    }

    // Create order and navigate to checkout
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          seller_id: product.seller_id,
          product_id: product.id,
          amount_usd: product.price_usd,
          amount_idr: product.price_idr,
          currency: "USD", // Default to USD, can be changed in checkout
          payment_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Order created! Redirecting to checkout...");
      // Navigate to checkout page (to be created)
      navigate(`/checkout/${order.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
    }
  };

  if (productLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-40 mb-8" />
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-video rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Product not found</h2>
            <p className="text-muted-foreground mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate("/products")}>
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const faqs = productFAQ(product);
  const overview = productOverview(product);
  const benefits = productBenefits(product);
  const useCases = productUseCases(product);
  const audience = productAudience(product);
  const path = `/products/${product.id}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={productMetaTitle(product)}
        description={productMetaDescription(product)}
        path={path}
        image={product.thumbnail_url}
        type="product"
        jsonLd={[
          productJsonLd({ ...product, id: product.id, seller_name: seller?.full_name }),
          breadcrumbJsonLd([
            { name: "Home", url: "/" },
            { name: "Products", url: "/products" },
            { name: product.category, url: `/category/${categorySlug(product.category)}` },
            { name: product.title, url: path },
          ]),
          faqJsonLd(faqs),
        ]}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12 lg:mb-16">
          {/* Product Image */}
          <div>
            <div className="aspect-video rounded-xl lg:rounded-2xl overflow-hidden shadow-[var(--shadow-card-hover)]">
              {product.thumbnail_url ? (
                <img
                  src={product.thumbnail_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-6xl">📦</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <Badge variant="secondary" className="mb-2 sm:mb-3">
                {product.category}
              </Badge>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">{product.title}</h1>
              
              <div className="flex items-center gap-3 mb-4">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  By{" "}
                  <Link to={`/seller/${product.seller_id}`} className="font-semibold text-foreground hover:text-primary">
                    {seller?.full_name || "Seller"}
                  </Link>
                </div>
                {product.total_sales > 0 && (
                  <div className="text-sm text-muted-foreground">
                    • {product.total_sales} sales
                  </div>
                )}
              </div>
              
              <div className="space-y-1 sm:space-y-2">
                <div className="text-3xl sm:text-4xl font-bold text-primary">
                  ${Number(product.price_usd).toFixed(2)}
                </div>
                <div className="text-lg sm:text-xl text-muted-foreground">
                  Rp {Number(product.price_idr).toLocaleString("id-ID")}
                </div>
              </div>
            </div>

            <Card className="bg-secondary/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Secure Purchase</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Instant access after payment. All files are scanned and verified.
                </p>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full text-lg"
                  onClick={handleBuyNow}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Buy Now
                </Button>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Product Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Link to={`/category/${categorySlug(product.category)}`} className="font-medium hover:text-primary">
                    {product.category}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Sales</span>
                  <span className="font-medium">{product.total_sales}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listed on</span>
                  <span className="font-medium">
                    {new Date(product.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEO content block — generated from product data */}
        <section className="max-w-4xl mx-auto mb-12 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-3">Product Overview</h2>
            <p className="text-muted-foreground leading-relaxed">{overview}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Key Benefits</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {benefits.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Use Cases</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              {useCases.map((u, i) => <li key={i}>{u}</li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Who Is This For?</h2>
            <p className="text-muted-foreground leading-relaxed">{audience}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`p-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct.id} to={`/products/${relatedProduct.id}`}>
                  <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 overflow-hidden h-full">
                    <div className="aspect-video overflow-hidden bg-muted">
                      {relatedProduct.thumbnail_url ? (
                        <img
                          src={relatedProduct.thumbnail_url}
                          alt={relatedProduct.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <span className="text-4xl">📦</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">
                        {relatedProduct.title}
                      </h3>
                      <div className="text-xl font-bold text-primary">
                        ${Number(relatedProduct.price_usd).toFixed(2)}
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button variant="outline" className="w-full" size="sm">
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {sellerProducts && sellerProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">More From {seller?.full_name || "This Seller"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {sellerProducts.map((sp) => (
                <Link key={sp.id} to={`/products/${sp.id}`}>
                  <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all overflow-hidden h-full">
                    <div className="aspect-video overflow-hidden bg-muted">
                      {sp.thumbnail_url ? (
                        <img src={sp.thumbnail_url} alt={`${sp.title} by ${seller?.full_name || "seller"}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold line-clamp-2 mb-2">{sp.title}</h3>
                      <div className="text-xl font-bold text-primary">${Number(sp.price_usd).toFixed(2)}</div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button variant="outline" size="sm" className="w-full">View Details</Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="mt-4">
              <Link to={`/seller/${product.seller_id}`} className="text-primary hover:underline">View all products from {seller?.full_name || "this seller"} →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
