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
import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Star,
  ShieldAlert,
} from "lucide-react";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AdminDashboard = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; type: string | null }>({
    open: false,
    id: null,
    type: null,
  });
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});

  // Fetch open/under-review disputes
  const { data: disputes, isLoading: disputesLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          orders (id, amount_usd, currency, escrow_status, products (title)),
          buyer:profiles!disputes_buyer_id_fkey (full_name),
          seller:profiles!disputes_seller_id_fkey (full_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: hasRole("admin"),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      inFavorOf,
    }: {
      id: string;
      inFavorOf: "buyer" | "seller";
    }) => {
      const decision = resolveNotes[id]?.trim() || `Resolved in favor of ${inFavorOf}`;
      const { error } = await supabase.rpc("admin_resolve_dispute", {
        p_dispute_id: id,
        p_decision: decision,
        p_in_favor_of: inFavorOf,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dispute resolved");
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to resolve dispute"),
  });

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

  // Calculate stats
  const stats = {
    totalUsers: users?.length || 0,
    totalProducts: products?.length || 0,
    totalRevenue: orders
      ?.filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + Number(o.amount_usd), 0) || 0,
    pendingProducts: products?.filter((p) => p.status === "pending")?.length || 0,
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto sm:h-10" height={40} priority />
          </Link>
          <Button variant="outline" onClick={signOut}>Logout</Button>
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
                Pending Review
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {productsLoading ? "..." : stats.pendingProducts}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="disputes">
              Disputes
              {disputes && disputes.filter((d: any) => d.status === "open" || d.status === "under_review").length > 0 && (
                <Badge className="ml-2 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {disputes.filter((d: any) => d.status === "open" || d.status === "under_review").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

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

          {/* Disputes Tab */}
          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  Escrow Disputes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {disputesLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : !disputes || disputes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No disputes have been opened yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {disputes.map((d: any) => {
                      const order = d.orders;
                      const isOpen = d.status === "open" || d.status === "under_review";
                      return (
                        <Card key={d.id} className="border-border">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold">
                                  {order?.products?.title || "Order"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Buyer: {d.buyer?.full_name || "—"} • Seller:{" "}
                                  {d.seller?.full_name || "—"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Opened {new Date(d.created_at).toLocaleString()} • $
                                  {Number(order?.amount_usd || 0).toFixed(2)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <EscrowStatusBadge status={order?.escrow_status} />
                                <Badge
                                  variant={isOpen ? "secondary" : "outline"}
                                  className={
                                    d.status === "resolved_buyer"
                                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                                      : d.status === "resolved_seller"
                                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                      : ""
                                  }
                                >
                                  {d.status.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>

                            <div className="text-sm bg-muted/50 rounded-md p-3">
                              <div className="font-medium mb-1">Buyer's message:</div>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {d.buyer_message}
                              </p>
                            </div>

                            {d.admin_decision && (
                              <div className="text-sm bg-muted/30 rounded-md p-3">
                                <div className="font-medium mb-1">Resolution:</div>
                                <p className="text-muted-foreground whitespace-pre-wrap">
                                  {d.admin_decision}
                                </p>
                              </div>
                            )}

                            {isOpen && (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Resolution notes (optional)..."
                                  value={resolveNotes[d.id] || ""}
                                  onChange={(e) =>
                                    setResolveNotes((p) => ({
                                      ...p,
                                      [d.id]: e.target.value,
                                    }))
                                  }
                                  rows={2}
                                />
                                <div className="flex flex-wrap gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      resolveMutation.mutate({
                                        id: d.id,
                                        inFavorOf: "seller",
                                      })
                                    }
                                    disabled={resolveMutation.isPending}
                                  >
                                    Resolve for seller (release)
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      resolveMutation.mutate({
                                        id: d.id,
                                        inFavorOf: "buyer",
                                      })
                                    }
                                    disabled={resolveMutation.isPending}
                                  >
                                    Resolve for buyer (refund)
                                  </Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
