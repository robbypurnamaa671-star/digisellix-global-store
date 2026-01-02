import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  Loader2,
  User,
  CreditCard,
  Package,
  MessageSquare,
  Timer,
  DollarSign,
  Gavel,
} from "lucide-react";

interface EscrowTransaction {
  id: string;
  transaction_code: string;
  buyer_id: string;
  seller_id: string | null;
  seller_email: string;
  title: string;
  description: string | null;
  amount_usd: number;
  amount_idr: number;
  currency: string;
  platform_fee_percent: number;
  platform_fee: number;
  fee_payer: string;
  status: string;
  payment_status: string;
  escrow_amount: number;
  seller_payout: number;
  created_at: string;
  accepted_at: string | null;
  funded_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  disputed_at: string | null;
  resolved_at: string | null;
  auto_release_at: string | null;
  dispute_reason: string | null;
  dispute_by: string | null;
  resolution_notes: string | null;
  resolution_in_favor: string | null;
}

interface EscrowMessage {
  id: string;
  escrow_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  is_system_message: boolean;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  escrow_id: string;
  event_type: string;
  event_description: string;
  actor_role: string;
  created_at: string;
}

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

const EscrowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [escrow, setEscrow] = useState<EscrowTransaction | null>(null);
  const [messages, setMessages] = useState<EscrowMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<Profile | null>(null);
  const [sellerProfile, setSellerProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionFavor, setResolutionFavor] = useState<"buyer" | "seller">("buyer");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const fetchEscrowDetails = async () => {
    if (!id) return;

    try {
      const response = await supabase.functions.invoke(`escrow-api/get?id=${id}`, {
        method: 'GET',
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to fetch escrow');
      }

      setEscrow(response.data.escrow);
      setMessages(response.data.messages || []);
      setTimeline(response.data.timeline || []);
      setBuyerProfile(response.data.buyerProfile);
      setSellerProfile(response.data.sellerProfile);
      setUserRole(response.data.userRole);
    } catch (error) {
      console.error('Error fetching escrow:', error);
      toast.error(language === 'id' ? 'Gagal memuat data' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscrowDetails();
  }, [id]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!id) return;

    const messagesChannel = supabase
      .channel(`escrow-messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'escrow_messages',
          filter: `escrow_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as EscrowMessage]);
        }
      )
      .subscribe();

    const timelineChannel = supabase
      .channel(`escrow-timeline-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'escrow_timeline',
          filter: `escrow_id=eq.${id}`,
        },
        (payload) => {
          setTimeline((prev) => [...prev, payload.new as TimelineEvent]);
          fetchEscrowDetails(); // Refresh escrow status
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(timelineChannel);
    };
  }, [id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAction = async (action: string, body: Record<string, unknown> = {}) => {
    setActionLoading(true);
    try {
      const response = await supabase.functions.invoke(`escrow-api/${action}`, {
        body: { escrowId: id, ...body },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Action failed');
      }

      toast.success(response.data.message);
      fetchEscrowDetails();
    } catch (error) {
      console.error('Action error:', error);
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const response = await supabase.functions.invoke('escrow-api/message', {
        body: { escrowId: id, message: newMessage },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || 'Failed to send message');
      }

      setNewMessage("");
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(language === 'id' ? 'Gagal mengirim pesan' : 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" />, label: language === 'id' ? 'Menunggu' : 'Pending' },
      accepted: { variant: "outline", icon: <CheckCircle className="h-3 w-3" />, label: language === 'id' ? 'Diterima' : 'Accepted' },
      funded: { variant: "default", icon: <DollarSign className="h-3 w-3" />, label: language === 'id' ? 'Dana Diterima' : 'Funded' },
      delivered: { variant: "default", icon: <Package className="h-3 w-3" />, label: language === 'id' ? 'Terkirim' : 'Delivered' },
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" />, label: language === 'id' ? 'Selesai' : 'Completed' },
      disputed: { variant: "destructive", icon: <AlertTriangle className="h-3 w-3" />, label: language === 'id' ? 'Sengketa' : 'Disputed' },
      refunded: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: language === 'id' ? 'Dikembalikan' : 'Refunded' },
      cancelled: { variant: "secondary", icon: <XCircle className="h-3 w-3" />, label: language === 'id' ? 'Dibatalkan' : 'Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      buyer: language === 'id' ? 'Pembeli' : 'Buyer',
      seller: language === 'id' ? 'Penjual' : 'Seller',
      admin: 'Admin',
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      buyer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      seller: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {language === 'id' ? 'Transaksi Tidak Ditemukan' : 'Transaction Not Found'}
          </h2>
          <Button asChild className="mt-4">
            <Link to="/escrow">{language === 'id' ? 'Kembali' : 'Go Back'}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canAccept = userRole === 'seller' && escrow.status === 'pending';
  const canFund = userRole === 'buyer' && escrow.status === 'accepted';
  const canDeliver = userRole === 'seller' && escrow.status === 'funded';
  const canConfirm = userRole === 'buyer' && (escrow.status === 'funded' || escrow.status === 'delivered');
  const canDispute = (userRole === 'buyer' || userRole === 'seller') && ['funded', 'delivered'].includes(escrow.status);
  const canResolve = userRole === 'admin' && escrow.status === 'disputed';
  const canCancel = (userRole === 'buyer' || userRole === 'admin') && ['pending', 'accepted'].includes(escrow.status);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${escrow.title} - Escrow | Digisellix`}
        description={language === 'id' ? 'Detail transaksi escrow' : 'Escrow transaction details'}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/escrow">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'id' ? 'Kembali ke Escrow' : 'Back to Escrow'}
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{escrow.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {escrow.transaction_code}
                    </CardDescription>
                  </div>
                  {getStatusBadge(escrow.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {escrow.description && (
                  <p className="text-muted-foreground">{escrow.description}</p>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">
                      {language === 'id' ? 'Jumlah' : 'Amount'}
                    </div>
                    <div className="text-2xl font-bold">
                      {escrow.currency === 'IDR' 
                        ? `Rp ${escrow.amount_idr.toLocaleString('id-ID')}`
                        : `$${escrow.amount_usd.toLocaleString()}`}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-sm text-muted-foreground">
                      {language === 'id' ? 'Biaya Platform' : 'Platform Fee'}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {escrow.currency === 'IDR' 
                        ? `Rp ${escrow.platform_fee.toLocaleString('id-ID')}`
                        : `$${escrow.platform_fee.toLocaleString()}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {escrow.platform_fee_percent}% • {language === 'id' ? 'Dibayar oleh' : 'Paid by'} {escrow.fee_payer === 'buyer' ? (language === 'id' ? 'Pembeli' : 'Buyer') : (language === 'id' ? 'Penjual' : 'Seller')}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-sm text-muted-foreground">
                    {language === 'id' ? 'Penjual Terima' : 'Seller Receives'}
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {escrow.currency === 'IDR' 
                      ? `Rp ${escrow.seller_payout.toLocaleString('id-ID')}`
                      : `$${escrow.seller_payout.toLocaleString()}`}
                  </div>
                </div>

                {escrow.auto_release_at && escrow.status === 'funded' && (
                  <Alert>
                    <Timer className="h-4 w-4" />
                    <AlertDescription>
                      {language === 'id' 
                        ? `Auto-release pada: ${new Date(escrow.auto_release_at).toLocaleString()}`
                        : `Auto-release on: ${new Date(escrow.auto_release_at).toLocaleString()}`}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {canAccept && (
                    <Button onClick={() => handleAction('accept')} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {language === 'id' ? 'Terima Transaksi' : 'Accept Transaction'}
                    </Button>
                  )}

                  {canFund && (
                    <Button onClick={() => handleAction('fund', { paymentMethod: 'manual', paymentReference: 'PENDING' })} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CreditCard className="mr-2 h-4 w-4" />
                      {language === 'id' ? 'Bayar Escrow' : 'Fund Escrow'}
                    </Button>
                  )}

                  {canDeliver && (
                    <Button onClick={() => handleAction('deliver')} disabled={actionLoading}>
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Package className="mr-2 h-4 w-4" />
                      {language === 'id' ? 'Tandai Terkirim' : 'Mark as Delivered'}
                    </Button>
                  )}

                  {canConfirm && (
                    <Button onClick={() => handleAction('confirm')} disabled={actionLoading} variant="default">
                      {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {language === 'id' ? 'Konfirmasi Terima' : 'Confirm Receipt'}
                    </Button>
                  )}

                  {canDispute && (
                    <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          {language === 'id' ? 'Buka Sengketa' : 'Open Dispute'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{language === 'id' ? 'Buka Sengketa' : 'Open Dispute'}</DialogTitle>
                          <DialogDescription>
                            {language === 'id' 
                              ? 'Jelaskan alasan Anda membuka sengketa. Admin akan meninjau kasus ini.'
                              : 'Explain why you are opening a dispute. Admin will review this case.'}
                          </DialogDescription>
                        </DialogHeader>
                        <Textarea
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder={language === 'id' ? 'Alasan sengketa...' : 'Dispute reason...'}
                          rows={4}
                        />
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                            {language === 'id' ? 'Batal' : 'Cancel'}
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => {
                              handleAction('dispute', { reason: disputeReason });
                              setDisputeDialogOpen(false);
                            }}
                            disabled={!disputeReason.trim() || actionLoading}
                          >
                            {language === 'id' ? 'Kirim Sengketa' : 'Submit Dispute'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {canResolve && (
                    <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="default">
                          <Gavel className="mr-2 h-4 w-4" />
                          {language === 'id' ? 'Selesaikan Sengketa' : 'Resolve Dispute'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{language === 'id' ? 'Selesaikan Sengketa' : 'Resolve Dispute'}</DialogTitle>
                          <DialogDescription>
                            {language === 'id' 
                              ? 'Tentukan keputusan untuk sengketa ini.'
                              : 'Make a decision for this dispute.'}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>{language === 'id' ? 'Keputusan mendukung' : 'Decision in favor of'}</Label>
                            <RadioGroup value={resolutionFavor} onValueChange={(v) => setResolutionFavor(v as "buyer" | "seller")} className="mt-2">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="buyer" id="favor-buyer" />
                                <Label htmlFor="favor-buyer">{language === 'id' ? 'Pembeli (Refund)' : 'Buyer (Refund)'}</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="seller" id="favor-seller" />
                                <Label htmlFor="favor-seller">{language === 'id' ? 'Penjual (Release)' : 'Seller (Release)'}</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          <div>
                            <Label>{language === 'id' ? 'Catatan Keputusan' : 'Resolution Notes'}</Label>
                            <Textarea
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder={language === 'id' ? 'Jelaskan keputusan...' : 'Explain decision...'}
                              rows={3}
                              className="mt-2"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                            {language === 'id' ? 'Batal' : 'Cancel'}
                          </Button>
                          <Button 
                            onClick={() => {
                              handleAction('resolve', { inFavorOf: resolutionFavor, notes: resolutionNotes });
                              setResolveDialogOpen(false);
                            }}
                            disabled={!resolutionNotes.trim() || actionLoading}
                          >
                            {language === 'id' ? 'Konfirmasi' : 'Confirm'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}

                  {canCancel && (
                    <Button variant="outline" onClick={() => handleAction('cancel')} disabled={actionLoading}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {language === 'id' ? 'Batalkan' : 'Cancel'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {language === 'id' ? 'Obrolan Transaksi' : 'Transaction Chat'}
                </CardTitle>
                <CardDescription>
                  {language === 'id' 
                    ? 'Komunikasi antara pembeli, penjual, dan admin'
                    : 'Communication between buyer, seller, and admin'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.is_system_message ? 'justify-center' : ''}`}
                      >
                        {msg.is_system_message ? (
                          <div className="px-4 py-2 rounded-lg bg-muted text-center text-sm text-muted-foreground max-w-md">
                            {msg.message}
                          </div>
                        ) : (
                          <>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={
                                msg.sender_role === 'buyer' ? buyerProfile?.avatar_url || '' :
                                msg.sender_role === 'seller' ? sellerProfile?.avatar_url || '' : ''
                              } />
                              <AvatarFallback>
                                {msg.sender_role === 'admin' ? 'A' : msg.sender_role[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {msg.sender_role === 'buyer' ? buyerProfile?.full_name :
                                   msg.sender_role === 'seller' ? sellerProfile?.full_name :
                                   'Admin'}
                                </span>
                                <Badge className={`text-xs ${getRoleBadgeColor(msg.sender_role)}`}>
                                  {getRoleLabel(msg.sender_role)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(msg.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="mt-1 text-sm">{msg.message}</p>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={language === 'id' ? 'Ketik pesan...' : 'Type a message...'}
                    className="min-h-[60px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parties */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{language === 'id' ? 'Pihak Terlibat' : 'Parties Involved'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={buyerProfile?.avatar_url || ''} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{buyerProfile?.full_name || 'Buyer'}</div>
                    <Badge variant="outline" className="text-xs">{language === 'id' ? 'Pembeli' : 'Buyer'}</Badge>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={sellerProfile?.avatar_url || ''} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {sellerProfile?.full_name || escrow.seller_email}
                    </div>
                    <Badge variant="outline" className="text-xs">{language === 'id' ? 'Penjual' : 'Seller'}</Badge>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Shield className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">Digisellix</div>
                    <Badge variant="outline" className="text-xs">Admin / Escrow</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {language === 'id' ? 'Riwayat' : 'Timeline'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {timeline.map((event, idx) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {idx < timeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm">{event.event_description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Fee Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{language === 'id' ? 'Rincian Biaya' : 'Fee Details'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'id' ? 'Jumlah' : 'Amount'}</span>
                  <span>${escrow.amount_usd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'id' ? 'Biaya Platform' : 'Platform Fee'}</span>
                  <span>${escrow.platform_fee} ({escrow.platform_fee_percent}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'id' ? 'Dibayar oleh' : 'Fee paid by'}</span>
                  <Badge variant="secondary">{getRoleLabel(escrow.fee_payer)}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>{language === 'id' ? 'Penjual terima' : 'Seller receives'}</span>
                  <span className="text-primary">${escrow.seller_payout}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowDetail;
