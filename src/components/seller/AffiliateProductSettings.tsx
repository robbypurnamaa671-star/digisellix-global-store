import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link2, Percent, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProductAffiliateSettings {
  id: string;
  title: string;
  affiliate_enabled: boolean;
  affiliate_commission_percent: number;
}

const AffiliateProductSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [commissionValue, setCommissionValue] = useState("");

  // Fetch seller's products
  const { data: products, isLoading } = useQuery({
    queryKey: ["seller-products-affiliate", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, title, affiliate_enabled, affiliate_commission_percent")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProductAffiliateSettings[];
    },
    enabled: !!user?.id,
  });

  // Fetch affiliate stats for seller's products
  const { data: affiliateStats } = useQuery({
    queryKey: ["seller-affiliate-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { totalSales: 0, totalCommission: 0 };

      const { data: productIds } = await supabase
        .from("products")
        .select("id")
        .eq("seller_id", user.id);

      if (!productIds?.length) return { totalSales: 0, totalCommission: 0 };

      const ids = productIds.map(p => p.id);

      const { data: commissions } = await supabase
        .from("affiliate_commissions")
        .select("commission_amount")
        .in("product_id", ids);

      const totalSales = commissions?.length || 0;
      const totalCommission = commissions?.reduce(
        (sum, c) => sum + Number(c.commission_amount),
        0
      ) || 0;

      return { totalSales, totalCommission };
    },
    enabled: !!user?.id,
  });

  // Update product affiliate settings
  const updateMutation = useMutation({
    mutationFn: async ({
      productId,
      enabled,
      commission,
    }: {
      productId: string;
      enabled?: boolean;
      commission?: number;
    }) => {
      const updates: any = {};
      if (enabled !== undefined) updates.affiliate_enabled = enabled;
      if (commission !== undefined) updates.affiliate_commission_percent = commission;

      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId)
        .eq("seller_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-products-affiliate"] });
      toast.success("Affiliate settings updated");
      setEditingProduct(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleToggle = (productId: string, currentEnabled: boolean) => {
    updateMutation.mutate({ productId, enabled: !currentEnabled });
  };

  const handleCommissionSave = (productId: string) => {
    const commission = parseFloat(commissionValue);
    if (isNaN(commission) || commission < 5 || commission > 50) {
      toast.error("Commission must be between 5% and 50%");
      return;
    }
    updateMutation.mutate({ productId, commission });
  };

  const startEditing = (productId: string, currentCommission: number) => {
    setEditingProduct(productId);
    setCommissionValue(currentCommission.toString());
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Affiliate Sales</p>
                <p className="text-2xl font-bold">{affiliateStats?.totalSales || 0}</p>
              </div>
              <Link2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commission Paid</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(affiliateStats?.totalCommission || 0)}
                </p>
              </div>
              <Percent className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Affiliate Settings
          </CardTitle>
          <CardDescription>
            Enable affiliate program for your products and set commission rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No products yet. Add products to enable affiliate program.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Affiliate Enabled</TableHead>
                    <TableHead>Commission %</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.title}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={product.affiliate_enabled || false}
                          onCheckedChange={() =>
                            handleToggle(product.id, product.affiliate_enabled || false)
                          }
                          disabled={updateMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        {editingProduct === product.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={commissionValue}
                              onChange={(e) => setCommissionValue(e.target.value)}
                              className="w-20"
                              min={5}
                              max={50}
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">
                            {product.affiliate_commission_percent || 10}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingProduct === product.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleCommissionSave(product.id)}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingProduct(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              startEditing(
                                product.id,
                                product.affiliate_commission_percent || 10
                              )
                            }
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateProductSettings;
