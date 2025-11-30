import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, ArrowLeft, Upload, X, FileCheck, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

const AddProduct = () => {
  const { toast } = useToast();
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(15750); // Default IDR to USD rate
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priceUsd: "",
    priceIdr: "",
    category: "",
    downloadLink: "",
  });
  
  const [productFile, setProductFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Fetch current exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        if (data.rates && data.rates.IDR) {
          setExchangeRate(data.rates.IDR);
        }
      } catch (error) {
        console.log('Using default exchange rate');
      }
    };
    fetchExchangeRate();
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user || !hasRole("seller")) {
      navigate("/auth");
    }
  }, [user, hasRole, navigate]);

  const validateFile = (file: File, maxSize: number = MAX_FILE_SIZE): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
    }
    return null;
  };

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "File too large",
          description: error,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      setProductFile(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "File too large",
          description: error,
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      setThumbnailFile(file);
    }
  };

  const handleUsdChange = (value: string) => {
    setFormData({ 
      ...formData, 
      priceUsd: value,
      priceIdr: value ? Math.round(parseFloat(value) * exchangeRate).toString() : ""
    });
  };

  const handleIdrChange = (value: string) => {
    setFormData({ 
      ...formData, 
      priceIdr: value,
      priceUsd: value ? (parseFloat(value) / exchangeRate).toFixed(2) : ""
    });
  };

  const uploadFile = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${user!.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    // Validate at least one delivery method
    if (!productFile && !formData.downloadLink) {
      toast({
        title: "Delivery method required",
        description: "Please either upload a file or provide a download link.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let fileUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      // Upload product file if provided
      if (productFile) {
        fileUrl = await uploadFile(productFile, "product-files", "products");
      }

      // Upload thumbnail if provided
      if (thumbnailFile) {
        thumbnailUrl = await uploadFile(thumbnailFile, "product-thumbnails", "thumbnails");
      }

      // Create product in database
      const { error: insertError } = await supabase
        .from("products")
        .insert({
          seller_id: user.id,
          title: formData.title,
          description: formData.description,
          price_usd: parseFloat(formData.priceUsd),
          price_idr: parseFloat(formData.priceIdr),
          category: formData.category,
          file_url: fileUrl,
          download_link: formData.downloadLink || null,
          thumbnail_url: thumbnailUrl,
          status: "active",
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      toast({
        title: "Success!",
        description: "Your product is now live and visible to buyers!",
      });

      navigate("/seller/dashboard");
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          <Button variant="outline" onClick={signOut}>Logout</Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link 
          to="/seller/dashboard" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="shadow-[var(--shadow-card-hover)]">
          <CardHeader>
            <CardTitle className="text-3xl">Add New Product</CardTitle>
            <p className="text-muted-foreground mt-2">
              Fill in the details to publish your digital product
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title *</Label>
                <Input 
                  id="title" 
                  placeholder="Premium UI Kit" 
                  required 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product features, what's included, and who it's for..."
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price-usd">Price (USD) *</Label>
                  <Input 
                    id="price-usd" 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="49.99" 
                    required 
                    value={formData.priceUsd}
                    onChange={(e) => handleUsdChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-converts to IDR (Rate: 1 USD = {exchangeRate.toLocaleString()} IDR)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price-idr">Price (IDR) *</Label>
                  <Input 
                    id="price-idr" 
                    type="number" 
                    min="0"
                    placeholder="750000" 
                    required 
                    value={formData.priceIdr}
                    onChange={(e) => handleIdrChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-converts to USD
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm text-foreground">Delivery Method</h3>
                <p className="text-xs text-muted-foreground">Choose at least one method to deliver your product to buyers</p>
                
                {/* Product File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="file">Upload File (max 2MB)</Label>
                  {!productFile ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <Input 
                        id="file" 
                        type="file" 
                        className="hidden" 
                        onChange={handleProductFileChange}
                      />
                      <Label htmlFor="file" className="cursor-pointer">
                        <span className="text-primary hover:underline">Click to upload</span>
                        <span className="text-muted-foreground"> or drag and drop</span>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-2">PDF, ZIP, Images, Documents</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background">
                      <FileCheck className="h-5 w-5 text-success" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{productFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(productFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setProductFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* OR Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-muted/30 px-2 text-muted-foreground">OR</span>
                  </div>
                </div>

                {/* Download Link */}
                <div className="space-y-2">
                  <Label htmlFor="download-link">External Download Link</Label>
                  <Input
                    id="download-link"
                    type="url"
                    placeholder="https://example.com/download"
                    value={formData.downloadLink}
                    onChange={(e) => setFormData({ ...formData, downloadLink: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link to Dropbox, Google Drive, or your own server
                  </p>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail Image (optional)</Label>
                {!thumbnailFile ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <Input 
                      id="thumbnail" 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={handleThumbnailChange}
                    />
                    <Label htmlFor="thumbnail" className="cursor-pointer">
                      <span className="text-primary hover:underline text-sm">Upload thumbnail</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WEBP (max 2MB)</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background">
                    <FileCheck className="h-5 w-5 text-success" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{thumbnailFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(thumbnailFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setThumbnailFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  variant="hero" 
                  size="lg" 
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? "Publishing..." : "Publish Product"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg" 
                  asChild
                  disabled={loading}
                >
                  <Link to="/seller/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddProduct;
