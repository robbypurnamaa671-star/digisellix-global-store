import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ShieldCheck, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  IdCard,
  CreditCard,
  User,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface Verification {
  id: string;
  seller_id: string;
  ktp_name: string;
  ktp_number: string;
  ktp_image_url: string;
  selfie_image_url: string | null;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  profiles?: { full_name: string };
}

const AdminVerificationReview = () => {
  const queryClient = useQueryClient();
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch all pending verifications
  const { data: verifications, isLoading } = useQuery({
    queryKey: ['admin-verifications'],
    queryFn: async () => {
      // First get verifications
      const { data: verificationsData, error } = await supabase
        .from('seller_verifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Then get profile names for each seller
      const sellersIds = verificationsData.map(v => v.seller_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', sellersIds);
      
      // Map profiles to verifications
      return verificationsData.map(v => ({
        ...v,
        profiles: profilesData?.find(p => p.id === v.seller_id) || { full_name: 'Unknown' }
      })) as Verification[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ verificationId, action, reason }: { verificationId: string; action: 'approve' | 'reject'; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-review-verification', {
        body: {
          verificationId,
          action,
          rejectionReason: reason,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      toast.success(variables.action === 'approve' ? 'Verification approved' : 'Verification rejected');
      setSelectedVerification(null);
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (error) => {
      console.error('Review error:', error);
      toast.error('Failed to process verification');
    },
  });

  const handleApprove = (verificationId: string) => {
    reviewMutation.mutate({ verificationId, action: 'approve' });
  };

  const handleReject = () => {
    if (!selectedVerification || !rejectionReason) return;
    reviewMutation.mutate({ 
      verificationId: selectedVerification.id, 
      action: 'reject', 
      reason: rejectionReason 
    });
  };

  const openRejectDialog = (verification: Verification) => {
    setSelectedVerification(verification);
    setShowRejectDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = verifications?.filter(v => v.verification_status === 'pending').length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Seller Verifications</CardTitle>
            </div>
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount} pending</Badge>
            )}
          </div>
          <CardDescription>
            Review seller verification requests for escrow activation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verifications?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No verification requests yet
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {verifications?.map((verification) => (
                  <Card key={verification.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {verification.profiles?.full_name || 'Unknown'}
                              </span>
                            </div>
                            {getStatusBadge(verification.verification_status)}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            {/* KTP Info */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 font-medium">
                                <IdCard className="h-4 w-4" />
                                KTP Information
                              </div>
                              <div className="pl-6 space-y-1 text-muted-foreground">
                                <p>Name: <span className="text-foreground">{verification.ktp_name}</span></p>
                                <p>Number: <span className="text-foreground">{verification.ktp_number}</span></p>
                                <div className="flex items-center gap-2">
                                  <a 
                                    href={verification.ktp_image_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" /> View KTP
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  {verification.selfie_image_url && (
                                    <a 
                                      href={verification.selfie_image_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center gap-1"
                                    >
                                      <Eye className="h-3 w-3" /> View Selfie
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Bank Info */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 font-medium">
                                <CreditCard className="h-4 w-4" />
                                Bank Information
                              </div>
                              <div className="pl-6 space-y-1 text-muted-foreground">
                                <p>Bank: <span className="text-foreground">{verification.bank_name}</span></p>
                                <p>Account: <span className="text-foreground">{verification.bank_account_number}</span></p>
                                <p>Name: <span className="text-foreground">{verification.bank_account_name}</span></p>
                              </div>
                            </div>
                          </div>

                          {/* Name Match Check */}
                          <div className="text-sm">
                            <span className="text-muted-foreground">Name Match: </span>
                            {verification.ktp_name.toLowerCase() === verification.bank_account_name.toLowerCase() ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Match</Badge>
                            ) : (
                              <Badge variant="destructive">Mismatch</Badge>
                            )}
                          </div>

                          {verification.rejection_reason && (
                            <div className="text-sm bg-destructive/10 p-2 rounded">
                              <span className="text-destructive font-medium">Rejection Reason: </span>
                              {verification.rejection_reason}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Submitted: {format(new Date(verification.created_at), "MMM dd, yyyy HH:mm")}
                            {verification.verified_at && (
                              <span> • Verified: {format(new Date(verification.verified_at), "MMM dd, yyyy HH:mm")}</span>
                            )}
                          </div>
                        </div>

                        {verification.verification_status === 'pending' && (
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(verification.id)}
                              disabled={reviewMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {reviewMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(verification)}
                              disabled={reviewMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this verification request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., KTP photo is blurry, Name mismatch between KTP and bank account..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason || reviewMutation.isPending}
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminVerificationReview;
