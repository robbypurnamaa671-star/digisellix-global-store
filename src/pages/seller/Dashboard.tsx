import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ShoppingBag, 
  Plus, 
  DollarSign, 
  Package, 
  TrendingUp,
  Edit,
  Trash2,
  ExternalLink,
  Eye,
  AlertTriangle,
  MessageCircle,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AnalyticsOverview } from "@/components/seller/AnalyticsOverview";
import { ProductAnalyticsCard } from "@/components/seller/ProductAnalyticsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Product = {
  id: string;
  title: string;
  category: string;
  price_usd: number;
  price_idr: number;
  total_sales: number;
  status: string;
  created_at: string;
};

type RevenueStats = {
  totalSalesCount: number;
  totalRevenueUSD: number;
  totalRevenueIDR: number;
  productsCount: number;
};

type AnalyticsData = {
  totalViews: number;
  totalViewsThisWeek: number;
  averageConversion: number;
  clickThroughRate: number;
  viewsData: Array<{ date: string; views: number }>;
  productStats: Array<{
    id: string;
    title: string;
    views: number;
    sales: number;
    conversion_rate: number;
    recent_views_7d: number;
  }>;
};

const SellerDashboard = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalSalesCount: 0,
    totalRevenueUSD: 0,
    totalRevenueIDR: 0,
    productsCount: 0,
  });
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalViewsThisWeek: 0,
    averageConversion: 0,
    clickThroughRate: 0,
    viewsData: [],
    productStats: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch seller profile to check if limited
  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_limited")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !hasRole("seller")) {
      navigate("/auth");
      return;
    }
    fetchDashboardData();
  }, [user, hasRole, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      // Fetch orders for revenue calculation
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("amount_usd, amount_idr, payment_status")
        .eq("seller_id", user.id)
        .eq("payment_status", "paid");

      if (ordersError) throw ordersError;

      // Calculate stats
      const revenueUSD = ordersData?.reduce((sum, order) => sum + Number(order.amount_usd || 0), 0) || 0;
      const revenueIDR = ordersData?.reduce((sum, order) => sum + Number(order.amount_idr || 0), 0) || 0;
      const totalSales = ordersData?.length || 0;

      setProducts(productsData || []);
      setStats({
        totalSalesCount: totalSales,
        totalRevenueUSD: revenueUSD,
        totalRevenueIDR: revenueIDR,
        productsCount: productsData?.length || 0,
      });

      // Fetch analytics data
      await fetchAnalytics(productsData || []);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (productsData: Product[]) => {
    if (!user || productsData.length === 0) return;

    try {
      const productIds = productsData.map(p => p.id);

      // Fetch all views for seller's products
      const { data: allViews, error: viewsError } = await supabase
        .from("product_views")
        .select("product_id, viewed_at")
        .in("product_id", productIds);

      if (viewsError) throw viewsError;

      const totalViews = allViews?.length || 0;

      // Calculate views from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentViews = allViews?.filter(
        v => new Date(v.viewed_at) >= sevenDaysAgo
      ) || [];

      // Calculate views data for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const viewsByDate = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + i);
        viewsByDate.set(date.toISOString().split('T')[0], 0);
      }

      allViews?.forEach(view => {
        const viewDate = new Date(view.viewed_at);
        if (viewDate >= thirtyDaysAgo) {
          const dateKey = viewDate.toISOString().split('T')[0];
          viewsByDate.set(dateKey, (viewsByDate.get(dateKey) || 0) + 1);
        }
      });

      const viewsData = Array.from(viewsByDate.entries())
        .map(([date, views]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          views,
        }));

      // Calculate per-product stats
      const productStats = productsData.map(product => {
        const productViews = allViews?.filter(v => v.product_id === product.id) || [];
        const recentProductViews = productViews.filter(
          v => new Date(v.viewed_at) >= sevenDaysAgo
        );
        
        const views = productViews.length;
        const sales = product.total_sales || 0;
        const conversion_rate = views > 0 ? (sales / views) * 100 : 0;

        return {
          id: product.id,
          title: product.title,
          views,
          sales,
          conversion_rate,
          recent_views_7d: recentProductViews.length,
        };
      });

      // Calculate overall metrics
      const totalSales = productsData.reduce((sum, p) => sum + (p.total_sales || 0), 0);
      const averageConversion = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;
      const clickThroughRate = totalViews > 0 ? (totalSales / totalViews) * 100 : 0;

      setAnalytics({
        totalViews,
        totalViewsThisWeek: recentViews.length,
        averageConversion,
        clickThroughRate,
        viewsData,
        productStats,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      fetchDashboardData();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: "USD" | "IDR") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    } else {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const statsCards = [
    { 
      title: t('seller.totalSales'), 
      value: stats.totalSalesCount.toString(), 
      icon: TrendingUp,
      description: t('seller.ordersCompleted')
    },
    { 
      title: t('seller.products'), 
      value: stats.productsCount.toString(), 
      icon: Package,
      description: t('seller.activeListings')
    },
    { 
      title: t('seller.revenueUSD'), 
      value: formatCurrency(stats.totalRevenueUSD, "USD"), 
      icon: DollarSign,
      description: t('seller.totalEarnings')
    },
    { 
      title: t('seller.revenueIDR'), 
      value: formatCurrency(stats.totalRevenueIDR, "IDR"), 
      icon: DollarSign,
      description: t('seller.totalEarnings')
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Digisellix
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/products">
              <Button variant="ghost">{t('seller.browse')}</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>{t('seller.logout')}</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Limited Account Warning */}
        {sellerProfile?.is_limited && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('seller.accountLimited')}</AlertTitle>
            <AlertDescription className="mt-2">
              {t('seller.accountLimitedDesc')}{' '}
              <Link to="/chat" className="underline font-medium ml-1 inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {t('seller.contactAdmin')}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t('seller.dashboard')}</h1>
            <p className="text-muted-foreground">{t('seller.manageProducts')}</p>
            <p className="text-sm text-primary font-medium mt-1">
              {t('seller.noLimits')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/seller/settings">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Settings className="mr-2 h-5 w-5" />
                {t('seller.settings')}
              </Button>
            </Link>
            <Link to="/seller/custom-order">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <DollarSign className="mr-2 h-5 w-5" />
                {t('seller.customOrder')}
              </Button>
            </Link>
            <Link to="/seller/add-product">
              <Button variant="hero" size="lg" className="w-full sm:w-auto">
                <Plus className="mr-2 h-5 w-5" />
                {t('seller.addProduct')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, idx) => (
            <Card key={idx} className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{loading ? "..." : stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs for Products and Analytics */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="products">{t('seller.productsTab')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('seller.analyticsTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            {/* Products Table */}
        <Card className="shadow-[var(--shadow-card-hover)]">
          <CardHeader>
            <CardTitle className="text-2xl">{t('seller.yourProducts')}</CardTitle>
            <p className="text-muted-foreground">{t('seller.manageTrack')}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start your digital business by adding your first product. You can upload as many as you want - there are no limits!
                </p>
                <Link to="/seller/add-product">
                  <Button variant="hero">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Product
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Price (USD)</TableHead>
                      <TableHead className="font-semibold">Price (IDR)</TableHead>
                      <TableHead className="font-semibold text-center">Sales</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{product.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.price_usd, "USD")}</TableCell>
                        <TableCell>{formatCurrency(product.price_idr, "IDR")}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-primary">{product.total_sales}</span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.status === "active" ? "default" : "secondary"}
                            className="capitalize"
                          >
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/products/${product.id}`)}
                              title="View product"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete product"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{product.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading analytics...</p>
              </div>
            ) : products.length === 0 ? (
              <Card className="shadow-[var(--shadow-card-hover)]">
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No analytics yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Add products to start tracking views and performance
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Analytics Overview */}
                <AnalyticsOverview
                  totalViews={analytics.totalViews}
                  totalViewsThisWeek={analytics.totalViewsThisWeek}
                  averageConversion={analytics.averageConversion}
                  clickThroughRate={analytics.clickThroughRate}
                  viewsData={analytics.viewsData}
                />

                {/* Per-Product Analytics */}
                <Card className="shadow-[var(--shadow-card-hover)]">
                  <CardHeader>
                    <CardTitle className="text-2xl">Product Performance</CardTitle>
                    <p className="text-muted-foreground">View detailed stats for each product</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {analytics.productStats.map((product) => (
                        <ProductAnalyticsCard
                          key={product.id}
                          product={product}
                          onClick={() => navigate(`/products/${product.id}`)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Link to="/seller/sales">
            <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Sales History</h3>
                <p className="text-sm text-muted-foreground">View detailed sales analytics</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/seller/wallet">
            <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Wallet</h3>
                <p className="text-sm text-muted-foreground">Manage withdrawals</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/products">
            <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <CardContent className="p-6 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Browse Marketplace</h3>
                <p className="text-sm text-muted-foreground">See your products live</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
