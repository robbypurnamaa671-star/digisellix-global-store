import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, ArrowLeft, Copy, CheckCircle, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const customOrderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  priceUsd: z.number().positive("Price must be greater than 0").max(100000, "Price cannot exceed $100,000"),
  priceIdr: z.number().positive("Price must be greater than 0").max(1500000000, "Price cannot exceed Rp 1,500,000,000"),
  buyerEmail: z.string().email("Invalid email address"),
});

const CustomOrder = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [priceIdr, setPriceIdr] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate IDR from USD (approximate rate)
  const handleUsdChange = (value: string) => {
    setPriceUsd(value);
    if (value && !isNaN(parseFloat(value))) {
      const usdAmount = parseFloat(value);
      const idrAmount = Math.round(usdAmount * 15500);
      setPriceIdr(idrAmount.toString());
    }
  };

  const validateForm = () => {
    try {
      customOrderSchema.parse({
        title,
        description: description || undefined,
        priceUsd: parseFloat(priceUsd),
        priceIdr: parseFloat(priceIdr),
        buyerEmail,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleCreateOrder = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fix the errors below", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // First check if buyer exists by email - we need to create a pending order
      // For custom orders, we create the order without a buyer_id initially
      // The buyer will claim it when they pay
      
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          seller_id: user.id,
          buyer_id: user.id, // Temporarily set to seller, will be updated when buyer pays
          is_custom_order: true,
          custom_order_title: title,
          custom_order_description: description || null,
          amount_usd: parseFloat(priceUsd),
          amount_idr: parseFloat(priceIdr),
          currency: "USD",
          payment_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedOrderId(order.id);
      toast({
        title: "Success",
        description: "Custom order created! Share the payment link with your buyer.",
      });
    } catch (error: any) {
      console.error("Error creating custom order:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create custom order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentLink = () => {
    if (!createdOrderId) return "";
    return `${window.location.origin}/checkout/${createdOrderId}`;
  };

  const copyToClipboard = async () => {
    const link = getPaymentLink();
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Copied!", description: "Payment link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount: string, currency: "USD" | "IDR") => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "";
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
    }
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  };

  if (!user || !hasRole("seller")) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Digisellix
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/seller/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Link to="/seller/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="shadow-[var(--shadow-card-hover)]">
          <CardHeader>
            <CardTitle className="text-2xl">Create Custom Order</CardTitle>
            <CardDescription>
              Create a custom order with your own pricing. You'll get a payment link to share with your buyer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!createdOrderId ? (
              <>
                {/* Order Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Order Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Custom Logo Design Package"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={errors.title ? "border-destructive" : ""}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what's included in this custom order..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={errors.description ? "border-destructive" : ""}
                  />
                  {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                </div>

                {/* Pricing */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceUsd">Price (USD) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="priceUsd"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={priceUsd}
                        onChange={(e) => handleUsdChange(e.target.value)}
                        className={`pl-7 ${errors.priceUsd ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.priceUsd && <p className="text-sm text-destructive">{errors.priceUsd}</p>}
                    {priceUsd && <p className="text-sm text-muted-foreground">{formatCurrency(priceUsd, "USD")}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceIdr">Price (IDR) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                      <Input
                        id="priceIdr"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={priceIdr}
                        onChange={(e) => setPriceIdr(e.target.value)}
                        className={`pl-10 ${errors.priceIdr ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.priceIdr && <p className="text-sm text-destructive">{errors.priceIdr}</p>}
                    {priceIdr && <p className="text-sm text-muted-foreground">{formatCurrency(priceIdr, "IDR")}</p>}
                  </div>
                </div>

                {/* Buyer Email */}
                <div className="space-y-2">
                  <Label htmlFor="buyerEmail">Buyer's Email *</Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    placeholder="buyer@example.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className={errors.buyerEmail ? "border-destructive" : ""}
                  />
                  {errors.buyerEmail && <p className="text-sm text-destructive">{errors.buyerEmail}</p>}
                  <p className="text-sm text-muted-foreground">
                    We'll include this in the payment link for reference
                  </p>
                </div>

                <Button 
                  onClick={handleCreateOrder} 
                  disabled={loading} 
                  className="w-full"
                  variant="hero"
                  size="lg"
                >
                  {loading ? "Creating..." : "Create Custom Order"}
                </Button>
              </>
            ) : (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Custom Order Created!</h3>
                  <p className="text-muted-foreground">
                    Share this payment link with your buyer to collect payment.
                  </p>
                </div>

                {/* Order Summary */}
                <div className="bg-muted/30 rounded-lg p-4 text-left space-y-2">
                  <p><strong>Title:</strong> {title}</p>
                  <p><strong>Amount:</strong> {formatCurrency(priceUsd, "USD")} / {formatCurrency(priceIdr, "IDR")}</p>
                  <p><strong>Buyer Email:</strong> {buyerEmail}</p>
                </div>

                {/* Payment Link */}
                <div className="space-y-3">
                  <Label>Payment Link</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={getPaymentLink()}
                      className="bg-muted/50"
                    />
                    <Button onClick={copyToClipboard} variant="outline">
                      {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button 
                    onClick={() => {
                      setCreatedOrderId(null);
                      setTitle("");
                      setDescription("");
                      setPriceUsd("");
                      setPriceIdr("");
                      setBuyerEmail("");
                    }}
                    variant="outline"
                  >
                    Create Another Order
                  </Button>
                  <Link to="/seller/dashboard">
                    <Button variant="hero">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomOrder;