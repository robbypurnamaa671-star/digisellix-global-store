import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AffiliatePayoutManagement = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch all payout requests
  const { data: payoutRequests, isLoading } = useQuery({
    queryKey: ["admin-payout-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_requests")
        .select(`
          *,
          affiliates (
            user_id,
            affiliate_code
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile names
      const userIds = [...new Set(data?.map(r => (r.affiliates as any)?.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        return data?.map(request => ({
          ...request,
          profile: profiles?.find(p => p.id === (request.affiliates as any)?.user_id),
        }));
      }

      return data;
    },
  });

  // Process payout mutation
  const processPayoutMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("payout_requests")
        .update({
          status,
          admin_notes: notes,
          processed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // If approved, update commission statuses to paid
      if (status === "paid") {
        const request = payoutRequests?.find(r => r.id === requestId);
        if (request) {
          const { error: commError } = await supabase
            .from("affiliate_commissions")
            .update({ status: "paid" })
            .eq("affiliate_id", (request.affiliates as any)?.id)
            .eq("status", "available");
          
          if (commError) console.error("Error updating commissions:", commError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payout-requests"] });
      toast.success("Payout request processed successfully");
      setDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process payout request");
    },
  });

  const handleProcess = (request: any) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const pendingCount = payoutRequests?.filter(r => r.status === "pending").length || 0;

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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Affiliate Payout Requests
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} pending</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and process affiliate payout requests
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
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        {(request as any).profile?.full_name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(request.affiliates as any)?.affiliate_code || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(request.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "paid"
                              ? "default"
                              : request.status === "rejected"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcess(request)}
                          >
                            Process
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout Request</DialogTitle>
            <DialogDescription>
              Amount: {formatCurrency(Number(selectedRequest?.amount || 0))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                placeholder="Add notes about this payout..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() =>
                  processPayoutMutation.mutate({
                    requestId: selectedRequest?.id,
                    status: "paid",
                    notes: adminNotes,
                  })
                }
                disabled={processPayoutMutation.isPending}
              >
                {processPayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Mark as Paid
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() =>
                  processPayoutMutation.mutate({
                    requestId: selectedRequest?.id,
                    status: "rejected",
                    notes: adminNotes,
                  })
                }
                disabled={processPayoutMutation.isPending}
              >
                {processPayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AffiliatePayoutManagement;
