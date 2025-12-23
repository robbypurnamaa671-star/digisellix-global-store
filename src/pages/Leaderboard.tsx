import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Trophy, ShoppingBag, Package, Star, TrendingUp, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SellerStats {
  id: string;
  full_name: string;
  avatar_url: string | null;
  description: string | null;
  sales_count: number;
  products_count: number;
  avg_rating: number;
  total_reviews: number;
}

const Leaderboard = () => {
  const { t } = useLanguage();

  // Fetch monthly seller rankings
  const { data: monthlySellers, isLoading: loadingMonthly } = useQuery({
    queryKey: ["leaderboard-monthly"],
    queryFn: async () => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get paid orders from this month
      const { data: orders, error } = await supabase
        .from("orders")
        .select("seller_id")
        .eq("payment_status", "paid")
        .gte("paid_at", firstDayOfMonth.toISOString());

      if (error) throw error;

      // Count sales per seller
      const salesCount: Record<string, number> = {};
      (orders || []).forEach((order) => {
        if (order.seller_id) {
          salesCount[order.seller_id] = (salesCount[order.seller_id] || 0) + 1;
        }
      });

      // Sort and get top sellers
      const topSellerIds = Object.entries(salesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([id, count]) => ({ id, count }));

      if (topSellerIds.length === 0) return [];

      // Fetch seller profiles with stats
      const sellerProfiles = await Promise.all(
        topSellerIds.map(async ({ id, count }) => {
          const [profileResult, productsResult, reviewsResult] = await Promise.all([
            supabase.from("profiles").select("id, full_name, avatar_url, description").eq("id", id).maybeSingle(),
            supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", id).eq("status", "active"),
            supabase.from("reviews").select("rating").eq("seller_id", id)
          ]);

          const ratings = reviewsResult.data || [];
          const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
            : 0;

          return {
            id,
            full_name: profileResult.data?.full_name || "Unknown Seller",
            avatar_url: profileResult.data?.avatar_url,
            description: profileResult.data?.description,
            sales_count: count,
            products_count: productsResult.count || 0,
            avg_rating: avgRating,
            total_reviews: ratings.length
          } as SellerStats;
        })
      );

      return sellerProfiles;
    },
  });

  // Fetch all-time seller rankings
  const { data: allTimeSellers, isLoading: loadingAllTime } = useQuery({
    queryKey: ["leaderboard-alltime"],
    queryFn: async () => {
      // Get all paid orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select("seller_id")
        .eq("payment_status", "paid");

      if (error) throw error;

      // Count sales per seller
      const salesCount: Record<string, number> = {};
      (orders || []).forEach((order) => {
        if (order.seller_id) {
          salesCount[order.seller_id] = (salesCount[order.seller_id] || 0) + 1;
        }
      });

      // Sort and get top sellers
      const topSellerIds = Object.entries(salesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([id, count]) => ({ id, count }));

      if (topSellerIds.length === 0) return [];

      // Fetch seller profiles with stats
      const sellerProfiles = await Promise.all(
        topSellerIds.map(async ({ id, count }) => {
          const [profileResult, productsResult, reviewsResult] = await Promise.all([
            supabase.from("profiles").select("id, full_name, avatar_url, description").eq("id", id).maybeSingle(),
            supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", id).eq("status", "active"),
            supabase.from("reviews").select("rating").eq("seller_id", id)
          ]);

          const ratings = reviewsResult.data || [];
          const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
            : 0;

          return {
            id,
            full_name: profileResult.data?.full_name || "Unknown Seller",
            avatar_url: profileResult.data?.avatar_url,
            description: profileResult.data?.description,
            sales_count: count,
            products_count: productsResult.count || 0,
            avg_rating: avgRating,
            total_reviews: ratings.length
          } as SellerStats;
        })
      );

      return sellerProfiles;
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white border-0";
      case 3:
        return "bg-gradient-to-r from-amber-500 to-amber-700 text-white border-0";
      default:
        return "";
    }
  };

  const SellerSkeleton = () => (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    </Card>
  );

  const TopThreePodium = ({ sellers, loading }: { sellers: SellerStats[] | undefined; loading: boolean }) => {
    if (loading) {
      return (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (!sellers || sellers.length === 0) {
      return (
        <Card className="p-12 text-center mb-8">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('leaderboard.noSellers')}</h3>
          <p className="text-muted-foreground">{t('leaderboard.noSellersDesc')}</p>
        </Card>
      );
    }

    // Reorder for podium: 2nd, 1st, 3rd
    const podiumOrder = sellers.length >= 3 
      ? [sellers[1], sellers[0], sellers[2]] 
      : sellers;

    return (
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {podiumOrder.map((seller, index) => {
          const actualRank = sellers.length >= 3 
            ? (index === 0 ? 2 : index === 1 ? 1 : 3) 
            : index + 1;
          const isFirst = actualRank === 1;
          
          return (
            <Card 
              key={seller.id} 
              className={`p-6 transition-all hover:shadow-lg ${
                isFirst ? 'md:-mt-4 ring-2 ring-yellow-500/50 bg-gradient-to-b from-yellow-50/50 to-background dark:from-yellow-950/20' : ''
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className={`${isFirst ? 'h-24 w-24' : 'h-20 w-20'} border-4 ${
                    actualRank === 1 ? 'border-yellow-500' : 
                    actualRank === 2 ? 'border-gray-400' : 'border-amber-600'
                  }`}>
                    <AvatarImage src={seller.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {seller.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center ${
                    actualRank === 1 ? 'bg-yellow-500' : 
                    actualRank === 2 ? 'bg-gray-400' : 'bg-amber-600'
                  } text-white font-bold text-sm`}>
                    {actualRank}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-1">{seller.full_name}</h3>
                
                <div className="flex items-center gap-1 mb-3">
                  {seller.avg_rating > 0 ? (
                    <>
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{seller.avg_rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({seller.total_reviews})</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('leaderboard.noRatings')}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mb-4">
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-primary">
                      <ShoppingBag className="h-4 w-4" />
                      <span className="font-bold">{seller.sales_count}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{t('leaderboard.sales')}</span>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-primary">
                      <Package className="h-4 w-4" />
                      <span className="font-bold">{seller.products_count}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{t('leaderboard.products')}</span>
                  </div>
                </div>

                <Link to={`/seller/${seller.id}`} className="w-full">
                  <Button variant="outline" size="sm" className="w-full">
                    {t('leaderboard.viewStore')}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const SellerRow = ({ seller, rank }: { seller: SellerStats; rank: number }) => (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-10 flex justify-center">
          {getRankIcon(rank)}
        </div>
        
        <Avatar className="h-12 w-12">
          <AvatarImage src={seller.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {seller.full_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{seller.full_name}</h3>
            {rank <= 3 && (
              <Badge className={getRankBadgeColor(rank)}>
                {rank === 1 ? t('leaderboard.gold') : rank === 2 ? t('leaderboard.silver') : t('leaderboard.bronze')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />
              <span>{seller.sales_count} {t('leaderboard.sales')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span>{seller.products_count} {t('leaderboard.products')}</span>
            </div>
            {seller.avg_rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span>{seller.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        <Link to={`/seller/${seller.id}`}>
          <Button variant="ghost" size="sm">
            {t('leaderboard.viewStore')}
          </Button>
        </Link>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${t('leaderboard.pageTitle')} - Digisellix`}
        description={t('leaderboard.pageDescription')}
        canonicalUrl="https://digisellix.com/leaderboard"
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-full mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-yellow-600 dark:text-yellow-400">{t('leaderboard.badge')}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">{t('leaderboard.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('leaderboard.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('leaderboard.thisMonth')}
            </TabsTrigger>
            <TabsTrigger value="alltime" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('leaderboard.allTime')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <TopThreePodium sellers={monthlySellers?.slice(0, 3)} loading={loadingMonthly} />
            
            {monthlySellers && monthlySellers.length > 3 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold mb-4">{t('leaderboard.otherSellers')}</h3>
                {loadingMonthly
                  ? [...Array(5)].map((_, i) => <SellerSkeleton key={i} />)
                  : monthlySellers.slice(3).map((seller, index) => (
                      <SellerRow key={seller.id} seller={seller} rank={index + 4} />
                    ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alltime">
            <TopThreePodium sellers={allTimeSellers?.slice(0, 3)} loading={loadingAllTime} />
            
            {allTimeSellers && allTimeSellers.length > 3 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold mb-4">{t('leaderboard.otherSellers')}</h3>
                {loadingAllTime
                  ? [...Array(5)].map((_, i) => <SellerSkeleton key={i} />)
                  : allTimeSellers.slice(3).map((seller, index) => (
                      <SellerRow key={seller.id} seller={seller} rank={index + 4} />
                    ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Leaderboard;
