import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  MessageCircle, 
  Package, 
  ShoppingBag,
  Calendar,
  AlertTriangle,
  Star
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SellerReviews } from "@/components/reviews/SellerReviews";

const SellerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startingChat, setStartingChat] = useState(false);

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ["seller-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
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
    enabled: !!id,
  });

  const totalSales = products?.reduce((sum, p) => sum + (p.total_sales || 0), 0) || 0;

  // Fetch average rating
  const { data: reviewStats } = useQuery({
    queryKey: ["seller-review-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", id);

      if (error) throw error;
      
      if (!data || data.length === 0) return { average: 0, count: 0 };
      
      const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return { average: parseFloat(average.toFixed(1)), count: data.length };
    },
    enabled: !!id,
  });

  const handleChatWithSeller = async () => {
    if (!user) {
      toast.error("Please sign in to chat with seller");
      navigate("/auth");
      return;
    }

    if (user.id === id) {
      toast.error("This is your own profile");
      return;
    }

    setStartingChat(true);
    try {
      // Check if conversation already exists (without product)
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", id)
        .is("product_id", null)
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
          seller_id: id,
          product_id: null,
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

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (sellerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-40 mb-8" />
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="space-y-4 flex-1">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Seller not found</h2>
            <p className="text-muted-foreground mb-6">
              The seller you're looking for doesn't exist.
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

        {/* Limited Account Warning */}
        {seller.is_limited && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Limited Account</AlertTitle>
            <AlertDescription>
              This seller's account is currently limited due to low ratings. 
              Please be cautious when making purchases.
            </AlertDescription>
          </Alert>
        )}

        {/* Seller Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              <Avatar className="h-24 w-24 md:h-32 md:w-32">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl md:text-3xl">
                  {getInitials(seller.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {seller.full_name}
                  </h1>
                  {seller.is_limited && (
                    <Badge variant="destructive">Limited</Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>{products?.length || 0} Products</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="h-4 w-4" />
                    <span>{totalSales} Sales</span>
                  </div>
                  {reviewStats && reviewStats.count > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{reviewStats.average} ({reviewStats.count} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(seller.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {user?.id !== id && (
                  <Button
                    onClick={handleChatWithSeller}
                    disabled={startingChat}
                    className="gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {startingChat ? "Starting Chat..." : "Chat with Seller"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller's Products */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Products by {seller.full_name}</h2>
          
          {productsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
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
                      {product.total_sales > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {product.total_sales} sales
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground">
                This seller hasn't listed any products yet.
              </p>
            </div>
          )}
        </div>

        {/* Seller Reviews Section */}
        <div className="mt-12">
          <SellerReviews sellerId={id!} />
        </div>
      </div>
    </div>
  );
};

export default SellerPage;
