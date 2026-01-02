import { Outlet } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import NewOSSidebar from "./NewOSSidebar";
import OSHeader from "./OSHeader";
import GODLensPanel from "./GODLensPanel";
import { EnhancedCommandPalette } from "./EnhancedCommandPalette";
import { Skeleton } from "@/components/ui/skeleton";

const PageLoader = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl bg-card/30" />
      ))}
    </div>
    <Skeleton className="h-[400px] rounded-xl bg-card/30" />
  </div>
);

interface NewOSLayoutProps {
  showGODLens?: boolean;
}

export default function NewOSLayout({ showGODLens = true }: NewOSLayoutProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [godLensContext, setGodLensContext] = useState('Dashboard');

  useEffect(() => {
    const handleOpen = () => setCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-command-palette', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar */}
      <NewOSSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <OSHeader onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        
        <div className="flex-1 flex overflow-hidden">
          {/* Page Content */}
          <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-h-full"
            >
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </main>

          {/* GOD Lens Panel */}
          {showGODLens && (
            <div className="hidden xl:block">
              <GODLensPanel 
                context={godLensContext}
                summary="You have 4 sessions today, 7 pending conversations, and $2,400 in deposits due. Focus on the hot lead from Instagram first."
              />
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Command Palette */}
      <EnhancedCommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
    </div>
  );
}
