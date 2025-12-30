import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import CustomCursor from "./components/CustomCursor";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import BookingStatus from "./pages/BookingStatus";
import TattooStylesAustin from "./pages/TattooStylesAustin";
import TattooArtistLosAngeles from "./pages/TattooArtistLosAngeles";
import TattooArtistHouston from "./pages/TattooArtistHouston";
import MicroRealismTattoo from "./pages/MicroRealismTattoo";
import SacredGeometryTattoos from "./pages/SacredGeometryTattoos";
import FineLineTattoos from "./pages/FineLineTattoos";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CustomerPortal from "./pages/CustomerPortal";

// Ferunda OS Pages
import {
  StudioInbox,
  StudioRequest,
  ArtistInbox,
  ArtistRequest,
  ArtistChangeProposal,
  Settings as FerundaSettings,
  Onboarding,
  WorkspaceSwitch,
} from "./pages/ferunda-os";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CustomCursor />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/booking-status" element={<BookingStatus />} />
          <Route path="/customer-portal" element={<CustomerPortal />} />
          
          {/* Ferunda OS Routes */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/workspace-switch" element={<WorkspaceSwitch />} />
          <Route path="/studio/inbox" element={<StudioInbox />} />
          <Route path="/studio/request/:id" element={<StudioRequest />} />
          <Route path="/artist/inbox" element={<ArtistInbox />} />
          <Route path="/artist/request/:id" element={<ArtistRequest />} />
          <Route path="/artist/change-proposal/:id" element={<ArtistChangeProposal />} />
          <Route path="/settings" element={<FerundaSettings />} />
          
          {/* SEO Topic Cluster Pages */}
          <Route path="/tattoo-styles-austin" element={<TattooStylesAustin />} />
          <Route path="/tattoo-artist-los-angeles" element={<TattooArtistLosAngeles />} />
          <Route path="/tattoo-artist-houston" element={<TattooArtistHouston />} />
          <Route path="/micro-realism-tattoo" element={<MicroRealismTattoo />} />
          <Route path="/sacred-geometry-tattoos" element={<SacredGeometryTattoos />} />
          <Route path="/fine-line-tattoos" element={<FineLineTattoos />} />
          {/* Legal Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
