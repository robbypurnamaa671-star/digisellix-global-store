import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  Users, 
  Clock, 
  CheckCircle, 
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Handshake,
  CreditCard,
  FileText,
  Timer,
  ShieldCheck
} from "lucide-react";

const EscrowCreate = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [formData, setFormData] = useState({
    counterpartyEmail: "",
    itemTitle: "",
    itemDescription: "",
    amountUSD: "",
    amountIDR: "",
    currency: "USD",
    feePayer: "buyer",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(language === 'id' ? 'Silakan masuk terlebih dahulu' : 'Please sign in first');
      navigate('/auth');
      return;
    }

    const amountUsd = parseFloat(formData.amountUSD) || 0;
    const amountIdr = parseFloat(formData.amountIDR) || 0;

    if (amountUsd <= 0 && amountIdr <= 0) {
      toast.error(language === 'id' ? 'Masukkan jumlah yang valid' : 'Enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('escrow-api/create', {
        body: {
          sellerEmail: formData.counterpartyEmail,
          title: formData.itemTitle,
          description: formData.itemDescription,
          amountUsd,
          amountIdr,
          currency: formData.currency,
          feePayer: formData.feePayer,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create escrow');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to create escrow');
      }

      toast.success(language === 'id' 
        ? 'Transaksi escrow berhasil dibuat!' 
        : 'Escrow transaction created successfully!');
      navigate(`/escrow/${response.data.escrow.id}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : (language === 'id' ? 'Terjadi kesalahan' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const guarantees = [
    {
      icon: ShieldCheck,
      title: language === 'id' ? 'Dana Aman Terjamin' : 'Guaranteed Safe Funds',
      desc: language === 'id' 
        ? 'Dana ditahan oleh Digisellix sampai kedua pihak setuju'
        : 'Funds held by Digisellix until both parties agree',
    },
    {
      icon: Timer,
      title: language === 'id' ? 'Auto-Release 7 Hari' : '7-Day Auto-Release',
      desc: language === 'id'
        ? 'Jika pembeli tidak konfirmasi dalam 7 hari, dana otomatis dilepas ke penjual'
        : 'If buyer doesn\'t confirm within 7 days, funds auto-release to seller',
    },
    {
      icon: Users,
      title: language === 'id' ? 'Mediasi Admin' : 'Admin Mediation',
      desc: language === 'id'
        ? 'Tim admin kami siap membantu menyelesaikan sengketa'
        : 'Our admin team is ready to help resolve disputes',
    },
    {
      icon: FileText,
      title: language === 'id' ? 'Bukti Transaksi' : 'Transaction Proof',
      desc: language === 'id'
        ? 'Semua transaksi tercatat dan dapat diakses sebagai bukti'
        : 'All transactions are recorded and can be accessed as proof',
    },
  ];

  const timeline = [
    {
      step: 1,
      title: language === 'id' ? 'Buat Transaksi' : 'Create Transaction',
      desc: language === 'id' 
        ? 'Pembeli atau penjual membuat transaksi escrow'
        : 'Buyer or seller creates escrow transaction',
      time: language === 'id' ? '~5 menit' : '~5 mins',
    },
    {
      step: 2,
      title: language === 'id' ? 'Pembayaran' : 'Payment',
      desc: language === 'id'
        ? 'Pembeli melakukan pembayaran ke escrow'
        : 'Buyer makes payment to escrow',
      time: language === 'id' ? '~10 menit' : '~10 mins',
    },
    {
      step: 3,
      title: language === 'id' ? 'Pengiriman' : 'Delivery',
      desc: language === 'id'
        ? 'Penjual mengirim barang/jasa ke pembeli'
        : 'Seller delivers goods/services to buyer',
      time: language === 'id' ? 'Sesuai kesepakatan' : 'As agreed',
    },
    {
      step: 4,
      title: language === 'id' ? 'Konfirmasi' : 'Confirmation',
      desc: language === 'id'
        ? 'Pembeli mengkonfirmasi penerimaan'
        : 'Buyer confirms receipt',
      time: language === 'id' ? '1-7 hari' : '1-7 days',
    },
    {
      step: 5,
      title: language === 'id' ? 'Dana Dilepas' : 'Funds Released',
      desc: language === 'id'
        ? 'Dana dilepas ke penjual setelah konfirmasi'
        : 'Funds released to seller after confirmation',
      time: language === 'id' ? 'Instan' : 'Instant',
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center space-y-4">
              <Shield className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">
                {language === 'id' ? 'Masuk Diperlukan' : 'Login Required'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'id' 
                  ? 'Silakan masuk untuk menggunakan layanan escrow' 
                  : 'Please sign in to use escrow service'}
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">{language === 'id' ? 'Masuk Sekarang' : 'Sign In Now'}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={language === 'id' ? 'Buat Transaksi Escrow | Digisellix' : 'Create Escrow Transaction | Digisellix'}
        description={language === 'id' 
          ? 'Buat transaksi escrow aman dengan Digisellix sebagai pihak ketiga terpercaya'
          : 'Create secure escrow transaction with Digisellix as trusted third party'}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/escrow">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {language === 'id' ? 'Kembali ke Escrow' : 'Back to Escrow'}
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Handshake className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>
                      {language === 'id' ? 'Buat Transaksi Escrow' : 'Create Escrow Transaction'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'id' 
                        ? 'Isi detail transaksi untuk memulai escrow' 
                        : 'Fill in transaction details to start escrow'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label>{language === 'id' ? 'Anda adalah' : 'You are the'}</Label>
                    <RadioGroup 
                      value={role} 
                      onValueChange={(v) => setRole(v as "buyer" | "seller")}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${role === 'buyer' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="buyer" id="buyer" />
                        <Label htmlFor="buyer" className="cursor-pointer flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {language === 'id' ? 'Pembeli' : 'Buyer'}
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${role === 'seller' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="seller" id="seller" />
                        <Label htmlFor="seller" className="cursor-pointer flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {language === 'id' ? 'Penjual' : 'Seller'}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Counterparty Email */}
                  <div className="space-y-2">
                    <Label htmlFor="counterpartyEmail">
                      {role === 'buyer' 
                        ? (language === 'id' ? 'Email Penjual' : 'Seller Email')
                        : (language === 'id' ? 'Email Pembeli' : 'Buyer Email')
                      }
                    </Label>
                    <Input
                      id="counterpartyEmail"
                      type="email"
                      placeholder={language === 'id' ? 'email@contoh.com' : 'email@example.com'}
                      value={formData.counterpartyEmail}
                      onChange={(e) => setFormData({ ...formData, counterpartyEmail: e.target.value })}
                      required
                    />
                  </div>

                  {/* Item Details */}
                  <div className="space-y-2">
                    <Label htmlFor="itemTitle">
                      {language === 'id' ? 'Nama Barang/Jasa' : 'Item/Service Name'}
                    </Label>
                    <Input
                      id="itemTitle"
                      placeholder={language === 'id' ? 'contoh: Website Development' : 'e.g., Website Development'}
                      value={formData.itemTitle}
                      onChange={(e) => setFormData({ ...formData, itemTitle: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itemDescription">
                      {language === 'id' ? 'Deskripsi Detail' : 'Detailed Description'}
                    </Label>
                    <Textarea
                      id="itemDescription"
                      placeholder={language === 'id' 
                        ? 'Jelaskan detail transaksi, termasuk spesifikasi, waktu pengerjaan, dll.'
                        : 'Describe the transaction details, including specifications, timeline, etc.'}
                      value={formData.itemDescription}
                      onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-4">
                    <Label>{language === 'id' ? 'Jumlah Pembayaran' : 'Payment Amount'}</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amountUSD" className="text-sm text-muted-foreground">USD</Label>
                        <Input
                          id="amountUSD"
                          type="number"
                          placeholder="0.00"
                          value={formData.amountUSD}
                          onChange={(e) => setFormData({ ...formData, amountUSD: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amountIDR" className="text-sm text-muted-foreground">IDR</Label>
                        <Input
                          id="amountIDR"
                          type="number"
                          placeholder="0"
                          value={formData.amountIDR}
                          onChange={(e) => setFormData({ ...formData, amountIDR: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fee Payer */}
                  <div className="space-y-3">
                    <Label>{language === 'id' ? 'Biaya 5% Dibayar Oleh' : '5% Fee Paid By'}</Label>
                    <RadioGroup 
                      value={formData.feePayer} 
                      onValueChange={(v) => setFormData({ ...formData, feePayer: v })}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.feePayer === 'buyer' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="buyer" id="fee-buyer" />
                        <Label htmlFor="fee-buyer" className="cursor-pointer">
                          {language === 'id' ? 'Pembeli' : 'Buyer'}
                        </Label>
                      </div>
                      <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.feePayer === 'seller' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value="seller" id="fee-seller" />
                        <Label htmlFor="fee-seller" className="cursor-pointer">
                          {language === 'id' ? 'Penjual' : 'Seller'}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {language === 'id' 
                        ? 'Pastikan email pihak lain benar. Mereka akan menerima undangan untuk bergabung dalam transaksi escrow ini.'
                        : 'Make sure the other party\'s email is correct. They will receive an invitation to join this escrow transaction.'}
                    </AlertDescription>
                  </Alert>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {language === 'id' ? 'Buat Transaksi Escrow' : 'Create Escrow Transaction'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Transaction Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {language === 'id' ? 'Timeline Transaksi' : 'Transaction Timeline'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {timeline.map((item, idx) => (
                    <div key={idx} className="flex gap-4 pb-8 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {item.step}
                        </div>
                        {idx < timeline.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{item.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {item.time}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Guarantees */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {language === 'id' ? 'Jaminan Keamanan' : 'Security Guarantees'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {guarantees.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}

                <Separator />

                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-primary">5%</div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'id' ? 'Biaya Platform' : 'Platform Fee'}
                  </p>
                </div>

                <Separator />

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {language === 'id' ? 'Butuh bantuan?' : 'Need help?'}
                  </p>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/contact">
                      {language === 'id' ? 'Hubungi Admin' : 'Contact Admin'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowCreate;
