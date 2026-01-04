import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { ClientCreateModal } from "@/components/admin/ClientCreateModal";
import { ClientDetailModal } from "@/components/admin/ClientDetailModal";
import { useToast } from "@/hooks/use-toast";

// Action types that can be dispatched
export type OSAction = 
  | { type: "create-client"; payload?: { email?: string; name?: string } }
  | { type: "view-client"; payload: { clientId?: string; clientEmail?: string } }
  | { type: "create-booking"; payload?: { email?: string } }
  | { type: "send-deposit"; payload?: { bookingId?: string } }
  | { type: "create-quote"; payload?: any }
  | { type: "ai-generate-reply"; payload?: any }
  | { type: "ai-suggest-slots"; payload?: any };

interface OSActionContextType {
  dispatch: (action: OSAction) => void;
  refreshClients: () => void;
  onClientRefresh: (callback: () => void) => () => void;
}

const OSActionContext = createContext<OSActionContextType | null>(null);

export const useOSAction = () => {
  const context = useContext(OSActionContext);
  if (!context) {
    throw new Error("useOSAction must be used within OSActionProvider");
  }
  return context;
};

interface OSActionProviderProps {
  children: ReactNode;
}

export const OSActionProvider = ({ children }: OSActionProviderProps) => {
  const { toast } = useToast();
  
  // Modal states
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createClientData, setCreateClientData] = useState<{ email?: string; name?: string }>();
  
  const [viewClientOpen, setViewClientOpen] = useState(false);
  const [viewClientData, setViewClientData] = useState<{ clientId?: string; clientEmail?: string }>();
  
  // Refresh callbacks
  const [refreshCallbacks, setRefreshCallbacks] = useState<Set<() => void>>(new Set());

  const dispatch = useCallback((action: OSAction) => {
    console.log("[OSActionProvider] Dispatch:", action.type, action.payload);
    
    switch (action.type) {
      case "create-client":
        setCreateClientData(action.payload);
        setCreateClientOpen(true);
        break;
        
      case "view-client":
        setViewClientData(action.payload);
        setViewClientOpen(true);
        break;
        
      case "create-booking":
        toast({
          title: "Create Booking",
          description: "Booking creation wizard coming soon",
        });
        break;
        
      case "send-deposit":
        toast({
          title: "Send Deposit",
          description: "Deposit request flow coming soon",
        });
        break;
        
      case "create-quote":
        toast({
          title: "Create Quote",
          description: "Quote builder coming soon",
        });
        break;
        
      case "ai-generate-reply":
        toast({
          title: "AI Reply",
          description: "AI is generating a reply...",
        });
        break;
        
      case "ai-suggest-slots":
        toast({
          title: "AI Scheduling",
          description: "AI is finding optimal slots...",
        });
        break;
        
      default:
        console.warn("[OSActionProvider] Unknown action:", action);
    }
  }, [toast]);

  const refreshClients = useCallback(() => {
    refreshCallbacks.forEach(cb => cb());
  }, [refreshCallbacks]);

  const onClientRefresh = useCallback((callback: () => void) => {
    setRefreshCallbacks(prev => new Set(prev).add(callback));
    return () => {
      setRefreshCallbacks(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  // Listen for global events (from CommandPalette, etc.)
  useEffect(() => {
    const handlers: Record<string, (e: Event) => void> = {
      "create-client": () => dispatch({ type: "create-client" }),
      "create-booking": () => dispatch({ type: "create-booking" }),
      "send-deposit": () => dispatch({ type: "send-deposit" }),
      "create-quote": () => dispatch({ type: "create-quote" }),
      "ai-generate-reply": () => dispatch({ type: "ai-generate-reply" }),
      "ai-suggest-slots": () => dispatch({ type: "ai-suggest-slots" }),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [dispatch]);

  return (
    <OSActionContext.Provider value={{ dispatch, refreshClients, onClientRefresh }}>
      {children}
      
      {/* Client Create Modal */}
      <ClientCreateModal
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        initialData={createClientData}
        onClientCreated={refreshClients}
      />
      
      {/* Client Detail Modal */}
      <ClientDetailModal
        open={viewClientOpen}
        onOpenChange={setViewClientOpen}
        clientId={viewClientData?.clientId}
        clientEmail={viewClientData?.clientEmail}
        onClientUpdated={refreshClients}
      />
    </OSActionContext.Provider>
  );
};

export default OSActionProvider;
