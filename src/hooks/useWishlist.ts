import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useWishlist(productId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && productId) {
      checkWishlist();
    } else {
      setIsInWishlist(false);
    }
  }, [user, productId]);

  const checkWishlist = async () => {
    if (!user || !productId) return;
    
    const { data } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();
    
    setIsInWishlist(!!data);
  };

  const toggleWishlist = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your wishlist",
        variant: "destructive",
      });
      return;
    }

    if (!productId) return;

    setIsLoading(true);
    try {
      if (isInWishlist) {
        await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        
        setIsInWishlist(false);
        toast({
          title: "Removed from wishlist",
          description: "Product removed from your wishlist",
        });
      } else {
        await supabase
          .from("wishlists")
          .insert({ user_id: user.id, product_id: productId });
        
        setIsInWishlist(true);
        toast({
          title: "Added to wishlist",
          description: "Product saved to your wishlist",
        });
      }
    } catch (error) {
      console.error("Wishlist error:", error);
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { isInWishlist, isLoading, toggleWishlist };
}

export function useWishlistItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setItems([]);
      setIsLoading(false);
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("wishlists")
      .select(`
        id,
        created_at,
        product_id,
        products (
          id,
          title,
          description,
          price_usd,
          price_idr,
          thumbnail_url,
          category,
          total_sales,
          seller_id,
          profiles:seller_id (full_name)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setItems(data);
    }
    setIsLoading(false);
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;
    
    await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);
    
    setItems(items.filter(item => item.product_id !== productId));
  };

  return { items, isLoading, removeFromWishlist, refetch: fetchWishlist };
}
