import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AFFILIATE_STORAGE_KEY = "digisellix_affiliate";
const AFFILIATE_EXPIRY_DAYS = 30;

interface AffiliateData {
  code: string;
  productId: string;
  expiresAt: number;
}

export const useAffiliateTracking = (productId: string | undefined) => {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");

  useEffect(() => {
    const trackAffiliate = async () => {
      if (!refCode || !productId) return;

      // Store in localStorage with expiry
      const affiliateData: AffiliateData = {
        code: refCode,
        productId,
        expiresAt: Date.now() + AFFILIATE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      };

      // Store all affiliate referrals (can have multiple for different products)
      const existingData = localStorage.getItem(AFFILIATE_STORAGE_KEY);
      let affiliates: Record<string, AffiliateData> = {};
      
      if (existingData) {
        try {
          affiliates = JSON.parse(existingData);
        } catch {
          affiliates = {};
        }
      }

      affiliates[productId] = affiliateData;
      localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(affiliates));

      // Track click in database
      try {
        // Get affiliate ID from code
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("id")
          .eq("affiliate_code", refCode)
          .maybeSingle();

        if (affiliate) {
          await supabase.from("affiliate_clicks").insert({
            affiliate_id: affiliate.id,
            product_id: productId,
          });
        }
      } catch (error) {
        console.error("Error tracking affiliate click:", error);
      }
    };

    trackAffiliate();
  }, [refCode, productId]);
};

export const getStoredAffiliateCode = (productId: string): string | null => {
  const existingData = localStorage.getItem(AFFILIATE_STORAGE_KEY);
  if (!existingData) return null;

  try {
    const affiliates: Record<string, AffiliateData> = JSON.parse(existingData);
    const affiliate = affiliates[productId];

    if (!affiliate) return null;

    // Check if expired
    if (Date.now() > affiliate.expiresAt) {
      // Clean up expired entry
      delete affiliates[productId];
      localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(affiliates));
      return null;
    }

    return affiliate.code;
  } catch {
    return null;
  }
};

export const clearAffiliateCode = (productId: string) => {
  const existingData = localStorage.getItem(AFFILIATE_STORAGE_KEY);
  if (!existingData) return;

  try {
    const affiliates: Record<string, AffiliateData> = JSON.parse(existingData);
    delete affiliates[productId];
    localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(affiliates));
  } catch {
    // Ignore errors
  }
};
