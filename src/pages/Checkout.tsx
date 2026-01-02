import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Shield, Info } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const PLATFORM_FEE_PERCENT = 5;

const Checkout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [feePayer, setFeePayer] = useState<"buyer" | "seller">("buyer");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            id,
            title,
            thumbnail_url,
            price_usd,
            price_idr
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      return orderData;
    },
    enabled: !!orderId,
  });

  // Calculate amounts based on fee payer
  const priceBreakdown = useMemo(() => {
    if (!order) return null;

    const basePrice = Number(order.amount_usd);
    const platformFee = Math.round((basePrice * PLATFORM_FEE_PERCENT) / 100 * 100) / 100;

    if (feePayer === "buyer") {
      return {
        productPrice: basePrice,
        platformFee: platformFee,
        buyerTotal: basePrice + platformFee,
        sellerReceives: basePrice,
        feePayerLabel: "You (Buyer)",
      };
    } else {
      return {
        productPrice: basePrice,
        platformFee: platformFee,
        buyerTotal: basePrice,
        sellerReceives: basePrice - platformFee,
        feePayerLabel: "Seller",
      };
    }
  }, [order, feePayer]);

  const handlePayment = async () => {
    try {
      if (!order || !priceBreakdown) return;

      toast.loading(t('checkout.creatingPayment'));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('checkout.pleaseSignIn'));
        navigate("/auth");
        return;
      }

      // PayPal payment flow with escrow amount
      const { data, error } = await supabase.functions.invoke("create-paypal-payment", {
        body: {
          orderId: order.id,
          amount: priceBreakdown.buyerTotal,
          currency: "USD",
          feePayer: feePayer,
          returnUrl: `${window.location.origin}/payment-success?orderId=${order.id}&feePayer=${feePayer}`,
          cancelUrl: window.location.href,
        },
      });

      if (error) throw error;

      toast.dismiss();
      toast.success(t('checkout.redirectingPaypal'));

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.dismiss();
      toast.error(error.message || "Failed to create payment");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-40 mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">{t('checkout.orderNotFound')}</h2>
            <Button onClick={() => navigate("/products")}>
              {t('checkout.browseProducts')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const product = order.products as any;
  const isCustomOrder = order.is_custom_order;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('checkout.back')}
        </button>

        <h1 className="text-3xl font-bold mb-8">{t('checkout.title')}</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.orderSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {isCustomOrder ? (
                  <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                ) : product?.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold line-clamp-2">
                    {isCustomOrder ? order.custom_order_title : product?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isCustomOrder ? t('checkout.customOrder') : t('checkout.digitalProduct')}
                  </p>
                </div>
              </div>

              {isCustomOrder && order.custom_order_description && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{order.custom_order_description}</p>
                </div>
              )}

              {/* Fee Payer Selection */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Who pays the platform fee?</span>
                </div>
                <RadioGroup
                  value={feePayer}
                  onValueChange={(value) => setFeePayer(value as "buyer" | "seller")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary transition-colors">
                    <RadioGroupItem value="buyer" id="buyer" />
                    <Label htmlFor="buyer" className="flex-1 cursor-pointer">
                      <div className="font-medium">I pay the fee</div>
                      <div className="text-xs text-muted-foreground">
                        You pay ${priceBreakdown?.buyerTotal.toFixed(2)} (product + 5% fee)
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary transition-colors">
                    <RadioGroupItem value="seller" id="seller" />
                    <Label htmlFor="seller" className="flex-1 cursor-pointer">
                      <div className="font-medium">Seller pays the fee</div>
                      <div className="text-xs text-muted-foreground">
                        You pay ${Number(order.amount_usd).toFixed(2)} (product price only)
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Price Breakdown */}
              {priceBreakdown && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product Price</span>
                    <span>${priceBreakdown.productPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Platform Fee ({PLATFORM_FEE_PERCENT}%)
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={feePayer === "buyer" ? "default" : "secondary"} className="text-xs">
                        {priceBreakdown.feePayerLabel}
                      </Badge>
                      <span>${priceBreakdown.platformFee.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>You Pay</span>
                    <span className="text-primary">
                      ${priceBreakdown.buyerTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Seller Receives</span>
                    <span>${priceBreakdown.sellerReceives.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.paymentMethod')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Escrow Badge */}
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold text-sm">Protected by Digisellix Escrow</div>
                  <div className="text-xs text-muted-foreground">
                    Funds held securely until you confirm delivery
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground mb-4">
                {t('checkout.securePayment')}
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm">{t('checkout.paypalOptions')}</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• {t('checkout.paypalBalance')}</li>
                  <li>• {t('checkout.creditDebit')}</li>
                  <li>• {t('checkout.bankAccounts')}</li>
                </ul>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handlePayment}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Pay ${priceBreakdown?.buyerTotal.toFixed(2)} with PayPal
              </Button>

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>{t('checkout.secureInfo')}</p>
                <p className="text-primary">Auto-release after 7 days if no dispute</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
