import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingBag, ArrowLeft, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SalesHistory = () => {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !hasRole("seller")) {
      navigate("/auth");
    }
  }, [user, hasRole, navigate]);
  const sales = [
    {
      id: 1,
      product: "Premium UI Kit",
      buyer: "john@example.com",
      date: "2024-01-15",
      amount: "$49.99",
    },
    {
      id: 2,
      product: "Business Templates",
      buyer: "jane@example.com",
      date: "2024-01-14",
      amount: "$29.99",
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
          <Button variant="outline" onClick={signOut}>Logout</Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Link to="/seller/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Sales History</h1>
          <p className="text-muted-foreground">Track your sales and revenue</p>
        </div>

        <Card className="mb-6 bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-3xl font-bold">$2,453.89</div>
              <p className="text-sm text-muted-foreground">Total Revenue This Month</p>
            </div>
          </CardContent>
        </Card>

        {sales.length === 0 ? (
          <Card className="text-center p-12">
            <h3 className="text-xl font-bold mb-2">No sales yet</h3>
            <p className="text-muted-foreground mb-6">
              Your sales will appear here once customers purchase your products
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sales.map((sale) => (
              <Card
                key={sale.id}
                className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{sale.product}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Buyer: {sale.buyer}</span>
                        <span>•</span>
                        <span>{sale.date}</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">{sale.amount}</div>
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

export default SalesHistory;
