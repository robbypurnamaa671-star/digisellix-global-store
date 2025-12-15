import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import SellerDashboard from "./pages/seller/Dashboard";
import AddProduct from "./pages/seller/AddProduct";
import SalesHistory from "./pages/seller/Sales";
import Wallet from "./pages/seller/Wallet";
import CustomOrder from "./pages/seller/CustomOrder";
import SellerSettings from "./pages/seller/Settings";
import BuyerDashboard from "./pages/buyer/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import Chat from "./pages/Chat";
import SellerPage from "./pages/SellerPage";
import Wishlist from "./pages/Wishlist";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/checkout/:orderId" element={<Checkout />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/seller/add-product" element={<AddProduct />} />
            <Route path="/seller/sales" element={<SalesHistory />} />
            <Route path="/seller/wallet" element={<Wallet />} />
            <Route path="/seller/custom-order" element={<CustomOrder />} />
            <Route path="/seller/settings" element={<SellerSettings />} />
            <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/seller/:id" element={<SellerPage />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            <FloatingWhatsApp />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
