import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingBag,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Star,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  BarChart3,
  UserPlus,
  Activity,
  MessagesSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { AdminForumManagement } from "@/components/admin/AdminForumManagement";
import AffiliatePayoutManagement from "@/components/admin/AffiliatePayoutManagement";

const AdminDashboard = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; type: string | null }>({
    open: false,
    id: null,
    type: null,
  });
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !hasRole("admin")) {
      navigate("/auth");
    }
  }, [user, hasRole, navigate]);

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles (role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin"),
  });

  // Fetch all products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          profiles (full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin"),
  });

  // Fetch all orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (title),
          profiles!orders_buyer_id_fkey (full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin"),
  });

  // Fetch all conversations for admin
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          buyer:profiles!conversations_buyer_id_fkey (id, full_name),
          seller:profiles!conversations_seller_id_fkey (id, full_name),
          products (title)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin"),
  });

  // Fetch messages for selected conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-messages", selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (id, full_name)
        `)
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin") && !!selectedConversation,
  });

  // Fetch product views for analytics
  const { data: productViews } = useQuery({
    queryKey: ["admin-product-views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_views")
        .select("*")
        .order("viewed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin"),
  });

  // Calculate stats
  const stats = {
    totalUsers: users?.length || 0,
    totalProducts: products?.length || 0,
    totalRevenue: orders
      ?.filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + Number(o.amount_usd), 0) || 0,
    pendingProducts: products?.filter((p) => p.status === "pending")?.length || 0,
    limitedSellers: users?.filter((u) => u.is_limited)?.length || 0,
    totalConversations: conversations?.length || 0,
    totalOrders: orders?.length || 0,
    paidOrders: orders?.filter((o) => o.payment_status === "paid")?.length || 0,
  };

  // Calculate analytics data
  const getLast7DaysData = () => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayUsers = users?.filter((u) => {
        const created = new Date(u.created_at);
        return created >= dayStart && created < dayEnd;
      }).length || 0;

      const dayOrders = orders?.filter((o) => {
        const created = new Date(o.created_at);
        return created >= dayStart && created < dayEnd;
      }).length || 0;

      const dayProducts = products?.filter((p) => {
        const created = new Date(p.created_at);
        return created >= dayStart && created < dayEnd;
      }).length || 0;

      const dayViews = productViews?.filter((v) => {
        const viewed = new Date(v.viewed_at);
        return viewed >= dayStart && viewed < dayEnd;
      }).length || 0;

      const dayRevenue = orders
        ?.filter((o) => {
          const created = new Date(o.created_at);
          return created >= dayStart && created < dayEnd && o.payment_status === "paid";
        })
        .reduce((sum, o) => sum + Number(o.amount_usd), 0) || 0;

      return {
        date: format(day, "MMM dd"),
        users: dayUsers,
        orders: dayOrders,
        products: dayProducts,
        views: dayViews,
        revenue: dayRevenue,
      };
    });
  };

  const getRoleDistribution = () => {
    const roleCount: Record<string, number> = { admin: 0, seller: 0, buyer: 0 };
    users?.forEach((u) => {
      const roles = u.user_roles as any[];
      roles?.forEach((r) => {
        if (roleCount[r.role] !== undefined) {
          roleCount[r.role]++;
        }
      });
    });
    return [
      { name: "Admins", value: roleCount.admin, color: "hsl(var(--primary))" },
      { name: "Sellers", value: roleCount.seller, color: "hsl(var(--accent))" },
      { name: "Buyers", value: roleCount.buyer, color: "hsl(var(--success))" },
    ];
  };

  const chartData = getLast7DaysData();
  const roleData = getRoleDistribution();

  // Remove seller limitation mutation
  const removeLimitationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_limited: false })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Seller limitation removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove limitation");
    },
  });

  // Update product status mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("products")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update product");
    },
  });

  // Toggle featured status mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_featured: isFeatured })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Featured status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update featured status");
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
      setDeleteDialog({ open: false, id: null, type: null });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const handleApprove = (productId: string) => {
    updateProductMutation.mutate({ id: productId, status: "active" });
  };

  const handleReject = (productId: string) => {
    updateProductMutation.mutate({ id: productId, status: "rejected" });
  };

  const handleDelete = () => {
    if (deleteDialog.id) {
      deleteProductMutation.mutate(deleteDialog.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Admin</Badge>;
      case "seller":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Seller</Badge>;
      case "buyer":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Buyer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, HH:mm");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Digisellix Admin
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/admin/moderation">
              <Button variant="default" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Moderation
              </Button>
            </Link>
            <Button variant="outline" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your marketplace</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{usersLoading ? "..." : stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Products
              </CardTitle>
              <Package className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{productsLoading ? "..." : stats.totalProducts}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {ordersLoading ? "..." : `$${stats.totalRevenue.toFixed(2)}`}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Conversations
              </CardTitle>
              <MessageSquare className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {conversationsLoading ? "..." : stats.totalConversations}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat Monitor
            </TabsTrigger>
            <TabsTrigger value="limited" className="relative">
              Limited Sellers
              {stats.limitedSellers > 0 && (
                <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-2">
                  {stats.limitedSellers}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="forum" className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4" />
              Forum
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payouts
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-6">
              {/* Overview Cards */}
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      New Users (7d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {chartData.reduce((sum, d) => sum + d.users, 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      New Products (7d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {chartData.reduce((sum, d) => sum + d.products, 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Orders (7d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {chartData.reduce((sum, d) => sum + d.orders, 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Product Views (7d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {chartData.reduce((sum, d) => sum + d.views, 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Overview (Last 7 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        users: { label: "Users", color: "hsl(var(--primary))" },
                        orders: { label: "Orders", color: "hsl(var(--accent))" },
                        products: { label: "Products", color: "hsl(var(--success))" },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="products" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        revenue: { label: "Revenue ($)", color: "hsl(var(--success))" },
                      }}
                      className="h-[300px]"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(var(--success))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--success))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Role Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>User Role Distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <div className="flex items-center gap-8 flex-wrap justify-center">
                    <div className="h-[200px] w-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={roleData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {roleData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2">
                      {roleData.map((role, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: role.color }}
                          />
                          <span>{role.name}: {role.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users?.slice(0, 3).map((u) => (
                      <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <UserPlus className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">New user: {u.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {format(new Date(u.created_at), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                    {products?.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <Package className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-medium">New product: {p.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Added {format(new Date(p.created_at), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                    {orders?.filter(o => o.payment_status === 'paid').slice(0, 3).map((o) => (
                      <div key={o.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <DollarSign className="h-5 w-5 text-success" />
                        <div>
                          <p className="font-medium">New sale: ${Number(o.amount_usd).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(o.created_at), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : !products || products.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No products yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => {
                        const seller = product.profiles as any;
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.thumbnail_url ? (
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
                                  <div className="font-medium line-clamp-1">{product.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.category}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{seller?.full_name || "Unknown"}</TableCell>
                            <TableCell>${Number(product.price_usd).toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(product.status)}</TableCell>
                            <TableCell>{product.total_sales}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  toggleFeaturedMutation.mutate({
                                    id: product.id,
                                    isFeatured: !product.is_featured,
                                  })
                                }
                                disabled={toggleFeaturedMutation.isPending}
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    product.is_featured
                                      ? "fill-accent text-accent"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/products/${product.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {product.status === "pending" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApprove(product.id)}
                                      disabled={updateProductMutation.isPending}
                                    >
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleReject(product.id)}
                                      disabled={updateProductMutation.isPending}
                                    >
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      id: product.id,
                                      type: "product",
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : !users || users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No users yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const roles = user.user_roles as any[];
                        
                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {roles?.map((r, idx) => (
                                  <span key={idx}>{getRoleBadge(r.role)}</span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Sales Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : !orders || orders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No orders yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => {
                        const product = order.products as any;
                        const buyer = order.profiles as any;
                        
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {product?.title || "Unknown"}
                            </TableCell>
                            <TableCell>{buyer?.full_name || "Unknown"}</TableCell>
                            <TableCell>${Number(order.amount_usd).toFixed(2)}</TableCell>
                            <TableCell>
                              {order.payment_status === "paid" ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                  Paid
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(order.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Monitor Tab */}
          <TabsContent value="chats">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat Monitor
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  View all conversations between buyers and sellers to monitor activity and resolve disputes.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Conversation List */}
                  <div className="lg:col-span-1 border rounded-lg">
                    <div className="p-3 border-b bg-muted/50">
                      <h3 className="font-medium">Conversations ({conversations?.length || 0})</h3>
                    </div>
                    <ScrollArea className="h-[500px]">
                      {conversationsLoading ? (
                        <div className="p-4">
                          <Skeleton className="h-16 w-full mb-2" />
                          <Skeleton className="h-16 w-full mb-2" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ) : !conversations || conversations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          No conversations yet
                        </div>
                      ) : (
                        <div className="divide-y">
                          {conversations.map((conv) => {
                            const buyer = conv.buyer as any;
                            const seller = conv.seller as any;
                            const product = conv.products as any;
                            
                            return (
                              <button
                                key={conv.id}
                                onClick={() => setSelectedConversation(conv.id)}
                                className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                                  selectedConversation === conv.id ? "bg-muted" : ""
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {buyer?.full_name || "Unknown"} ↔ {seller?.full_name || "Unknown"}
                                    </p>
                                    {product && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        Re: {product.title}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatTime(conv.updated_at)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Messages View */}
                  <div className="lg:col-span-2 border rounded-lg">
                    <div className="p-3 border-b bg-muted/50">
                      <h3 className="font-medium">
                        {selectedConversation ? "Message History" : "Select a conversation"}
                      </h3>
                    </div>
                    <ScrollArea className="h-[500px]">
                      {!selectedConversation ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Select a conversation to view messages</p>
                        </div>
                      ) : messagesLoading ? (
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-12 w-3/4" />
                          <Skeleton className="h-12 w-2/3 ml-auto" />
                          <Skeleton className="h-12 w-3/4" />
                        </div>
                      ) : !messages || messages.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          No messages in this conversation
                        </div>
                      ) : (
                        <div className="p-4 space-y-3">
                          {messages.map((msg) => {
                            const sender = msg.sender as any;
                            const selectedConv = conversations?.find(c => c.id === selectedConversation);
                            const isBuyer = selectedConv && msg.sender_id === (selectedConv.buyer as any)?.id;
                            
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isBuyer ? "justify-start" : "justify-end"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg p-3 ${
                                    isBuyer
                                      ? "bg-muted"
                                      : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-medium ${
                                      isBuyer ? "text-muted-foreground" : "text-primary-foreground/70"
                                    }`}>
                                      {sender?.full_name || "Unknown"} ({isBuyer ? "Buyer" : "Seller"})
                                    </span>
                                  </div>
                                  <p className="text-sm">{msg.content}</p>
                                  <span className={`text-xs ${
                                    isBuyer ? "text-muted-foreground" : "text-primary-foreground/70"
                                  }`}>
                                    {formatTime(msg.created_at)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Limited Sellers Tab */}
          <TabsContent value="limited">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Limited Seller Accounts
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sellers who received low ratings (3 stars or below) have limited accounts. 
                  Review their case and remove the limitation if appropriate.
                </p>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (() => {
                  const limitedSellers = users?.filter((u) => u.is_limited) || [];
                  
                  if (limitedSellers.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <ShieldCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Limited Accounts</h3>
                        <p className="text-muted-foreground">
                          All sellers are in good standing
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Seller Name</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {limitedSellers.map((seller) => (
                          <TableRow key={seller.id}>
                            <TableCell className="font-medium">{seller.full_name}</TableCell>
                            <TableCell>
                              {new Date(seller.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Limited
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeLimitationMutation.mutate(seller.id)}
                                disabled={removeLimitationMutation.isPending}
                              >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Remove Limitation
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forum Tab */}
          <TabsContent value="forum">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessagesSquare className="h-5 w-5" />
                  Forum Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdminForumManagement />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <AffiliatePayoutManagement />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;