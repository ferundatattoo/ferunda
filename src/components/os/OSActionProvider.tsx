import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { ClientCreateModal } from "@/components/admin/ClientCreateModal";
import { ClientDetailModal } from "@/components/admin/ClientDetailModal";
import { BookingCreateModal } from "@/components/admin/BookingCreateModal";
import { DepositRequestModal } from "@/components/admin/DepositRequestModal";
import { QuoteBuilderModal } from "@/components/admin/QuoteBuilderModal";
import { ContentCreationWizard } from "@/components/admin/ContentCreationWizard";
import { DesignGeneratorModal } from "@/components/admin/DesignGeneratorModal";
import { GrokCommandInterpreter } from "@/components/os/GrokCommandInterpreter";
import { useToast } from "@/hooks/use-toast";

// Action types that can be dispatched
interface CreateClientAction { type: "create-client"; payload?: { email?: string; name?: string } }
interface ViewClientAction { type: "view-client"; payload: { clientId?: string; clientEmail?: string } }
interface CreateBookingAction { type: "create-booking"; payload?: { email?: string; clientName?: string } }
interface ViewBookingAction { type: "view-booking"; payload: { bookingId: string } }
interface SendDepositAction { type: "send-deposit"; payload?: { bookingId?: string; clientEmail?: string } }
interface CreateQuoteAction { type: "create-quote"; payload?: { clientEmail?: string; description?: string } }
interface CreateContentAction { type: "create-content"; payload?: { type?: "post" | "story" | "reel" | "email"; topic?: string } }
interface CreateDesignAction { type: "create-design"; payload?: { prompt?: string; style?: string } }
interface AiGenerateReplyAction { type: "ai-generate-reply"; payload?: { conversationId?: string; context?: string } }
interface AiSuggestSlotsAction { type: "ai-suggest-slots"; payload?: { clientEmail?: string; bookingId?: string } }
interface AiCommandAction { type: "ai-command"; payload: { command: string } }
interface CloseAllAction { type: "close-all" }

export type OSAction = 
  | CreateClientAction
  | ViewClientAction
  | CreateBookingAction
  | ViewBookingAction
  | SendDepositAction
  | CreateQuoteAction
  | CreateContentAction
  | CreateDesignAction
  | AiGenerateReplyAction
  | AiSuggestSlotsAction
  | AiCommandAction
  | CloseAllAction;

interface OSActionContextType {
  dispatch: (action: OSAction) => void;
  refreshClients: () => void;
  refreshBookings: () => void;
  onClientRefresh: (callback: () => void) => () => void;
  onBookingRefresh: (callback: () => void) => () => void;
  isProcessing: boolean;
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
  
