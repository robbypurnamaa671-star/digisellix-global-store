import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Plus, DollarSign, Package, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SellerDashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || userRole !== "seller") {
      navigate("/auth");
    }
  }, [user, userRole, navigate]);
  const stats = [
    { title: "Total Sales", value: "$2,453", icon: DollarSign, trend: "+12.5%" },
    { title: "Products", value: "12", icon: Package, trend: "+2" },
    { title: "Revenue", value: "$8,932", icon: TrendingUp, trend: "+8.2%" },
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
              <Button variant="ghost">Browse</Button>
            </Link>
            <Button variant="outline" onClick={signOut}>Logout</Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your products and sales</p>
          </div>
          <Link to="/seller/add-product">
            <Button variant="hero" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Product
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <Card key={idx} className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <p className="text-sm text-success">{stat.trend} from last month</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/seller/add-product">
            <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Add New Product</h3>
                <p className="text-muted-foreground">Upload a new digital product</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/seller/sales">
            <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Sales History</h3>
                <p className="text-muted-foreground">View your sales analytics</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/seller/wallet">
            <Card className="hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105 cursor-pointer">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Wallet</h3>
                <p className="text-muted-foreground">Manage withdrawals</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
