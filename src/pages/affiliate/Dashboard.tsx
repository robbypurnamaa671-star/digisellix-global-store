import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Copy, MousePointer2, DollarSign, Clock, CheckCircle, Link2, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [payoutAmount, setPayoutAmount] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Fetch or create affiliate record
  const { data: affiliate, isLoading: affiliateLoading } = useQuery({
    queryKey: ["affiliate", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Try to get existing affiliate
      const { data, error } = await supabase
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) return data;

      // Create new affiliate if doesn't exist
      const { data: newAffiliate, error: createError } = await supabase
        .from("affiliates")
        .insert({
          user_id: user.id,
          affiliate_code: crypto.randomUUID().slice(0, 8),
        })
        .select()
        .single();

      if (createError) throw createError;
      return newAffiliate;
    },
    enabled: !!user?.id,
  });

  // Fetch affiliate stats
  const { data: stats } = useQuery({
    queryKey: ["affiliate-stats", affiliate?.id],
    queryFn: async () => {
      if (!affiliate?.id) return null;

      // Get clicks
      const { count: totalClicks } = await supabase
        .from("affiliate_clicks")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id);

      // Get commissions by status
      const { data: commissions } = await supabase
        .from("affiliate_commissions")
        .select("commission_amount, status")
        .eq("affiliate_id", affiliate.id);

      const pending = commissions?.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const available = commissions?.filter(c => c.status === "available").reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const paid = commissions?.filter(c => c.status === "paid").reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const totalConversions = commissions?.length || 0;

      return {
        totalClicks: totalClicks || 0,
        totalConversions,
        pendingCommission: pending,
        availableCommission: available,
        paidCommission: paid,
      };
    },
    enabled: !!affiliate?.id,
  });

  // Fetch affiliate-enabled products
  const { data: products } = useQuery({
    queryKey: ["affiliate-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price_usd, affiliate_commission_percent, thumbnail_url, seller_id")
        .eq("affiliate_enabled", true)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch commission history
  const { data: commissionHistory } = useQuery({
    queryKey: ["affiliate-commissions", affiliate?.id],
    queryFn: async () => {
      if (!affiliate?.id) return [];

      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select(`
          *,
          products (title)
        `)
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!affiliate?.id,
  });

  // Fetch payout requests
  const { data: payoutRequests } = useQuery({
    queryKey: ["payout-requests", affiliate?.id],
    queryFn: async () => {
      if (!affiliate?.id) return [];

      const { data, error } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!affiliate?.id,
  });

  // Create payout request mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!affiliate?.id) throw new Error("No affiliate record");

      const { error } = await supabase
        .from("payout_requests")
        .insert({
          affiliate_id: affiliate.id,
          amount,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payout-requests"] });
      toast.success("Payout request submitted successfully");
      setPayoutAmount("");
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit payout request");
    },
  });

  const copyAffiliateLink = (productId: string) => {
    if (!affiliate?.affiliate_code) return;
    const link = `${window.location.origin}/products/${productId}?ref=${affiliate.affiliate_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Affiliate link copied to clipboard!");
  };

  const handlePayoutRequest = () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amount > (stats?.availableCommission || 0)) {
      toast.error("Amount exceeds available balance");
      return;
    }
    createPayoutMutation.mutate(amount);
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  if (affiliateLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Clicks",
      value: stats?.totalClicks || 0,
      icon: MousePointer2,
      color: "text-blue-500",
    },
    {
      title: "Conversions",
      value: stats?.totalConversions || 0,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Pending",
      value: formatCurrency(stats?.pendingCommission || 0),
      icon: Clock,
      color: "text-yellow-500",
    },
    {
      title: "Available",
      value: formatCurrency(stats?.availableCommission || 0),
      icon: DollarSign,
      color: "text-primary",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Your affiliate code: <Badge variant="secondary" className="ml-1">{affiliate?.affiliate_code}</Badge>
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!stats?.availableCommission}>
                <DollarSign className="h-4 w-4 mr-2" />
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  Available balance: {formatCurrency(stats?.availableCommission || 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Amount (USD)</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    max={stats?.availableCommission || 0}
                    step="0.01"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handlePayoutRequest}
                  disabled={createPayoutMutation.isPending}
                >
                  {createPayoutMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="mt-2">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">Affiliate Products</TabsTrigger>
            <TabsTrigger value="history">Commission History</TabsTrigger>
            <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Products with Affiliate Program
                </CardTitle>
                <CardDescription>
                  Generate affiliate links for these products and earn commission on sales
                </CardDescription>
              </CardHeader>
              <CardContent>
                {products?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No products with affiliate program available yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products?.filter(p => p.seller_id !== user?.id).map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.thumbnail_url ? (
                                  <img
                                    src={product.thumbnail_url}
                                    alt={product.title}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    📦
                                  </div>
                                )}
                                <span className="font-medium line-clamp-1">{product.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>${Number(product.price_usd).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {product.affiliate_commission_percent}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyAffiliateLink(product.id)}
                                >
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy Link
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                >
                                  <Link to={`/products/${product.id}`}>
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </Button>
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

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>
                  Track all your earned commissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {commissionHistory?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No commissions earned yet. Start sharing affiliate links!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissionHistory?.map((commission) => (
                          <TableRow key={commission.id}>
                            <TableCell>{formatDate(commission.created_at)}</TableCell>
                            <TableCell>{(commission.products as any)?.title || "N/A"}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(Number(commission.commission_amount))}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  commission.status === "paid"
                                    ? "default"
                                    : commission.status === "available"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {commission.status}
                              </Badge>
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

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Payout Requests</CardTitle>
                <CardDescription>
                  Track your payout request history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payoutRequests?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No payout requests yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Processed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payoutRequests?.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>{formatDate(request.created_at)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(Number(request.amount))}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  request.status === "paid"
                                    ? "default"
                                    : request.status === "pending"
                                    ? "outline"
                                    : "destructive"
                                }
                              >
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {request.processed_at ? formatDate(request.processed_at) : "-"}
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
        </Tabs>

        {/* Paid Commission Summary */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.paidCommission || 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
