import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const Checkout = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

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

  const handlePayment = async () => {
    try {
      if (!order) return;

      toast.loading("Creating payment...");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to continue");
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { data, error } = await supabase.functions.invoke("create-ipaymu-payment", {
        body: {
          orderId: order.id,
          amount: order.currency === "IDR" ? order.amount_idr : order.amount_usd,
          currency: order.currency,
          buyerName: profile?.full_name || "Buyer",
          buyerEmail: user.email || "",
          buyerPhone: "081234567890", // You may want to collect this from user
          productTitle: product?.title || "Digital Product",
        },
      });

      if (error) throw error;

      toast.dismiss();
      toast.success("Payment created! Redirecting...");

      // Redirect to payment page or show payment instructions
      if (data.data.paymentUrl) {
        window.location.href = data.data.paymentUrl;
      } else {
        // Show payment instructions (bank transfer details, etc.)
        toast.info(`Payment Code: ${data.data.paymentCode}\nPayment: ${data.data.paymentName}\nTotal: Rp ${data.data.total.toLocaleString()}`);
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
            <h2 className="text-2xl font-bold mb-4">Order not found</h2>
            <Button onClick={() => navigate("/products")}>
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const product = order.products as any;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {product?.thumbnail_url ? (
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
                  <h3 className="font-semibold line-clamp-2">{product?.title}</h3>
                  <p className="text-sm text-muted-foreground">Digital Product</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price (USD)</span>
                  <span className="font-semibold">
                    ${Number(order.amount_usd).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price (IDR)</span>
                  <span className="font-semibold">
                    Rp {Number(order.amount_idr).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ${Number(order.amount_usd).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Secure payment processing powered by iPaymu
              </div>

              <div className="space-y-2 p-4 bg-muted/50 rounded-lg mb-4">
                <h4 className="font-semibold text-sm">Supported Payment Methods:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Bank Transfer (BCA, Mandiri, BNI, BRI, etc.)</li>
                  <li>• E-Wallets (GoPay, OVO, DANA, LinkAja)</li>
                  <li>• Credit/Debit Cards (Visa, Mastercard)</li>
                  <li>• QRIS (Quick Response Code Indonesian Standard)</li>
                </ul>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={handlePayment}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Proceed to Payment
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                Your payment information is encrypted and secure. You will get instant
                access to your purchase after payment is confirmed.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
