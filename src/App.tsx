
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CustomerDashboard from "./pages/CustomerDashboard";
import ShopkeeperDashboard from "./pages/ShopkeeperDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PrintOrder from "./pages/PrintOrder";
import NotFound from "./pages/NotFound";

// Create a new QueryClient instance inside the component
const queryClient = new QueryClient();

const App = () => {
  
  return (
    <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/customer-dashboard" element={<CustomerDashboard />} />
              <Route path="/shopkeeper-dashboard" element={<ShopkeeperDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/print-order" element={<PrintOrder />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
