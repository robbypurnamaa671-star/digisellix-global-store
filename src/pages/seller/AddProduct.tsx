import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingBag, ArrowLeft, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AddProduct = () => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Cloud Required",
      description: "Please enable Lovable Cloud to add products.",
    });
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
          <Button variant="outline">Logout</Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/seller/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="shadow-[var(--shadow-card-hover)]">
          <CardHeader>
            <CardTitle className="text-3xl">Add New Product</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Product Title *</Label>
                <Input id="title" placeholder="Premium UI Kit" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product..."
                  rows={5}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price-usd">Price (USD) *</Label>
                  <Input id="price-usd" type="number" step="0.01" placeholder="49.99" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price-idr">Price (IDR) *</Label>
                  <Input id="price-idr" type="number" placeholder="750000" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="design">Design</option>
                  <option value="education">Education</option>
                  <option value="music">Music</option>
                  <option value="software">Software</option>
                  <option value="templates">Templates</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Upload File (max 2MB, optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <Input id="file" type="file" className="hidden" />
                  <Label htmlFor="file" className="cursor-pointer">
                    <span className="text-primary hover:underline">Click to upload</span>
                    <span className="text-muted-foreground"> or drag and drop</span>
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="download-link">Download Link (required if no file)</Label>
                <Input
                  id="download-link"
                  type="url"
                  placeholder="https://example.com/download"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail Image (optional)</Label>
                <Input id="thumbnail" type="file" accept="image/*" />
              </div>

              <div className="flex gap-4">
                <Button type="submit" variant="hero" size="lg" className="flex-1">
                  Publish Product
                </Button>
                <Button type="button" variant="outline" size="lg" asChild>
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
