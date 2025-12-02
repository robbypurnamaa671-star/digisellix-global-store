import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Shield, ArrowLeft, User, ShoppingCart, MessageCircle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startingChat, setStartingChat] = useState(false);

  // Track product view
  useEffect(() => {
    const trackView = async () => {
      if (!id) return;
      
      // Generate session ID if not exists
      let sessionId = sessionStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("session_id", sessionId);
      }

      try {
        await supabase.from("product_views").insert({
          product_id: id,
          viewer_id: user?.id || null,
          session_id: sessionId,
          referrer: document.referrer || null,
        });
      } catch (error) {
        console.error("Failed to track view:", error);
      }
    };

    trackView();
  }, [id, user]);

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

  const handleChatWithSeller = async () => {
    if (!user) {
      toast.error("Please sign in to chat with seller");
      navigate("/auth");
      return;
    }

    if (user.id === product?.seller_id) {
      toast.error("This is your own product");
      return;
    }

    setStartingChat(true);
    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", product.seller_id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existingConv) {
        navigate(`/chat?conversation=${existingConv.id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          buyer_id: user.id,
          seller_id: product.seller_id,
          product_id: product.id,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/chat?conversation=${newConv.id}`);
    } catch (error: any) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat");
    } finally {
      setStartingChat(false);
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

  return (
    <div className="min-h-screen bg-background">
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
                  <span className="font-semibold text-foreground">
                    {seller?.full_name || "Seller"}
                  </span>
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
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleChatWithSeller}
                  disabled={startingChat || user?.id === product.seller_id}
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  {startingChat ? "Starting..." : "Chat with Seller"}
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
                  <span className="font-medium">{product.category}</span>
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
      </div>
    </div>
  );
};

export default ProductDetail;
