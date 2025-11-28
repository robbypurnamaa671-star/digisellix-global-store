import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShoppingBag, Search, Filter } from "lucide-react";
import { Navigation } from "@/components/Navigation";

const Products = () => {
  // Placeholder products
  const products = [
    {
      id: 1,
      title: "Premium UI Kit",
      price: 49.99,
      category: "Design",
      thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400",
    },
    {
      id: 2,
      title: "React Course Bundle",
      price: 99.99,
      category: "Education",
      thumbnail: "https://images.unsplash.com/photo-1516397281156-ca07cf9746fc?w=400",
    },
    {
      id: 3,
      title: "Music Production Pack",
      price: 39.99,
      category: "Music",
      thumbnail: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400",
    },
    {
      id: 4,
      title: "Business Templates",
      price: 29.99,
      category: "Templates",
      thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <section className="bg-gradient-to-br from-primary/10 to-accent/10 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">Browse Products</h1>
          <p className="text-xl text-muted-foreground">
            Discover amazing digital products from creators worldwide
          </p>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 overflow-hidden">
                  <div className="aspect-video overflow-hidden bg-muted">
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-2">
                      {product.category}
                    </div>
                    <h3 className="font-bold text-lg mb-2 line-clamp-1">
                      {product.title}
                    </h3>
                    <div className="text-2xl font-bold text-primary">
                      ${product.price}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Products;