  // Processing state for AI actions
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Modal states
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createClientData, setCreateClientData] = useState<{ email?: string; name?: string }>();
  
  const [viewClientOpen, setViewClientOpen] = useState(false);
  const [viewClientData, setViewClientData] = useState<{ clientId?: string; clientEmail?: string }>();
  
  const [createBookingOpen, setCreateBookingOpen] = useState(false);
  const [createBookingData, setCreateBookingData] = useState<{ email?: string; clientName?: string }>();
  
  const [sendDepositOpen, setSendDepositOpen] = useState(false);
  const [sendDepositData, setSendDepositData] = useState<{ bookingId?: string; clientEmail?: string }>();
  
  const [createQuoteOpen, setCreateQuoteOpen] = useState(false);
  const [createQuoteData, setCreateQuoteData] = useState<{ clientEmail?: string; description?: string }>();
  
  const [createContentOpen, setCreateContentOpen] = useState(false);
  const [createContentData, setCreateContentData] = useState<{ type?: string; topic?: string }>();
  
  const [createDesignOpen, setCreateDesignOpen] = useState(false);
  const [createDesignData, setCreateDesignData] = useState<{ prompt?: string; style?: string }>();
  
  const [grokCommandOpen, setGrokCommandOpen] = useState(false);
  const [grokCommand, setGrokCommand] = useState("");
  
  // Refresh callbacks
  const [clientRefreshCallbacks, setClientRefreshCallbacks] = useState<Set<() => void>>(new Set());
  const [bookingRefreshCallbacks, setBookingRefreshCallbacks] = useState<Set<() => void>>(new Set());

  const dispatch = useCallback((action: OSAction) => {
    console.log("[OSActionProvider] Dispatch:", action.type);
    
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
        setCreateBookingData((action as CreateBookingAction).payload);
        setCreateBookingOpen(true);
        break;
        
      case "send-deposit":
        setSendDepositData(action.payload);
        setSendDepositOpen(true);
        break;
        
      case "create-quote":
        setCreateQuoteData(action.payload);
        setCreateQuoteOpen(true);
        break;
        
      case "create-content":
        setCreateContentData(action.payload);
        setCreateContentOpen(true);
        break;
        
      case "create-design":
        setCreateDesignData(action.payload);
        setCreateDesignOpen(true);
        break;
        
      case "ai-generate-reply":
        setIsProcessing(true);
        toast({
          title: "🤖 Grok AI",
          description: "Generando respuesta inteligente...",
        });
        // This will be handled by the component that needs the reply
        setTimeout(() => setIsProcessing(false), 2000);
        break;
        
      case "ai-suggest-slots":
        setIsProcessing(true);
        toast({
          title: "🤖 Grok AI",
          description: "Analizando disponibilidad óptima...",
        });
        setTimeout(() => setIsProcessing(false), 2000);
        break;
        
      case "ai-command":
        setGrokCommand(action.payload.command);
        setGrokCommandOpen(true);
        break;
        
      case "close-all":
        setCreateClientOpen(false);
        setViewClientOpen(false);
        setCreateBookingOpen(false);
        setSendDepositOpen(false);
        setCreateQuoteOpen(false);
        setCreateContentOpen(false);
        setCreateDesignOpen(false);
        setGrokCommandOpen(false);
        break;
        
      default:
        console.warn("[OSActionProvider] Unknown action:", action);
    }
  }, [toast]);

  const refreshClients = useCallback(() => {
    clientRefreshCallbacks.forEach(cb => cb());
  }, [clientRefreshCallbacks]);

  const refreshBookings = useCallback(() => {
    bookingRefreshCallbacks.forEach(cb => cb());
  }, [bookingRefreshCallbacks]);

  const onClientRefresh = useCallback((callback: () => void) => {
    setClientRefreshCallbacks(prev => new Set(prev).add(callback));
    return () => {
      setClientRefreshCallbacks(prev => {
        const next = new Set(prev);
        next.delete(callback);
        return next;
      });
    };
  }, []);

  const onBookingRefresh = useCallback((callback: () => void) => {
    setBookingRefreshCallbacks(prev => new Set(prev).add(callback));
    return () => {
      setBookingRefreshCallbacks(prev => {
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
      "create-content": () => dispatch({ type: "create-content" }),
      "create-design": () => dispatch({ type: "create-design" }),
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
    <OSActionContext.Provider value={{ 
      dispatch, 
      refreshClients, 
      refreshBookings,
      onClientRefresh, 
      onBookingRefresh,
      isProcessing 
    }}>
      {children}
      
      {/* Client Modals */}
      <ClientCreateModal
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        initialData={createClientData}
        onClientCreated={refreshClients}
      />
      
      <ClientDetailModal
        open={viewClientOpen}
        onOpenChange={setViewClientOpen}
        clientId={viewClientData?.clientId}
        clientEmail={viewClientData?.clientEmail}
        onClientUpdated={refreshClients}
      />
      
      {/* Booking Modal */}
      <BookingCreateModal
        open={createBookingOpen}
        onOpenChange={setCreateBookingOpen}
        initialData={createBookingData}
        onBookingCreated={refreshBookings}
      />
      
      {/* Deposit Modal */}
      <DepositRequestModal
        open={sendDepositOpen}
        onOpenChange={setSendDepositOpen}
        initialData={sendDepositData}
      />
      
      {/* Quote Modal */}
      <QuoteBuilderModal
        open={createQuoteOpen}
        onOpenChange={setCreateQuoteOpen}
        initialData={createQuoteData}
      />
      
      {/* Content Creation Wizard */}
      <ContentCreationWizard
        open={createContentOpen}
        onOpenChange={setCreateContentOpen}
        initialData={createContentData}
      />
      
      {/* Design Generator Modal */}
      <DesignGeneratorModal
        open={createDesignOpen}
        onOpenChange={setCreateDesignOpen}
        initialData={createDesignData}
      />
      
      {/* Grok AI Command Interpreter */}
      <GrokCommandInterpreter
        open={grokCommandOpen}
        onOpenChange={setGrokCommandOpen}
        initialCommand={grokCommand}
        onActionDetected={(action) => {
          setGrokCommandOpen(false);
          dispatch(action);
        }}
      />
    </OSActionContext.Provider>
  );
};

export default OSActionProvider;
