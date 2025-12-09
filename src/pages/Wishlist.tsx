import { Navigation } from "@/components/Navigation";
import { ProductCard } from "@/components/ProductCard";
import { useWishlistItems } from "@/hooks/useWishlist";
import { useLanguage } from "@/contexts/LanguageContext";
import { Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const WishlistSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="aspect-video w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

const Wishlist = () => {
  const { t } = useLanguage();
  const { items, isLoading } = useWishlistItems();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('wishlist.title')}</h1>
            <p className="text-muted-foreground">{t('wishlist.subtitle')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <WishlistSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('wishlist.empty')}</h2>
            <p className="text-muted-foreground mb-6">{t('wishlist.emptyDesc')}</p>
            <Link to="/products">
              <Button className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                {t('wishlist.browseProducts')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((item) => (
              <ProductCard 
                key={item.id} 
                product={item.products}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Wishlist;
