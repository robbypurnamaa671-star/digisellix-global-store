import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ArrowLeft, TrendingUp, Package, DollarSign, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Order = {
  id: string;
  amount_usd: number;
  amount_idr: number;
  payment_status: string;
  created_at: string;
  is_custom_order: boolean;
  custom_order_title: string | null;
  products: {
    title: string;
  } | null;
};

const SalesHistory = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState({ usd: 0, idr: 0 });

  useEffect(() => {
    if (!user || !hasRole("seller")) {
      navigate("/auth");
      return;
    }
    fetchSales();
  }, [user, hasRole, navigate]);

  const fetchSales = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          amount_usd,
          amount_idr,
          payment_status,
          created_at,
          is_custom_order,
          custom_order_title,
          products (title)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders((data || []) as any);

      // Calculate total revenue from paid orders
      const paidOrders = (data || []).filter(o => o.payment_status === "paid");
      const usdTotal = paidOrders.reduce((sum, o) => sum + Number(o.amount_usd), 0);
      const idrTotal = paidOrders.reduce((sum, o) => sum + Number(o.amount_idr), 0);
      setTotalRevenue({ usd: usdTotal, idr: idrTotal });
    } catch (error: any) {
      console.error("Error fetching sales:", error);
      toast({
        title: "Error",
        description: "Failed to load sales history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: "USD" | "IDR") => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    }
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-success">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "expired":
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
            <Link to="/seller/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Link to="/seller/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sales History</h1>
          <p className="text-muted-foreground">Track your sales and revenue</p>
        </div>

        {/* Revenue Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold">{formatCurrency(totalRevenue.usd, "USD")}</div>
                <p className="text-sm text-muted-foreground">Total Revenue (USD)</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 to-primary/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue.idr, "IDR")}</div>
                <p className="text-sm text-muted-foreground">Total Revenue (IDR)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading sales...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-muted-foreground">
                  Your orders will appear here once customers purchase your products
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        order.is_custom_order 
                          ? "bg-gradient-to-br from-primary/20 to-accent/20" 
                          : "bg-muted"
                      }`}>
                        {order.is_custom_order ? (
                          <Target className="h-5 w-5 text-primary" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {order.is_custom_order 
                            ? order.custom_order_title 
                            : order.products?.title || "Unknown Product"}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {order.is_custom_order && (
                            <Badge variant="outline" className="text-xs">Custom Order</Badge>
                          )}
                          <span>{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-primary">
                          {formatCurrency(order.amount_usd, "USD")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(order.amount_idr, "IDR")}
                        </div>
                      </div>
                      {getStatusBadge(order.payment_status || "pending")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesHistory;