import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface VerifiedSellerBadgeProps {
  sellerId: string;
  showUnverified?: boolean;
  size?: "sm" | "md";
}

const VerifiedSellerBadge = ({ sellerId, showUnverified = false, size = "sm" }: VerifiedSellerBadgeProps) => {
  const { t } = useLanguage();

  const { data: sellerProfile } = useQuery({
    queryKey: ['seller-escrow-status', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('escrow_enabled, verification_status')
        .eq('user_id', sellerId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!sellerId,
  });

  const isVerified = sellerProfile?.escrow_enabled && sellerProfile?.verification_status === 'approved';

  if (!isVerified && !showUnverified) {
    return null;
  }

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (isVerified) {
    return (
      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
        <ShieldCheck className={iconSize} />
        {t('verification.verifiedSeller')}
      </Badge>
    );
  }

  if (showUnverified) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <ShieldX className={iconSize} />
        {t('verification.notVerifiedSeller')}
      </Badge>
    );
  }

  return null;
};

export default VerifiedSellerBadge;
