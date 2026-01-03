import { Outlet } from "react-router-dom";
import { Suspense, useEffect, useState, Component, ReactNode } from "react";
import { motion } from "framer-motion";
import OSSidebar from "./OSSidebar";
import OSHeader from "./OSHeader";
import CommandPalette from "./CommandPalette";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { DevModuleFloatingButton } from "@/components/dev/DevModuleFloatingButton";
// Phase 1: Realtime is now initialized ONLY in SystemProvider to avoid duplication

// Error Boundary to catch runtime crashes
class OSErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[OSErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 gap-4">
          <AlertTriangle className="w-16 h-16 text-destructive" />
          <h2 className="text-xl font-semibold">Algo salió mal</h2>
          <p className="text-muted-foreground text-center max-w-md">
            {this.state.error?.message || 'Error inesperado en la aplicación'}
          </p>
          <Button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar página
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

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

export const OSLayout = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[150px]" />
      </div>

      <OSSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <OSHeader onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="min-h-full"
          >
            <OSErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </OSErrorBoundary>
          </motion.div>
        </main>
      </div>

      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen} 
      />

      {/* Dev-only floating button for module access control */}
      <DevModuleFloatingButton />
    </div>
  );
};

export default OSLayout;
