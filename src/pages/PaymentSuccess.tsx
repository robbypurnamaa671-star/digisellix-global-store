import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, Download, ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const orderId = searchParams.get("orderId");
  const token = searchParams.get("token"); // PayPal token

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["order-status", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("No order ID provided");

      const { data: orderData, error } = await supabase
        .from("orders")
        .select(`
          *,
          products (
            id,
            title,
            description,
            thumbnail_url,
            download_link,
            file_url
          )
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;
      return orderData;
    },
    enabled: !!orderId,
    refetchInterval: (query) => {
      // Keep polling if payment is pending
      return query.state.data?.payment_status === "pending" ? 3000 : false;
    },
  });

  const { data: downloadAccess } = useQuery({
    queryKey: ["download-access", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from("downloads")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && order?.payment_status === "paid",
  });

  const handleDownload = async () => {
    if (!order) return;

    const product = order.products as any;
    
    try {
      // If there's a direct download link
      if (product?.download_link) {
        window.open(product.download_link, "_blank");
        toast.success("Download started!");
        
        // Update download count
        if (downloadAccess) {
          await supabase
            .from("downloads")
            .update({
              download_count: (downloadAccess.download_count || 0) + 1,
              last_downloaded_at: new Date().toISOString(),
            })
            .eq("id", downloadAccess.id);
        }
        return;
      }

      // If there's a file in storage
      if (product?.file_url) {
        const { data, error } = await supabase.storage
          .from("product-files")
          .createSignedUrl(product.file_url.replace("product-files/", ""), 3600);

        if (error) throw error;

        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank");
          toast.success("Download started!");
          
          // Update download count
          if (downloadAccess) {
            await supabase
              .from("downloads")
              .update({
                download_count: (downloadAccess.download_count || 0) + 1,
                last_downloaded_at: new Date().toISOString(),
              })
              .eq("id", downloadAccess.id);
          }
        }
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Skeleton className="h-20 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="text-center py-12">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find the order you're looking for.
            </p>
            <Button onClick={() => navigate("/products")}>
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const product = order.products as any;
  const isPaid = order.payment_status === "paid";
  const isPending = order.payment_status === "pending";
  const isFailed = order.payment_status === "failed";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <button
          onClick={() => navigate("/buyer/dashboard")}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Status Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {isPaid && (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500" />
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
                    <p className="text-muted-foreground">
                      Your order has been confirmed and is ready for download.
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Paid</Badge>
                </>
              )}
              
              {isPending && (
                <>
                  <Clock className="h-16 w-16 text-yellow-500" />
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Payment Pending</h1>
                    <p className="text-muted-foreground">
                      We're waiting for payment confirmation. This page will update automatically.
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                    Pending
                  </Badge>
                </>
              )}
              
              {isFailed && (
                <>
                  <XCircle className="h-16 w-16 text-destructive" />
                  <div>
                    <h1 className="text-3xl font-bold mb-2">Payment Failed</h1>
                    <p className="text-muted-foreground">
                      Your payment could not be processed. Please try again.
                    </p>
                  </div>
                  <Badge variant="destructive">Failed</Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {product?.thumbnail_url ? (
                <img
                  src={product.thumbnail_url}
                  alt={product.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-3xl">📦</span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{product?.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product?.description}
                </p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono text-xs">{order.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium capitalize">{order.payment_method || "PayPal"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">
                  ${Number(order.amount_usd).toFixed(2)}
                </span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid At</span>
                  <span>{new Date(order.paid_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Download Section */}
        {isPaid && downloadAccess && (
          <Card>
            <CardHeader>
              <CardTitle>Download Your Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your purchase is ready! Click the button below to download your digital product.
              </p>
              
              <Button size="lg" className="w-full" onClick={handleDownload}>
                <Download className="mr-2 h-5 w-5" />
                Download Now
              </Button>

              {downloadAccess.download_count > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Downloaded {downloadAccess.download_count} time(s)
                  {downloadAccess.last_downloaded_at && (
                    <> · Last downloaded {new Date(downloadAccess.last_downloaded_at).toLocaleDateString()}</>
                  )}
                </p>
              )}

              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  You can access your downloads anytime from your{" "}
                  <button
                    onClick={() => navigate("/buyer/dashboard")}
                    className="text-primary hover:underline"
                  >
                    buyer dashboard
                  </button>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {isFailed && (
          <div className="mt-6 flex gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/products")}
              className="flex-1"
            >
              Browse Products
            </Button>
            <Button
              onClick={() => navigate(`/checkout/${order.id}`)}
              className="flex-1"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
