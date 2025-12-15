import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, User, Shield, Menu, MessageCircle, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
export const Navigation = () => {
  const { user, userRoles, hasRole, signOut } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const isAdmin = hasRole("admin");
  const isSeller = hasRole("seller");
  const isBuyer = hasRole("buyer");

  return (
    <>
      {/* Scrolling notification marquee */}
      <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap py-1 text-xs text-primary font-medium">
          🔔 {t('footer.notification')} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🛒 {t('footer.notificationSales')} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; ⭐ {t('footer.notificationTrust')} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🔔 {t('footer.notification')} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; 🛒 {t('footer.notificationSales')} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp; ⭐ {t('footer.notificationTrust')} &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
        </div>
      </div>
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
            <Button variant="ghost" size="sm">{t('nav.products')}</Button>
          </Link>
          <Link to="/blog">
            <Button variant="ghost" size="sm">{t('nav.blog') || 'Blog'}</Button>
          </Link>
          
          {isAdmin && (
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden lg:inline">{t('nav.admin')}</span>
                <Badge variant="secondary" className="ml-1 hidden lg:inline">Panel</Badge>
              </Button>
            </Link>
          )}

          {user && (
            <>
              <Link to="/wishlist">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden lg:inline">{t('nav.wishlist')}</span>
                </Button>
              </Link>
              <Link to="/chat">
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden lg:inline">{t('nav.messages')}</span>
                </Button>
              </Link>
            </>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">{t('nav.dashboard')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('nav.dashboard')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {isSeller && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/dashboard">{t('nav.sellerDashboard')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/add-product">Add Product</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/chat">{t('nav.messages')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {isBuyer && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/buyer/dashboard">{t('nav.buyerDashboard')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/chat">{t('nav.messages')}</Link>
                    </DropdownMenuItem>
                    {isSeller && <DropdownMenuSeparator />}
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard">Admin Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem onClick={signOut}>{t('nav.signOut')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="outline" size="sm">{t('nav.login')}</Button>
              </Link>
              <Link to="/auth">
                <Button variant="hero" size="sm" className="hidden lg:inline-flex">
                  {t('nav.startSelling')}
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
                  {t('nav.products')}
                </Button>
              </Link>
              <Link to="/blog" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  {t('nav.blog') || 'Blog'}
                </Button>
              </Link>

              {isAdmin && (
                <Link to="/admin/dashboard" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Shield className="h-4 w-4" />
                    {t('nav.admin')} Panel
                  </Button>
                </Link>
              )}

              {user ? (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-muted-foreground mb-2 px-2">
                      {t('nav.dashboard')}
                    </p>
                    
                    {isSeller && (
                      <>
                        <Link to="/seller/dashboard" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            {t('nav.sellerDashboard')}
                          </Button>
                        </Link>
                        <Link to="/seller/add-product" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            Add Product
                          </Button>
                        </Link>
                        <Link to="/chat" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <MessageCircle className="h-4 w-4" />
                            {t('nav.messages')}
                          </Button>
                        </Link>
                      </>
                    )}
                    
                    {isBuyer && (
                      <>
                        <Link to="/buyer/dashboard" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start">
                            {t('nav.buyerDashboard')}
                          </Button>
                        </Link>
                        <Link to="/chat" onClick={() => setOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-2">
                            <MessageCircle className="h-4 w-4" />
                            {t('nav.messages')}
                          </Button>
                        </Link>
                      </>
                    )}
                    
                    {isAdmin && (
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
                    {t('nav.signOut')}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setOpen(false)}>
                    <Button variant="hero" className="w-full">
                      {t('nav.startSelling')}
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
        </div>
      </nav>
    </>
  );
};