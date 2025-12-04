import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    category: string;
    price_usd: number;
    price_idr: number;
    thumbnail_url: string | null;
    seller_id: string;
  };
  compact?: boolean;
}

export const ProductCard = ({ product, compact = false }: ProductCardProps) => {
  const { data: sellerRating } = useQuery({
    queryKey: ["seller-rating", product.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", product.seller_id);

      if (error) throw error;
      
      if (!data || data.length === 0) return null;
      
      const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return { average: parseFloat(average.toFixed(1)), count: data.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  const isTopRated = sellerRating && sellerRating.average >= 4.5 && sellerRating.count >= 3;

  if (compact) {
    return (
      <Link to={`/products/${product.id}`}>
        <Card className="group hover:shadow-md transition-all duration-300 hover:scale-[1.02] overflow-hidden h-full relative">
          {isTopRated && (
            <div className="absolute top-1 right-1 z-10">
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-sm gap-0.5 text-[10px] px-1.5 py-0.5">
                <Star className="h-2.5 w-2.5 fill-white" />
                Top
              </Badge>
            </div>
          )}
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            {product.thumbnail_url ? (
              <img
                src={product.thumbnail_url}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-2xl">📦</span>
              </div>
            )}
          </div>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between gap-1 mb-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 truncate">
                {product.category}
              </Badge>
              {sellerRating && (
                <div className="flex items-center gap-0.5 text-xs shrink-0">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{sellerRating.average}</span>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-xs sm:text-sm mb-1 line-clamp-2 leading-tight">
              {product.title}
            </h3>
            <div className="text-sm sm:text-base font-bold text-primary">
              ${Number(product.price_usd).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/products/${product.id}`}>
      <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 overflow-hidden h-full relative">
        {isTopRated && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-md gap-1">
              <Star className="h-3 w-3 fill-white" />
              Top Rated
            </Badge>
          </div>
        )}
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
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary">
              {product.category}
            </Badge>
            {sellerRating && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{sellerRating.average}</span>
                <span className="text-muted-foreground text-xs">({sellerRating.count})</span>
              </div>
            )}
          </div>
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
};
