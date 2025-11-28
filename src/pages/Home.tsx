import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ShoppingBag, Zap, Globe, Shield } from "lucide-react";
import heroImage from "@/assets/hero-marketplace.jpg";
import iconProducts from "@/assets/icon-products.png";
import iconPayment from "@/assets/icon-payment.png";
import iconGlobal from "@/assets/icon-global.png";
import iconSecure from "@/assets/icon-secure.png";

const Home = () => {
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
              <Button variant="ghost">Products</Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero">Start Selling</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
              <div className="inline-block">
                <span className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-semibold">
                  Global Digital Marketplace
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Buy & Sell Digital Products With Ease
              </h1>
              <p className="text-xl text-muted-foreground">
                Global platform for creators to sell e-books, designs, music, software, templates, and much more.
              </p>
              <div className="flex gap-4">
                <Link to="/auth">
                  <Button variant="hero" size="lg" className="text-lg">
                    Start Selling Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/products">
                  <Button variant="outline" size="lg" className="text-lg">
                    View Products
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-in fade-in slide-in-from-right duration-700 delay-300">
              <img
                src={heroImage}
                alt="Digital Marketplace"
                className="rounded-2xl shadow-[var(--shadow-card-hover)] hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start selling your digital products in 4 easy steps
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Create Account", desc: "Sign up free in seconds" },
              { step: "02", title: "Upload Product", desc: "Add file or download link" },
              { step: "03", title: "Receive Payment", desc: "Automatic & secure payment" },
              { step: "04", title: "Buyer Downloads", desc: "Instant access for buyers" },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="relative overflow-hidden group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-8">
                  <div className="text-6xl font-bold text-primary/10 mb-4">{item.step}</div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">Digisellix Advantages</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trusted marketplace platform with complete features for creators
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: iconPayment,
                title: "Fast Payments",
                desc: "Receive payments from around the world securely",
              },
              {
                icon: iconGlobal,
                title: "Global Sellers",
                desc: "Sell to customers in various countries",
              },
              {
                icon: iconProducts,
                title: "Upload File or Link",
                desc: "Flexible to use file or external link",
              },
              {
                icon: iconSecure,
                title: "Modern Marketplace",
                desc: "Responsive and user-friendly platform",
              },
            ].map((feature, idx) => (
              <Card
                key={idx}
                className="text-center group hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:scale-105"
              >
                <CardContent className="p-8 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src={feature.icon} alt={feature.title} className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-accent text-white">
        <div className="container mx-auto px-4 text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-bold">
            Ready to Start Your Digital Business?
          </h2>
          <p className="text-xl max-w-2xl mx-auto opacity-90">
            Join thousands of creators who trust Digisellix
          </p>
          <Link to="/auth">
            <Button
              variant="secondary"
              size="lg"
              className="text-lg bg-white text-primary hover:bg-white/90 font-bold"
            >
              Start Free Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Digisellix</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Global marketplace for digital products
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/products" className="hover:text-primary">Browse Products</Link></li>
                <li><Link to="/auth" className="hover:text-primary">Sell Products</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">About</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Terms</a></li>
                <li><a href="#" className="hover:text-primary">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2024 Digisellix. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
