import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedBackground from "./AnimatedBackground";
import CommandPalette, { type MarketingView } from "./CommandPalette";
import SidebarNav from "./SidebarNav";
import ContentCalendarModule from "../modules/ContentCalendarModule";
import AnalyticsDashboardModule from "../modules/AnalyticsDashboardModule";
import AIMarketingChatModule from "../modules/AIMarketingChatModule";
import CompetitorAnalysisModule from "../modules/CompetitorAnalysisModule";
import ABTestManagerModule from "../modules/ABTestManagerModule";
import MarketingDashboard from "../modules/MarketingDashboard";
import ContentStudioModule from "../modules/ContentStudioModule";
import CampaignsModule from "../modules/CampaignsModule";
import AutomationModule from "../modules/AutomationModule";
import AIAgentsModule from "../modules/AIAgentsModule";
import TrendAnalysisModule from "../modules/TrendAnalysisModule";
import HashtagGeneratorModule from "../modules/HashtagGeneratorModule";

const InkNexusMarketingHub = () => {
  const [currentView, setCurrentView] = useState<MarketingView>("dashboard");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Global keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavigate = useCallback((view: MarketingView) => {
    setCurrentView(view);
  }, []);

  const renderView = () => {
    const viewComponents: Record<MarketingView, React.ReactNode> = {
      dashboard: <MarketingDashboard />,
      content: <ContentStudioModule />,
      calendar: <ContentCalendarModule />,
      analytics: <AnalyticsDashboardModule />,
      campaigns: <CampaignsModule />,
      automation: <AutomationModule />,
      agents: <AIAgentsModule />,
      trends: <TrendAnalysisModule />,
      competitors: <CompetitorAnalysisModule />,
      "ab-tests": <ABTestManagerModule />,
      hashtags: <HashtagGeneratorModule />,
      chat: <AIMarketingChatModule />,
    };

    return viewComponents[currentView] || <MarketingDashboard />;
  };

  return (
    <div className="relative flex h-[calc(100vh-200px)] min-h-[600px] overflow-hidden rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm">
      <AnimatedBackground />
      
      {/* Sidebar */}
      <SidebarNav
        currentView={currentView}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default InkNexusMarketingHub;
