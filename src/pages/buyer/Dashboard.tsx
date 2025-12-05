import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Package, Download, Clock, CheckCircle, XCircle, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ReviewForm } from "@/components/reviews/ReviewForm";

const BuyerDashboard = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    if (!user || !hasRole("buyer")) {
      navigate("/auth");
    }
  }, [user, hasRole, navigate]);

  // Fetch purchased products (paid orders)
  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select(`
          *,
          products (
            id,
            title,
            thumbnail_url,
            category,
            file_url,
            download_link,
            seller_id
          ),
          orders (
            id,
            amount_usd,
            amount_idr,
            currency,
            paid_at,
            seller_id
          )
        `)
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's reviews to check which orders have been reviewed
  const { data: userReviews } = useQuery({
    queryKey: ["user-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("order_id")
        .eq("buyer_id", user?.id);

      if (error) throw error;
      return data?.map(r => r.order_id) || [];
    },
    enabled: !!user,
  });

  // Fetch all orders (including pending)
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            id,
            title,
            thumbnail_url,
            category
          )
        `)
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Handle download
  const downloadMutation = useMutation({
    mutationFn: async (download: any) => {
      // Update download count
      const { error: updateError } = await supabase
        .from("downloads")
        .update({
          download_count: (download.download_count || 0) + 1,
          last_downloaded_at: new Date().toISOString(),
        })
        .eq("id", download.id);

      if (updateError) throw updateError;

      return download.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });

  const handleDownload = async (purchase: any) => {
    const product = purchase.products;
    
    if (!product.file_url && !product.download_link) {
      toast.error("Download not available");
      return;
    }

    try {
      // Track download
      await downloadMutation.mutateAsync(purchase);

      // Open download link
      const downloadUrl = product.file_url || product.download_link;
      window.open(downloadUrl, "_blank");
      
      toast.success("Download started!");
    } catch (error: any) {
      toast.error(error.message || "Failed to download");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('paymentSuccess.paid')}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t('paymentSuccess.pending')}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t('paymentSuccess.failed')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
              <Button variant="ghost">{t('checkout.browseProducts')}</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>{t('seller.logout')}</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('buyer.dashboard')}</h1>
          <p className="text-muted-foreground">
            {t('buyer.managePurchases')}
          </p>
        </div>

        <Tabs defaultValue="purchases" className="space-y-6">
          <TabsList>
            <TabsTrigger value="purchases">{t('buyer.myPurchases')}</TabsTrigger>
            <TabsTrigger value="orders">{t('buyer.orderHistory')}</TabsTrigger>
          </TabsList>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            {purchasesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-20 h-20 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-10 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !purchases || purchases.length === 0 ? (
              <Card className="text-center p-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{t('buyer.noPurchases')}</h3>
                <p className="text-muted-foreground mb-6">
                  {t('buyer.startExploring')}
                </p>
                <Link to="/products">
                  <Button variant="hero">{t('checkout.browseProducts')}</Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase) => {
                  const product = purchase.products as any;
                  const order = purchase.orders as any;
                  const hasReviewed = userReviews?.includes(order?.id);
                  
                  return (
                    <Card
                      key={purchase.id}
                      className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                          {product?.thumbnail_url ? (
                            <img
                              src={product.thumbnail_url}
                              alt={product.title}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                              <span className="text-3xl">📦</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">
                              {product?.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <Badge variant="secondary">{product?.category}</Badge>
                              <span className="text-muted-foreground">
                                {t('buyer.downloaded')} {purchase.download_count} {t('buyer.times')}
                              </span>
                              {purchase.last_downloaded_at && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">
                                    {t('buyer.last')}: {new Date(purchase.last_downloaded_at).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            {!hasReviewed && order && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrder({
                                    orderId: order.id,
                                    sellerId: order.seller_id,
                                    productTitle: product?.title
                                  });
                                  setReviewDialogOpen(true);
                                }}
                              >
                                <Star className="mr-2 h-4 w-4" />
                                {t('buyer.leaveReview')}
                              </Button>
                            )}
                            {hasReviewed && (
                              <Badge variant="secondary" className="h-10 px-4 flex items-center">
                                <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
                                {t('buyer.reviewed')}
                              </Badge>
                            )}
                            <Button
                              variant="hero"
                              onClick={() => handleDownload(purchase)}
                              disabled={downloadMutation.isPending}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {t('buyer.download')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {ordersLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ) : !orders || orders.length === 0 ? (
              <Card className="text-center p-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{t('buyer.noOrders')}</h3>
                <p className="text-muted-foreground mb-6">
                  {t('buyer.orderHistoryDesc')}
                </p>
                <Link to="/products">
                  <Button variant="hero">{t('checkout.browseProducts')}</Button>
                </Link>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('seller.product')}</TableHead>
                        <TableHead>{t('buyer.date')}</TableHead>
                        <TableHead>{t('buyer.amount')}</TableHead>
                        <TableHead>{t('seller.status')}</TableHead>
                        <TableHead className="text-right">{t('buyer.action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => {
                        const product = order.products as any;
                        
                        return (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product?.thumbnail_url ? (
                                  <img
                                    src={product.thumbnail_url}
                                    alt={product.title}
                                    className="w-12 h-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                    <span className="text-xl">📦</span>
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{product?.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product?.category}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(order.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  ${Number(order.amount_usd).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Rp {Number(order.amount_idr).toLocaleString("id-ID")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(order.payment_status)}</TableCell>
                            <TableCell className="text-right">
                              {order.payment_status === "pending" && order.ipaymu_payment_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(order.ipaymu_payment_url, "_blank")}
                                >
                                  {t('buyer.payNow')}
                                </Button>
                              ) : order.payment_status === "paid" ? (
                                <Link to={`/products/${product?.id}`}>
                                  <Button variant="ghost" size="sm">
                                    {t('buyer.viewProduct')}
                                  </Button>
                                </Link>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('buyer.leaveReviewFor')} {selectedOrder?.productTitle}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && user && (
            <ReviewForm
              orderId={selectedOrder.orderId}
              sellerId={selectedOrder.sellerId}
              buyerId={user.id}
              onSuccess={() => {
                setReviewDialogOpen(false);
                setSelectedOrder(null);
                queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDashboard;