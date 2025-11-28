import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShoppingBag, 
  Plus, 
  DollarSign, 
  Package, 
  TrendingUp,
  Edit,
  Trash2,
  ExternalLink,
  Eye
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

const SellerDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalSalesCount: 0,
    totalRevenueUSD: 0,
    totalRevenueIDR: 0,
    productsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || userRole !== "seller") {
      navigate("/auth");
      return;
    }
    fetchDashboardData();
  }, [user, userRole, navigate]);

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
      title: "Total Sales", 
      value: stats.totalSalesCount.toString(), 
      icon: TrendingUp,
      description: "Orders completed"
    },
    { 
      title: "Products", 
      value: stats.productsCount.toString(), 
      icon: Package,
      description: "Active listings"
    },
    { 
      title: "Revenue (USD)", 
      value: formatCurrency(stats.totalRevenueUSD, "USD"), 
      icon: DollarSign,
      description: "Total earnings"
    },
    { 
      title: "Revenue (IDR)", 
      value: formatCurrency(stats.totalRevenueIDR, "IDR"), 
      icon: DollarSign,
      description: "Total earnings"
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
              <Button variant="ghost">Browse</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your products and track your sales</p>
          </div>
          <Link to="/seller/add-product">
            <Button variant="hero" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Product
            </Button>
          </Link>
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

        {/* Products Table */}
        <Card className="shadow-[var(--shadow-card-hover)]">
          <CardHeader>
            <CardTitle className="text-2xl">Your Products</CardTitle>
            <p className="text-muted-foreground">Manage and track all your digital products</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-6">Start selling by adding your first digital product</p>
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
