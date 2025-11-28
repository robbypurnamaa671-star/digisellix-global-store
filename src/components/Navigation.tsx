import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navigation = () => {
  const { user, userRole, signOut } = useAuth();

  return (
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
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  Account
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
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero">Start Selling</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
