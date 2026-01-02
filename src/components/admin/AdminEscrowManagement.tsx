import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Search,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

interface EscrowTransaction {
  id: string;
  transaction_code: string;
  title: string;
  buyer_id: string;
  seller_id: string | null;
  seller_email: string | null;
  amount_usd: number;
  amount_idr: number;
  currency: string;
  status: string;
  payment_status: string;
  created_at: string;
  disputed_at: string | null;
  buyer_profile?: { full_name: string } | null;
  seller_profile?: { full_name: string } | null;
}

const AdminEscrowManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: escrowTransactions, isLoading } = useQuery({
    queryKey: ["admin-escrow-transactions"],
    queryFn: async () => {
      // Fetch escrow transactions
      const { data: escrows, error } = await supabase
        .from("escrow_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const buyerIds = [...new Set(escrows.map(e => e.buyer_id))];
      const sellerIds = [...new Set(escrows.filter(e => e.seller_id).map(e => e.seller_id as string))];
      const allUserIds = [...new Set([...buyerIds, ...sellerIds])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Combine data
      return escrows.map(e => ({
        ...e,
        buyer_profile: profileMap.get(e.buyer_id) || null,
        seller_profile: e.seller_id ? profileMap.get(e.seller_id) || null : null,
      })) as EscrowTransaction[];
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      accepted: { variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
      funded: { variant: "default", icon: <DollarSign className="h-3 w-3" /> },
      delivered: { variant: "default", icon: <Package className="h-3 w-3" /> },
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
      disputed: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
      refunded: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      cancelled: { variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="gap-1 capitalize">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const filteredTransactions = escrowTransactions?.filter((tx) => {
    const matchesSearch =
      tx.transaction_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.buyer_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.seller_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.seller_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const disputedCount = escrowTransactions?.filter((tx) => tx.status === "disputed").length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disputed Transactions Alert */}
      {disputedCount > 0 && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {disputedCount} disputed transaction{disputedCount > 1 ? "s" : ""} require attention
                </p>
                <p className="text-sm text-muted-foreground">
                  Review and resolve disputes to maintain platform trust
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={() => setStatusFilter("disputed")}
              >
                View Disputes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, title, buyer, seller..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Escrow Transactions ({filteredTransactions?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No escrow transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions?.map((tx) => (
                    <TableRow key={tx.id} className={tx.status === "disputed" ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-sm">
                        {tx.transaction_code}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.title}
                      </TableCell>
                      <TableCell>
                        {tx.buyer_profile?.full_name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {tx.seller_profile?.full_name || tx.seller_email || "Pending"}
                      </TableCell>
                      <TableCell>
                        {tx.currency === "IDR"
                          ? `Rp ${tx.amount_idr.toLocaleString("id-ID")}`
                          : `$${tx.amount_usd.toLocaleString()}`}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/escrow/${tx.id}`)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          {tx.status === "disputed" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => navigate(`/escrow/${tx.id}`)}
                              className="gap-1"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEscrowManagement;
