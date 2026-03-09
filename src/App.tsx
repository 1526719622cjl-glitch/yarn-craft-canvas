import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/i18n/useI18n";
import SwatchLab from "./pages/SwatchLab";
import PixelGenerator from "./pages/PixelGenerator";
import CrochetEngine from "./pages/CrochetEngine";
import KnittingEngine from "./pages/KnittingEngine";
import PatternDetail from "./pages/PatternDetail";
import YarnVault from "./pages/YarnVault";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Layout><SwatchLab /></Layout>} />
              <Route path="/pixel" element={<Layout><PixelGenerator /></Layout>} />
              <Route path="/crochet" element={<Layout><CrochetEngine /></Layout>} />
              <Route path="/crochet/:id" element={<Layout><PatternDetail /></Layout>} />
              <Route path="/knitting" element={<Layout><KnittingEngine /></Layout>} />
              <Route path="/knitting/:id" element={<Layout><PatternDetail /></Layout>} />
              <Route path="/vault" element={<Layout><YarnVault /></Layout>} />
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
