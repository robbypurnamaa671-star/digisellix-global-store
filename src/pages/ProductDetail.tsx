import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Download, Shield, ArrowLeft } from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();

  // Placeholder product data
  const product = {
    id,
    title: "Premium UI Kit",
    price: 49.99,
    category: "Design",
    description: "A comprehensive UI kit with over 200 components, designed for modern web applications. Includes light and dark themes, fully responsive layouts, and Figma source files.",
    features: [
      "200+ UI Components",
      "Light & Dark Themes",
      "Fully Responsive",
      "Figma Source Files",
      "Regular Updates",
      "Lifetime Access",
    ],
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    sellerName: "John Doe",
    sellerRating: 4.8,
    totalSales: 1234,
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
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero">Start Selling</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Link to="/products" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div>
            <div className="aspect-video rounded-2xl overflow-hidden shadow-[var(--shadow-card-hover)]">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">{product.category}</div>
              <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-sm text-muted-foreground">
                  By <span className="font-semibold text-foreground">{product.sellerName}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  ⭐ {product.sellerRating} • {product.totalSales} sales
                </div>
              </div>
              <div className="text-4xl font-bold text-primary mb-6">
                ${product.price}
              </div>
            </div>

            <Card className="bg-secondary/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Secure Purchase</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Instant access after payment. All files are scanned and verified.
                </p>
                <Button variant="hero" size="lg" className="w-full text-lg">
                  <Download className="mr-2 h-5 w-5" />
                  Buy Now
                </Button>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-2xl font-bold mb-4">What's Included</h2>
              <ul className="space-y-3">
                {product.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                      <span className="text-success text-sm">✓</span>
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
