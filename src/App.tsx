import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import SwatchLab from "./pages/SwatchLab";
import PixelGenerator from "./pages/PixelGenerator";
import CrochetEngine from "./pages/CrochetEngine";
import KnittingEngine from "./pages/KnittingEngine";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<SwatchLab />} />
            <Route path="/pixel" element={<PixelGenerator />} />
            <Route path="/crochet" element={<CrochetEngine />} />
            <Route path="/knitting" element={<KnittingEngine />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
