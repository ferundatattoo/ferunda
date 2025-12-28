import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import TattooStylesAustin from "./pages/TattooStylesAustin";
import TattooArtistLosAngeles from "./pages/TattooArtistLosAngeles";
import TattooArtistHouston from "./pages/TattooArtistHouston";
import MicroRealismTattoo from "./pages/MicroRealismTattoo";
import SacredGeometryTattoos from "./pages/SacredGeometryTattoos";
import FineLineTattoos from "./pages/FineLineTattoos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          {/* SEO Topic Cluster Pages */}
          <Route path="/tattoo-styles-austin" element={<TattooStylesAustin />} />
          <Route path="/tattoo-artist-los-angeles" element={<TattooArtistLosAngeles />} />
          <Route path="/tattoo-artist-houston" element={<TattooArtistHouston />} />
          <Route path="/micro-realism-tattoo" element={<MicroRealismTattoo />} />
          <Route path="/sacred-geometry-tattoos" element={<SacredGeometryTattoos />} />
          <Route path="/fine-line-tattoos" element={<FineLineTattoos />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
