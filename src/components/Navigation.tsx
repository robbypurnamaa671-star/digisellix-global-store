import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, User, Shield, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
export const Navigation = () => {
  const { user, userRole, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <span className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-sm sm:text-base">
            Digisellix
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2 lg:gap-4">
          <Link to="/products">
            <Button variant="ghost" size="sm">Products</Button>
          </Link>
          
          {userRole === "admin" && (
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden lg:inline">Admin</span>
                <Badge variant="secondary" className="ml-1 hidden lg:inline">Panel</Badge>
              </Button>
            </Link>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">Account</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userRole === "seller" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/dashboard">Seller Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/add-product">Add Product</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {userRole === "buyer" && (
                  <DropdownMenuItem asChild>
                    <Link to="/buyer/dashboard">My Purchases</Link>
                  </DropdownMenuItem>
                )}
                {userRole === "admin" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard">Admin Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={signOut}>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline" size="sm">Login</Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" size="sm" className="hidden lg:inline-flex">
                  Start Selling
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col gap-4 mt-8">
              <Link to="/products" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Products
                </Button>
              </Link>

              {userRole === "admin" && (
                <Link to="/admin/dashboard" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </Button>
                </Link>
              )}

              {user ? (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-muted-foreground mb-2 px-2">
                      My Account
                    </p>
                    {userRole === "seller" && (
                      <>
                        <Link to="/seller/dashboard" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            Seller Dashboard
                          </Button>
                        </Link>
                        <Link to="/seller/add-product" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            Add Product
                          </Button>
                        </Link>
                      </>
                    )}
                    {userRole === "buyer" && (
                      <Link to="/buyer/dashboard" onClick={() => setOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          My Purchases
                        </Button>
                      </Link>
                    )}
                    {userRole === "admin" && (
                      <Link to="/admin/dashboard" onClick={() => setOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          Admin Dashboard
                        </Button>
                      </Link>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button variant="hero" className="w-full">
                      Start Selling
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};