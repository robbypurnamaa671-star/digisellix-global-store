import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Package,
  Shield,
  Loader2,
} from "lucide-react";

interface EscrowTransaction {
  id: string;
  transaction_code: string;
  buyer_id: string;
  seller_id: string | null;
  seller_email: string;
  title: string;
  amount_usd: number;
  amount_idr: number;
  currency: string;
  status: string;
  created_at: string;
  fee_payer: string;
}

const EscrowTransactions = () => {
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | "buyer" | "seller">(
    (searchParams.get("role") as "all" | "buyer" | "seller") || "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || "all"
  );

  const statusOptions = [
    { value: "all", label: language === "id" ? "Semua Status" : "All Status" },
    { value: "pending", label: language === "id" ? "Menunggu" : "Pending" },
    { value: "accepted", label: language === "id" ? "Diterima" : "Accepted" },
    { value: "funded", label: language === "id" ? "Dana Diterima" : "Funded" },
    { value: "delivered", label: language === "id" ? "Terkirim" : "Delivered" },
    { value: "completed", label: language === "id" ? "Selesai" : "Completed" },
    { value: "disputed", label: language === "id" ? "Sengketa" : "Disputed" },
    { value: "refunded", label: language === "id" ? "Dikembalikan" : "Refunded" },
    { value: "cancelled", label: language === "id" ? "Dibatalkan" : "Cancelled" },
  ];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/escrow/transactions");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, roleFilter, statusFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    setSearchParams(params, { replace: true });
  }, [roleFilter, statusFilter, setSearchParams]);

  const fetchTransactions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user email to check for pending invitations
      const userEmail = user.email;

      let query = supabase
        .from("escrow_transactions")
        .select("id, transaction_code, buyer_id, seller_id, seller_email, title, amount_usd, amount_idr, currency, status, created_at, fee_payer")
        .order("created_at", { ascending: false });

      // Role filter - also include pending transactions where seller_email matches
      if (roleFilter === "buyer") {
        query = query.eq("buyer_id", user.id);
      } else if (roleFilter === "seller") {
        // For seller filter: include where seller_id matches OR seller_email matches (for pending invitations)
        query = query.or(`seller_id.eq.${user.id},seller_email.eq.${userEmail}`);
      } else {
        // For "all" filter: include where user is buyer, seller, or invited via email
        query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id},seller_email.eq.${userEmail}`);
      }

      // Status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching transactions:", error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" />, label: language === "id" ? "Menunggu" : "Pending" },
      accepted: { variant: "outline", icon: <CheckCircle className="h-3 w-3" />, label: language === "id" ? "Diterima" : "Accepted" },
      funded: { variant: "default", icon: <DollarSign className="h-3 w-3" />, label: language === "id" ? "Dana Diterima" : "Funded" },
      delivered: { variant: "default", icon: <Package className="h-3 w-3" />, label: language === "id" ? "Terkirim" : "Delivered" },
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" />, label: language === "id" ? "Selesai" : "Completed" },
      disputed: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" />, label: language === "id" ? "Sengketa" : "Disputed" },
      refunded: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: language === "id" ? "Dikembalikan" : "Refunded" },
      cancelled: { variant: "secondary", icon: <XCircle className="h-3 w-3" />, label: language === "id" ? "Dibatalkan" : "Cancelled" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getRoleBadge = (tx: EscrowTransaction) => {
    if (!user) return null;
    
    if (tx.buyer_id === user.id) {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-0">
          {language === "id" ? "Pembeli" : "Buyer"}
        </Badge>
      );
    }
    if (tx.seller_id === user.id) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
          {language === "id" ? "Penjual" : "Seller"}
        </Badge>
      );
    }
    return null;
  };

  const formatAmount = (tx: EscrowTransaction) => {
    if (tx.currency === "IDR") {
      return `Rp ${tx.amount_idr.toLocaleString("id-ID")}`;
    }
    return `$${tx.amount_usd.toLocaleString()}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={language === "id" ? "Transaksi Escrow Saya | Digisellix" : "My Escrow Transactions | Digisellix"}
        description={language === "id" ? "Lihat semua transaksi escrow Anda" : "View all your escrow transactions"}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              {language === "id" ? "Transaksi Escrow Saya" : "My Escrow Transactions"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === "id"
                ? "Kelola dan pantau semua transaksi escrow Anda"
                : "Manage and monitor all your escrow transactions"}
            </p>
          </div>
          <Button asChild>
            <Link to="/escrow/create">
              <Plus className="mr-2 h-4 w-4" />
              {language === "id" ? "Buat Transaksi" : "Create Transaction"}
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | "buyer" | "seller")}>
            <TabsList>
              <TabsTrigger value="all">
                {language === "id" ? "Semua" : "All"}
              </TabsTrigger>
              <TabsTrigger value="buyer">
                {language === "id" ? "Sebagai Pembeli" : "As Buyer"}
              </TabsTrigger>
              <TabsTrigger value="seller">
                {language === "id" ? "Sebagai Penjual" : "As Seller"}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={language === "id" ? "Filter Status" : "Filter Status"} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {language === "id" ? "Belum Ada Transaksi" : "No Transactions Yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {language === "id"
                  ? "Anda belum memiliki transaksi escrow. Mulai transaksi pertama Anda sekarang!"
                  : "You don't have any escrow transactions yet. Start your first transaction now!"}
              </p>
              <Button asChild>
                <Link to="/escrow/create">
                  <Plus className="mr-2 h-4 w-4" />
                  {language === "id" ? "Buat Transaksi Pertama" : "Create First Transaction"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <Card key={tx.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{tx.title}</h3>
                        {getRoleBadge(tx)}
                        {getStatusBadge(tx.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{tx.transaction_code}</span>
                        <span>•</span>
                        <span>
                          {new Date(tx.created_at).toLocaleDateString(language === "id" ? "id-ID" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="text-xl font-bold text-primary">
                        {formatAmount(tx)}
                      </div>
                    </div>
                    <Button asChild variant="outline">
                      <Link to={`/escrow/${tx.id}`}>
                        {language === "id" ? "Lihat Detail" : "View Details"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {language === "id" ? "Tentang Escrow" : "About Escrow"}
            </CardTitle>
            <CardDescription>
              {language === "id"
                ? "Escrow melindungi pembeli dan penjual dengan menahan dana hingga transaksi selesai."
                : "Escrow protects both buyers and sellers by holding funds until the transaction is complete."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/escrow">
                {language === "id" ? "Pelajari Lebih Lanjut" : "Learn More"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EscrowTransactions;
