import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

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

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((product) => {
      const matchesSearch = 
        searchQuery === "" ||
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategory === null || 
        product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Category Filters */}
            {categories && categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.name ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            )}
            
            {/* Active Filters */}
            {(searchQuery || selectedCategory) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setSearchQuery("")}
                    />
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedCategory}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setSelectedCategory(null)}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-2xl font-bold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory
                  ? "Try adjusting your filters or search terms"
                  : "Check back later for new products"}
              </p>
              {(searchQuery || selectedCategory) && (
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Link key={product.id} to={`/products/${product.id}`}>
                    <Card className="group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 overflow-hidden h-full">
                      <div className="aspect-video overflow-hidden bg-muted">
                        {product.thumbnail_url ? (
                          <img
                            src={product.thumbnail_url}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <span className="text-4xl">📦</span>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <Badge variant="secondary" className="mb-2">
                          {product.category}
                        </Badge>
                        <h3 className="font-bold text-lg mb-2 line-clamp-2">
                          {product.title}
                        </h3>
                        <div className="text-2xl font-bold text-primary">
                          ${Number(product.price_usd).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Rp {Number(product.price_idr).toLocaleString('id-ID')}
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
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Products;
