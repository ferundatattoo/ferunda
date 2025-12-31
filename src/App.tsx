import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
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
  ProtectedRoute,
} from "./pages/ferunda-os";

// Portal Pages
import {
  StudioPortal,
  ArtistPortal,
  AssistantPortal,
  ClientPortal,
  FinancePortal,
  MarketingPortal,
} from "./pages/portals";

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
          <Route path="/admin" element={<Navigate to="/workspace-switch" replace />} />
          <Route path="/booking-status" element={<BookingStatus />} />
          <Route path="/customer-portal" element={<CustomerPortal />} />

          {/* Ferunda OS Routes */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/workspace-switch" element={<WorkspaceSwitch />} />
          <Route path="/studio/inbox" element={<ProtectedRoute><StudioInbox /></ProtectedRoute>} />
          <Route path="/studio/request/:id" element={<ProtectedRoute><StudioRequest /></ProtectedRoute>} />
          <Route path="/artist/inbox" element={<ProtectedRoute><ArtistInbox /></ProtectedRoute>} />
          <Route path="/artist/request/:id" element={<ProtectedRoute><ArtistRequest /></ProtectedRoute>} />
          <Route path="/artist/change-proposal/:id" element={<ProtectedRoute><ArtistChangeProposal /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><FerundaSettings /></ProtectedRoute>} />

          {/* Portal Routes */}
          <Route path="/studio" element={<StudioPortal />} />
          <Route path="/artist" element={<ArtistPortal />} />
          <Route path="/assistant" element={<AssistantPortal />} />
          <Route path="/client" element={<ClientPortal />} />
          <Route path="/finance" element={<FinancePortal />} />
          <Route path="/marketing" element={<MarketingPortal />} />

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
