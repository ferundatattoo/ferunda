import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { FerundaAgent } from "./components/ferunda-agent";
import { DevUnlockIndicator } from "./components/dev/DevUnlockIndicator";
import { SystemProvider } from "./components/providers/SystemProvider";
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
import CoDesign from "./pages/design/CoDesign";
import ARLive from "./pages/ar/Live";
import TestRealtime from "./pages/TestRealtime";

import TestGrokModules from "./pages/TestGrokModules";
import AuditReport from "./pages/AuditReport";
import LiveAuditReport from "./pages/LiveAuditReport";
import Dev from "./pages/Dev";
import FixConciergeReport from "./pages/FixConciergeReport";
import TestConciergePostfix from "./pages/TestConciergePostfix";

// OS Layout and Pages
import { OSLayout } from "./components/os";
import { 
  CommandCenter,
  OSInbox,
  OSClients,
  OSSettings,
  OSDiagnostics,
  // Consolidated modules
  OSOperations,
  OSCreative,
  OSMoney,
  OSGrowth,
  OSAICenter,
  // Legacy (for backwards compatibility)
  OSPipeline,
  OSCalendar,
  OSWaitlist,
  OSArtists,
  OSSupply,
  OSIntelligence,
  OSStudio,
  OSAutomations,
  OSAIHealth,
  OSWorkflows,
  OSEnterprise,
  OSSocialGrowth,
  OSSegmentation,
  OSDriftDetection,
  OSShadowMode,
  OSRevenue,
} from "./pages/os";

// Admin Components
import CodeAuditReport from "./components/admin/CodeAuditReport";

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
  ClientPortal,
  FinancePortal,
  MarketingPortal,
  StudioPortal,
  ArtistPortal,
  AssistantPortal,
} from "./pages/portals";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SystemProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          {/* Omnipresent AI Agent - appears on all pages */}
          <FerundaAgent />
          {/* Dev Mode Indicator - appears when dev unlock is active */}
          <DevUnlockIndicator />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Navigate to="/os" replace />} />
          <Route path="/booking-status" element={<BookingStatus />} />
          <Route path="/customer-portal" element={<CustomerPortal />} />

          {/* OS Routes - ETHEREAL Unified System */}
          <Route path="/os" element={<OSLayout />}>
            <Route index element={<CommandCenter />} />
            {/* Core - Always Free */}
            <Route path="inbox" element={<OSInbox />} />
            <Route path="clients" element={<OSClients />} />
            <Route path="settings" element={<OSSettings />} />
            <Route path="diagnostics" element={<OSDiagnostics />} />
            
            {/* Consolidated Modules */}
            <Route path="operations" element={<OSOperations />} />
            <Route path="creative" element={<OSCreative />} />
            <Route path="money" element={<OSMoney />} />
            <Route path="growth" element={<OSGrowth />} />
            <Route path="ai" element={<OSAICenter />} />
            
            {/* Legacy routes - redirect to consolidated */}
            <Route path="pipeline" element={<OSOperations />} />
            <Route path="calendar" element={<OSOperations />} />
            <Route path="waitlist" element={<OSOperations />} />
            <Route path="artists" element={<OSArtists />} />
            <Route path="supply" element={<OSMoney />} />
            <Route path="intelligence" element={<OSAICenter />} />
            <Route path="studio" element={<OSCreative />} />
            <Route path="automations" element={<OSAICenter />} />
            <Route path="ai-health" element={<OSAICenter />} />
            <Route path="workflows" element={<OSAICenter />} />
            <Route path="enterprise" element={<OSEnterprise />} />
            <Route path="social-growth" element={<OSGrowth />} />
            <Route path="segmentation" element={<OSAICenter />} />
            <Route path="drift-detection" element={<OSAICenter />} />
            <Route path="shadow-mode" element={<OSAICenter />} />
            <Route path="revenue" element={<OSMoney />} />
            <Route path="audit" element={<CodeAuditReport />} />
          </Route>

          {/* Ferunda OS Routes */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/workspace-switch" element={<WorkspaceSwitch />} />
          <Route path="/studio/inbox" element={<ProtectedRoute><StudioInbox /></ProtectedRoute>} />
          <Route path="/studio/request/:id" element={<ProtectedRoute><StudioRequest /></ProtectedRoute>} />
          <Route path="/artist/inbox" element={<ProtectedRoute><ArtistInbox /></ProtectedRoute>} />
          <Route path="/artist/request/:id" element={<ProtectedRoute><ArtistRequest /></ProtectedRoute>} />
          <Route path="/artist/change-proposal/:id" element={<ProtectedRoute><ArtistChangeProposal /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><FerundaSettings /></ProtectedRoute>} />

          {/* Portal Routes - Role-based specialized portals */}
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

          {/* Design Compiler Routes */}
          <Route path="/design/codesign" element={<CoDesign />} />
          <Route path="/ar/live" element={<ARLive />} />
          
          {/* Test Routes */}
          <Route path="/test-realtime" element={<TestRealtime />} />
          
          <Route path="/test-grok-modules" element={<TestGrokModules />} />
          <Route path="/audit-report" element={<AuditReport />} />
          <Route path="/live-audit" element={<LiveAuditReport />} />
          <Route path="/dev" element={<Dev />} />
          <Route path="/fix-concierge-report" element={<FixConciergeReport />} />
          <Route path="/test-concierge-postfix" element={<TestConciergePostfix />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </SystemProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
