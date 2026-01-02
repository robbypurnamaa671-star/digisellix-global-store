import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ShieldCheck, 
  Upload, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  CreditCard,
  IdCard,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const SellerVerificationForm = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const ktpInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [ktpName, setKtpName] = useState("");
  const [ktpNumber, setKtpNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch existing verification
  const { data: verification, isLoading } = useQuery({
    queryKey: ['seller-verification', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('seller_verifications')
        .select('*')
        .eq('seller_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch seller profile for escrow status
  const { data: sellerProfile } = useQuery({
    queryKey: ['seller-profile-escrow', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('escrow_enabled, verification_status')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set initial values when verification data loads
  if (verification && !ktpName) {
    setKtpName(verification.ktp_name || "");
    setKtpNumber(verification.ktp_number || "");
    setBankName(verification.bank_name || "");
    setBankAccountNumber(verification.bank_account_number || "");
    setBankAccountName(verification.bank_account_name || "");
  }

  const submitVerification = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      setUploading(true);

      let ktpImageUrl = verification?.ktp_image_url || "";
      let selfieImageUrl = verification?.selfie_image_url || "";

      // Upload KTP image if new file selected
      if (ktpFile) {
        const fileExt = ktpFile.name.split('.').pop();
        const fileName = `${user.id}/ktp-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('seller-verifications')
          .upload(fileName, ktpFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('seller-verifications')
          .getPublicUrl(fileName);

        ktpImageUrl = publicUrl;
      }

      // Upload selfie image if new file selected
      if (selfieFile) {
        const fileExt = selfieFile.name.split('.').pop();
        const fileName = `${user.id}/selfie-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('seller-verifications')
          .upload(fileName, selfieFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('seller-verifications')
          .getPublicUrl(fileName);

        selfieImageUrl = publicUrl;
      }

      if (!ktpImageUrl) {
        throw new Error("KTP image is required");
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('submit-seller-verification', {
        body: {
          ktpName,
          ktpNumber,
          ktpImageUrl,
          selfieImageUrl: selfieImageUrl || undefined,
          bankName,
          bankAccountNumber,
          bankAccountName,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-verification'] });
      queryClient.invalidateQueries({ queryKey: ['seller-profile-escrow'] });
      toast.success(t('verification.submitted'));
      setKtpFile(null);
      setSelfieFile(null);
      setUploading(false);
    },
    onError: (error) => {
      console.error('Verification error:', error);
      toast.error(t('verification.submitError'));
      setUploading(false);
    },
  });

  const handleKtpFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('verification.invalidFileType'));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(t('verification.fileTooLarge'));
      return;
    }

    setKtpFile(file);
  };

  const handleSelfieFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('verification.invalidFileType'));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(t('verification.fileTooLarge'));
      return;
    }

    setSelfieFile(file);
  };

  const getStatusBadge = () => {
    if (!verification) {
      return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> {t('verification.notVerified')}</Badge>;
    }
    switch (verification.verification_status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle className="h-3 w-3" /> {t('verification.verified')}</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> {t('verification.pending')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> {t('verification.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{verification.verification_status}</Badge>;
    }
  };

  const isApproved = verification?.verification_status === 'approved';
  const isPending = verification?.verification_status === 'pending';
  const isRejected = verification?.verification_status === 'rejected';

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>{t('verification.title')}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {t('verification.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Escrow Status Alert */}
        {isApproved && (
          <Alert className="border-green-500/20 bg-green-500/5">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">{t('verification.escrowActive')}</AlertTitle>
            <AlertDescription>
              {t('verification.escrowActiveDesc')}
            </AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>{t('verification.pendingTitle')}</AlertTitle>
            <AlertDescription>
              {t('verification.pendingDesc')}
            </AlertDescription>
          </Alert>
        )}

        {isRejected && verification?.rejection_reason && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{t('verification.rejectedTitle')}</AlertTitle>
            <AlertDescription>
              {t('verification.rejectedDesc')}: {verification.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {!isApproved && (
          <>
            {/* Why Verification */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('verification.whyRequired')}</AlertTitle>
              <AlertDescription>
                {t('verification.whyRequiredDesc')}
              </AlertDescription>
            </Alert>

            {/* KTP Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <IdCard className="h-5 w-5" />
                {t('verification.ktpSection')}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ktpName">{t('verification.ktpName')}</Label>
                  <Input
                    id="ktpName"
                    value={ktpName}
                    onChange={(e) => setKtpName(e.target.value)}
                    placeholder={t('verification.ktpNamePlaceholder')}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ktpNumber">{t('verification.ktpNumber')}</Label>
                  <Input
                    id="ktpNumber"
                    value={ktpNumber}
                    onChange={(e) => setKtpNumber(e.target.value)}
                    placeholder={t('verification.ktpNumberPlaceholder')}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('verification.ktpPhoto')}</Label>
                <div className="flex items-center gap-4">
                  <input
                    ref={ktpInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleKtpFileChange}
                    className="hidden"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => ktpInputRef.current?.click()}
                    disabled={isPending}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {ktpFile ? ktpFile.name : (verification?.ktp_image_url ? t('verification.changePhoto') : t('verification.uploadPhoto'))}
                  </Button>
                  {(ktpFile || verification?.ktp_image_url) && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{t('verification.ktpPhotoHint')}</p>
              </div>

              <div className="space-y-2">
                <Label>{t('verification.selfiePhoto')} ({t('verification.optional')})</Label>
                <div className="flex items-center gap-4">
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleSelfieFileChange}
                    className="hidden"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => selfieInputRef.current?.click()}
                    disabled={isPending}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {selfieFile ? selfieFile.name : (verification?.selfie_image_url ? t('verification.changePhoto') : t('verification.uploadPhoto'))}
                  </Button>
                  {(selfieFile || verification?.selfie_image_url) && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{t('verification.selfiePhotoHint')}</p>
              </div>
            </div>

            {/* Bank Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="h-5 w-5" />
                {t('verification.bankSection')}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">{t('verification.bankName')}</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder={t('verification.bankNamePlaceholder')}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">{t('verification.bankAccountNumber')}</Label>
                  <Input
                    id="bankAccountNumber"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder={t('verification.bankAccountNumberPlaceholder')}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccountName">{t('verification.bankAccountName')}</Label>
                <Input
                  id="bankAccountName"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder={t('verification.bankAccountNamePlaceholder')}
                  disabled={isPending}
                />
                <p className="text-sm text-muted-foreground">{t('verification.bankAccountNameHint')}</p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => submitVerification.mutate()}
              disabled={submitVerification.isPending || uploading || isPending || !ktpName || !ktpNumber || !bankName || !bankAccountNumber || !bankAccountName || (!ktpFile && !verification?.ktp_image_url)}
              className="w-full"
            >
              {(submitVerification.isPending || uploading) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              {verification ? t('verification.resubmit') : t('verification.submit')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SellerVerificationForm;
