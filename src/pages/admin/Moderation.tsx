import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingBag,
  AlertTriangle,
  ShieldAlert,
  DollarSign,
  Users,
  Gavel,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Clock,
  Snowflake,
  Play,
  Flag,
  UserX,
  UserCheck,
  ArrowLeft,
  RefreshCw,
  TrendingDown,
  Scale,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface Dispute {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_message: string;
  seller_response: string | null;
  admin_decision: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  orders: {
    id: string;
    amount_usd: number;
    products: { title: string } | null;
  } | null;
  buyer: { full_name: string } | null;
  seller: { full_name: string } | null;
}

interface SellerProfile {
  id: string;
  user_id: string;
  bio: string | null;
  verification_status: string;
  trust_score: number;
  abuse_count: number;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  profiles: { full_name: string; email?: string } | null;
}

interface Transaction {
  id: string;
  order_id: string;
  payment_reference: string | null;
  payment_provider: string | null;
  amount: number;
  platform_fee: number;
  seller_payout: number;
  payout_status: string;
  frozen_at: string | null;
  frozen_reason: string | null;
  created_at: string;
  orders: {
    id: string;
    buyer_id: string;
    seller_id: string;
    escrow_status: string;
    products: { title: string } | null;
  } | null;
}

const AdminModeration = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; dispute: Dispute | null }>({
    open: false,
    dispute: null,
  });
  const [decision, setDecision] = useState("");
  const [inFavorOf, setInFavorOf] = useState<"buyer" | "seller" | null>(null);
  
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; seller: SellerProfile | null }>({
    open: false,
    seller: null,
  });
  const [suspendReason, setSuspendReason] = useState("");
  
  const [freezeDialog, setFreezeDialog] = useState<{ open: boolean; transaction: Transaction | null }>({
    open: false,
    transaction: null,
  });
  const [freezeReason, setFreezeReason] = useState("");
  
  const [flagDialog, setFlagDialog] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });
  const [flagReason, setFlagReason] = useState("");

  useEffect(() => {
    if (!user || !hasRole("admin")) {
      navigate("/auth");
    }
  }, [user, hasRole, navigate]);

  // Fetch disputes
  const { data: disputes, isLoading: disputesLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          orders (
            id,
            amount_usd,
            products (title)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch buyer and seller names separately
      const enrichedDisputes = await Promise.all(
        (data || []).map(async (dispute) => {
          const [buyerRes, sellerRes] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", dispute.buyer_id).single(),
            supabase.from("profiles").select("full_name").eq("id", dispute.seller_id).single(),
          ]);
          return {
            ...dispute,
            buyer: buyerRes.data,
            seller: sellerRes.data,
          } as Dispute;
        })
      );
      
      return enrichedDisputes;
    },
    enabled: hasRole("admin"),
  });

  // Fetch seller profiles
  const { data: sellerProfiles, isLoading: sellersLoading } = useQuery({
    queryKey: ["admin-seller-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profile names separately
      const enrichedProfiles = await Promise.all(
        (data || []).map(async (seller) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", seller.user_id)
            .single();
          return {
            ...seller,
            profiles: profileData,
          } as SellerProfile;
        })
      );
      
      return enrichedProfiles;
    },
    enabled: hasRole("admin"),
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          orders (
            id,
            buyer_id,
            seller_id,
            escrow_status,
            products (title)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: hasRole("admin"),
  });

  // Fetch flagged products
  const { data: flaggedProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-flagged-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          profiles!products_seller_id_fkey (full_name)
        `)
        .in("status", ["flagged", "suspended"])
        .order("flagged_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin"),
  });

  // Dashboard stats
  const stats = {
    openDisputes: disputes?.filter(d => d.status === "open" || d.status === "under_review").length || 0,
    suspendedSellers: sellerProfiles?.filter(s => s.is_suspended).length || 0,
    frozenPayouts: transactions?.filter(t => t.payout_status === "frozen").length || 0,
    flaggedProducts: flaggedProducts?.length || 0,
    totalEscrowHeld: transactions?.filter(t => t.payout_status === "frozen" || t.payout_status === "pending")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0,
  };

  // Resolve dispute mutation
  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, decision, inFavorOf }: { disputeId: string; decision: string; inFavorOf: string }) => {
      const { data, error } = await supabase.functions.invoke("handle-dispute", {
        body: {
          action: "resolve",
          disputeId,
          decision,
          inFavorOf,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-seller-profiles"] });
      toast.success("Dispute resolved successfully");
      setResolveDialog({ open: false, dispute: null });
      setDecision("");
      setInFavorOf(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resolve dispute");
    },
  });

  // Suspend seller mutation
  const suspendSellerMutation = useMutation({
    mutationFn: async ({ sellerId, reason }: { sellerId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "suspend_seller",
          targetId: sellerId,
          reason,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seller-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      toast.success("Seller suspended");
      setSuspendDialog({ open: false, seller: null });
      setSuspendReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to suspend seller");
    },
  });

  // Unsuspend seller mutation
  const unsuspendSellerMutation = useMutation({
    mutationFn: async (sellerId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "unsuspend_seller",
          targetId: sellerId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seller-profiles"] });
      toast.success("Seller unsuspended");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unsuspend seller");
    },
  });

  // Freeze payout mutation
  const freezePayoutMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "freeze_payout",
          targetId: transactionId,
          reason,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast.success("Payout frozen");
      setFreezeDialog({ open: false, transaction: null });
      setFreezeReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to freeze payout");
    },
  });

  // Unfreeze payout mutation
  const unfreezePayoutMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "unfreeze_payout",
          targetId: transactionId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast.success("Payout unfrozen");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unfreeze payout");
    },
  });

  // Flag product mutation
  const flagProductMutation = useMutation({
    mutationFn: async ({ productId, reason }: { productId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "flag_product",
          targetId: productId,
          reason,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product flagged");
      setFlagDialog({ open: false, productId: null });
      setFlagReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to flag product");
    },
  });

  // Unflag product mutation
  const unflagProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "unflag_product",
          targetId: productId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product unflagged");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unflag product");
    },
  });

  const getDisputeStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Open</Badge>;
      case "under_review":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Under Review</Badge>;
      case "resolved_buyer":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Resolved - Buyer</Badge>;
      case "resolved_seller":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Resolved - Seller</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case "paid":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>;
      case "frozen":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Frozen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Moderation
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Moderation Center</h1>
          <p className="text-muted-foreground">Manage disputes, sellers, and payouts</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Disputes</CardTitle>
              <Gavel className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{stats.openDisputes}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 border-destructive/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Suspended Sellers</CardTitle>
              <UserX className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.suspendedSellers}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Frozen Payouts</CardTitle>
              <Snowflake className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.frozenPayouts}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Products</CardTitle>
              <Flag className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.flaggedProducts}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Escrow Held</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">${stats.totalEscrowHeld.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="disputes" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Disputes
              {stats.openDisputes > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-2">
                  {stats.openDisputes}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sellers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Sellers
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payouts
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Flagged Products
            </TabsTrigger>
          </TabsList>

          {/* Disputes Tab */}
          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Dispute Queue</CardTitle>
                <CardDescription>Review and resolve buyer-seller disputes</CardDescription>
              </CardHeader>
              <CardContent>
                {disputesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : disputes && disputes.length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {disputes.map((dispute) => (
                        <Card key={dispute.id} className="border-l-4 border-l-amber-500">
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {getDisputeStatusBadge(dispute.status)}
                                  <span className="text-sm text-muted-foreground">
                                    {formatDate(dispute.created_at)}
                                  </span>
                                  {dispute.orders?.products?.title && (
                                    <span className="text-sm font-medium">
                                      Product: {dispute.orders.products.title}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Buyer: {dispute.buyer?.full_name}</p>
                                    <p className="text-sm">{dispute.buyer_message}</p>
                                  </div>
                                  
                                  {dispute.seller_response && (
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                      <p className="text-xs text-muted-foreground mb-1">Seller: {dispute.seller?.full_name}</p>
                                      <p className="text-sm">{dispute.seller_response}</p>
                                    </div>
                                  )}
                                </div>

                                {dispute.admin_decision && (
                                  <div className="p-3 bg-primary/10 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Admin Decision</p>
                                    <p className="text-sm">{dispute.admin_decision}</p>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <DollarSign className="h-4 w-4" />
                                  <span>Amount: ${dispute.orders?.amount_usd?.toFixed(2) || "N/A"}</span>
                                </div>
                              </div>
                              
                              {(dispute.status === "open" || dispute.status === "under_review") && (
                                <div className="flex flex-col gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => setResolveDialog({ open: true, dispute })}
                                  >
                                    <Scale className="h-4 w-4 mr-2" />
                                    Resolve
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No disputes found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers">
            <Card>
              <CardHeader>
                <CardTitle>Seller Management</CardTitle>
                <CardDescription>Monitor and manage seller accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {sellersLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Seller</TableHead>
                          <TableHead>Verification</TableHead>
                          <TableHead>Trust Score</TableHead>
                          <TableHead>Abuse Count</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sellerProfiles?.map((seller) => (
                          <TableRow key={seller.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{seller.profiles?.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">
                                  Joined {formatDate(seller.created_at)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={seller.verification_status === "approved" ? "default" : "secondary"}>
                                {seller.verification_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${
                                  seller.trust_score >= 70 ? "text-green-600" :
                                  seller.trust_score >= 40 ? "text-amber-600" :
                                  "text-destructive"
                                }`}>
                                  {seller.trust_score}
                                </span>
                                <TrendingDown className={`h-4 w-4 ${
                                  seller.trust_score >= 70 ? "text-green-600" :
                                  seller.trust_score >= 40 ? "text-amber-600" :
                                  "text-destructive"
                                }`} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={seller.abuse_count >= 2 ? "text-destructive font-medium" : ""}>
                                {seller.abuse_count}
                              </span>
                            </TableCell>
                            <TableCell>
                              {seller.is_suspended ? (
                                <Badge variant="destructive">Suspended</Badge>
                              ) : (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {seller.is_suspended ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => unsuspendSellerMutation.mutate(seller.user_id)}
                                    disabled={unsuspendSellerMutation.isPending}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Unsuspend
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setSuspendDialog({ open: true, seller })}
                                  >
                                    <Ban className="h-4 w-4 mr-1" />
                                    Suspend
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Payout Management</CardTitle>
                <CardDescription>Control transaction payouts and escrow releases</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Platform Fee</TableHead>
                          <TableHead>Seller Payout</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions?.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div>
                                <p className="text-xs font-mono">{tx.id.slice(0, 8)}...</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(tx.created_at)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{tx.orders?.products?.title || "N/A"}</span>
                            </TableCell>
                            <TableCell className="font-medium">${Number(tx.amount).toFixed(2)}</TableCell>
                            <TableCell className="text-muted-foreground">${Number(tx.platform_fee).toFixed(2)}</TableCell>
                            <TableCell className="text-primary font-medium">${Number(tx.seller_payout).toFixed(2)}</TableCell>
                            <TableCell>
                              {getPayoutStatusBadge(tx.payout_status)}
                              {tx.frozen_reason && (
                                <p className="text-xs text-muted-foreground mt-1">{tx.frozen_reason}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {tx.payout_status === "frozen" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => unfreezePayoutMutation.mutate(tx.id)}
                                    disabled={unfreezePayoutMutation.isPending}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Unfreeze
                                  </Button>
                                ) : tx.payout_status === "pending" ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setFreezeDialog({ open: true, transaction: tx })}
                                  >
                                    <Snowflake className="h-4 w-4 mr-1" />
                                    Freeze
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flagged Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Flagged Products</CardTitle>
                <CardDescription>Review and manage flagged or suspended products</CardDescription>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : flaggedProducts && flaggedProducts.length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Flagged At</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flaggedProducts.map((product: any) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.thumbnail_url && (
                                  <img 
                                    src={product.thumbnail_url} 
                                    alt={product.title}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">{product.title}</p>
                                  <p className="text-xs text-muted-foreground">${product.price_usd}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{product.profiles?.full_name || "Unknown"}</TableCell>
                            <TableCell>
                              <Badge variant={product.status === "flagged" ? "secondary" : "destructive"}>
                                {product.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {product.flagged_reason || "No reason provided"}
                            </TableCell>
                            <TableCell>
                              {product.flagged_at ? formatDate(product.flagged_at) : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unflagProductMutation.mutate(product.id)}
                                  disabled={unflagProductMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Link to={`/products/${product.id}`}>
                                  <Button size="sm" variant="ghost">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No flagged products</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Resolve Dispute Dialog */}
      <Dialog open={resolveDialog.open} onOpenChange={(open) => setResolveDialog({ open, dispute: resolveDialog.dispute })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Make a final decision on this dispute. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Decide in favor of:</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={inFavorOf === "buyer" ? "default" : "outline"}
                  onClick={() => setInFavorOf("buyer")}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Buyer
                </Button>
                <Button
                  variant={inFavorOf === "seller" ? "default" : "outline"}
                  onClick={() => setInFavorOf("seller")}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Seller
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="decision">Decision Explanation</Label>
              <Textarea
                id="decision"
                placeholder="Explain your decision..."
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog({ open: false, dispute: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (resolveDialog.dispute && inFavorOf && decision) {
                  resolveDisputeMutation.mutate({
                    disputeId: resolveDialog.dispute.id,
                    decision,
                    inFavorOf,
                  });
                }
              }}
              disabled={!inFavorOf || !decision || resolveDisputeMutation.isPending}
            >
              {resolveDisputeMutation.isPending ? "Resolving..." : "Resolve Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Seller Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, seller: suspendDialog.seller })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Suspend Seller</DialogTitle>
            <DialogDescription>
              This will suspend the seller and all their products. They will not be able to sell until unsuspended.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="suspend-reason">Reason for suspension</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Enter reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, seller: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (suspendDialog.seller && suspendReason) {
                  suspendSellerMutation.mutate({
                    sellerId: suspendDialog.seller.user_id,
                    reason: suspendReason,
                  });
                }
              }}
              disabled={!suspendReason || suspendSellerMutation.isPending}
            >
              {suspendSellerMutation.isPending ? "Suspending..." : "Suspend Seller"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze Payout Dialog */}
      <Dialog open={freezeDialog.open} onOpenChange={(open) => setFreezeDialog({ open, transaction: freezeDialog.transaction })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Freeze Payout</DialogTitle>
            <DialogDescription>
              This will prevent the payout from being processed until manually unfrozen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="freeze-reason">Reason for freezing</Label>
            <Textarea
              id="freeze-reason"
              placeholder="Enter reason for freezing payout..."
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeDialog({ open: false, transaction: null })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (freezeDialog.transaction && freezeReason) {
                  freezePayoutMutation.mutate({
                    transactionId: freezeDialog.transaction.id,
                    reason: freezeReason,
                  });
                }
              }}
              disabled={!freezeReason || freezePayoutMutation.isPending}
            >
              {freezePayoutMutation.isPending ? "Freezing..." : "Freeze Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModeration;
