import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, Package, Download } from "lucide-react";

const BuyerDashboard = () => {
  const orders = [
    {
      id: 1,
      title: "Premium UI Kit",
      date: "2024-01-15",
      price: "$49.99",
      status: "completed",
    },
    {
      id: 2,
      title: "React Course Bundle",
      date: "2024-01-10",
      price: "$99.99",
      status: "completed",
    },
  ];

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
            <Link to="/products">
              <Button variant="ghost">Browse Products</Button>
            </Link>
            <Button variant="outline">Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Purchases</h1>
          <p className="text-muted-foreground">View and download your digital products</p>
        </div>

        {orders.length === 0 ? (
          <Card className="text-center p-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No purchases yet</h3>
            <p className="text-muted-foreground mb-6">
              Start exploring our marketplace to find amazing digital products
            </p>
            <Link to="/products">
              <Button variant="hero">Browse Products</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{order.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Purchased: {order.date}</span>
                        <span>•</span>
                        <span className="font-semibold text-primary">{order.price}</span>
                      </div>
                    </div>
                    <Button variant="hero">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
