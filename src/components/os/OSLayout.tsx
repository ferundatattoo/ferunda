import { Outlet } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import OSSidebar from "./OSSidebar";
import OSHeader from "./OSHeader";
import CommandPalette from "./CommandPalette";
import { Skeleton } from "@/components/ui/skeleton";

const PageLoader = () => (
  <div className="p-6 space-y-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-96 rounded-xl" />
  </div>
);

export const OSLayout = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Listen for command palette trigger
  useEffect(() => {
    const handleOpen = () => setCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    
    // Keyboard shortcut
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
    <div className="flex h-screen bg-background overflow-hidden">
      <OSSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <OSHeader onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>

      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />
    </div>
  );
};

export default OSLayout;
