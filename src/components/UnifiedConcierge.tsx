import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  Bot,
  ImagePlus,
  XCircle,
  Calendar,
  HelpCircle,
  Wand2,
  Eye,
  CheckCircle,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "@/hooks/use-toast";
import ConciergeEntry from "@/components/concierge/ConciergeEntry";
import { ConciergeARPreview } from "@/components/concierge/ConciergeARPreview";
import { ARQuickPreview } from "@/components/concierge/ARQuickPreview";
import { DesignEngine, ReferenceAnalysis } from "@/services/DesignEngineInternal";
import { useFeasibilityCheck } from "@/hooks/useFeasibilityCheck";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { FeasibilityBadge } from "@/components/concierge/FeasibilityBadge";
import { useOfflineSync } from "@/hooks/useOfflineSync";

// ============================================================================
// TYPES
// ============================================================================

type AssistantMode = "luna" | "concierge";
type ConversationPhase = "entry" | "conversation" | "blocked";

interface Message {
  role: "user" | "assistant";
  content: string;
  mode?: AssistantMode;
  timestamp?: Date;
}

interface ARPreviewState {
  isOpen: boolean;
  referenceImageUrl: string;
  suggestedBodyPart?: string;
  useFullAR: boolean;
}

// ============================================================================
// INTENT DETECTION - Auto-switch between Luna & Concierge
// ============================================================================

const CONCIERGE_PATTERNS = [
  // Booking intents
  /\b(book|booking|reserv|cita|agendar|schedule|appointment)\b/i,
  /\b(quiero|want|need).*(tattoo|tatuaje|tatuar)/i,
  /\b(new|nuevo|nueva).*(tattoo|tatuaje|design|diseño)/i,
  // Project intents
  /\b(cover.?up|cover|cubrir|tapar)\b/i,
  /\b(touch.?up|retouch|retoque|retocar)\b/i,
  /\b(start|begin|iniciar|comenzar|empezar).*(project|proyecto|tattoo)/i,
  // Size/placement discussions
  /\b(full|half|quarter).*(sleeve|espalda|back)\b/i,
  /\b(manga|sleeve|brazo|arm|espalda|back|chest|pecho)\b.*\d+/i,
  // Reference images mentioned
  /\b(reference|referencia|ejemplo|idea|imagen|image|photo|foto)\b/i,
];

const LUNA_PATTERNS = [
  // Quick questions
  /\b(how much|cuánto|precio|price|cost|costo)\b.*\?/i,
  /\b(where|dónde|ubicación|location|address|dirección)\b.*\?/i,
  /\b(when|cuándo|horario|hours|schedule|disponibilidad)\b.*\?/i,
  /\b(what|qué|cual|which).*(style|estilo|do you|haces)\b.*\?/i,
  // FAQ patterns
  /\b(do you|can you|puedes|haces)\b.*\?$/i,
  /\b(policy|políticas|cancel|cancela|deposit|depósito)\b/i,
  /\b(heal|sanar|aftercare|cuidado)\b/i,
  /\b(first.?time|primera.?vez|virgin|nuevo cliente)\b/i,
  // Casual chat
  /^(hi|hello|hola|hey|buenos|good)\b/i,
  /\b(thanks|gracias|thank you)\b/i,
];

function detectMode(message: string, currentMode: AssistantMode): AssistantMode {
  const lowerMessage = message.toLowerCase().trim();
  
  // Strong concierge signals
  const conciergeScore = CONCIERGE_PATTERNS.filter(p => p.test(lowerMessage)).length;
  const lunaScore = LUNA_PATTERNS.filter(p => p.test(lowerMessage)).length;
  
  // If clear winner, switch
  if (conciergeScore > lunaScore && conciergeScore >= 1) {
    return "concierge";
  }
  if (lunaScore > conciergeScore && lunaScore >= 1) {
    return "luna";
  }
  
  // If in concierge and user seems to be continuing project discussion, stay there
  if (currentMode === "concierge" && message.length > 50) {
    return "concierge";
  }
  
  // Default: maintain current mode
  return currentMode;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnifiedConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>("entry");
  const [mode, setMode] = useState<AssistantMode>("luna");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  
  // SEPARATED LOADING STATES - fixes the freeze issue
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isWaitingAssistant, setIsWaitingAssistant] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<{ file: File; preview: string }[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [referenceAnalysis, setReferenceAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSketch, setIsGeneratingSketch] = useState(false);
  const [generatedSketchUrl, setGeneratedSketchUrl] = useState<string | null>(null);
  
  // Track uploaded reference image URLs (persisted after upload)
  const [sessionReferenceUrls, setSessionReferenceUrls] = useState<string[]>([]);
  
  // Gating: count meaningful conversation turns to decide when to offer sketch
  const [userMessageCount, setUserMessageCount] = useState(0);
  
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // AR Preview
  const [arPreview, setArPreview] = useState<ARPreviewState>({
    isOpen: false,
    referenceImageUrl: "",
    useFullAR: true,
  });
  
  // Combined loading state for backwards compat
  const isLoading = isUploadingImages || isWaitingAssistant;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { fingerprint } = useDeviceFingerprint();
  const { user } = useAuth();
  const workspaceData = useWorkspace(user?.id ?? null);
  
  // Integrated AI hooks
  const { result: feasibility, checkFeasibility, isChecking: isFeasibilityChecking } = useFeasibilityCheck();
  const { trackEvent, trackChatOpened, trackImageUploaded, trackSketchViewed, trackAROpened } = useConversionTracking(conversationId || undefined);
  const { status: offlineStatus, cacheData, getCachedData } = useOfflineSync();
  
  // Workspace-aware greeting
  const greeting = useMemo(() => {
    const isStudio = workspaceData?.workspaceType === "studio";
    
    if (mode === "luna") {
      return isStudio
        ? "Hey! 💫 I'm the Studio Manager. Quick questions, availability, pricing - I'm here for you. What's on your mind?"
        : "Hey there! 💫 I'm your Studio Manager. Whether you're curious about style, pricing, or availability - I'm here for you. What's on your mind?";
    }
    return isStudio
      ? "¡Hola! 🎨 Let's create something amazing together. Tell me about the tattoo you're dreaming of - any artist preference?"
      : "¡Hola! 🎨 Let's create something amazing together. Tell me about the tattoo you're dreaming of.";
  }, [mode, workspaceData?.workspaceType]);
  
  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Focus input
  useEffect(() => {
    if (isOpen && phase === "conversation") {
      inputRef.current?.focus();
    }
  }, [isOpen, phase]);
  
  // Reset on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: greeting, mode }]);
    }
  }, [isOpen, greeting, mode, messages.length]);
  
  // Create conversation
  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-session?action=conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-device-fingerprint": fingerprint || "",
          },
          body: JSON.stringify({
            session_id: fingerprint || `anon-${Date.now()}`,
            mode,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversation_id);
        return data.conversation_id;
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
    return null;
  }, [conversationId, fingerprint, mode]);
  
  // Listen for external events to open the chat
  useEffect(() => {
    const handleOpenManager = () => {
      setIsOpen(true);
      setMode("luna");
      setPhase("conversation");
    };
    
    const handleOpenConcierge = () => {
      setIsOpen(true);
      setMode("concierge");
      setPhase("conversation");
    };
    
    // Listen for both events
    window.addEventListener('openStudioManagerChat', handleOpenManager);
    window.addEventListener('openStudioConciergeChat', handleOpenConcierge);
    window.addEventListener('openLunaChat', handleOpenManager); // Backwards compat
    
    return () => {
      window.removeEventListener('openStudioManagerChat', handleOpenManager);
      window.removeEventListener('openStudioConciergeChat', handleOpenConcierge);
      window.removeEventListener('openLunaChat', handleOpenManager);
    };
  }, []);
  
  // Handle entry selection (from ConciergeEntry component)
  const handleEntryProceed = useCallback((userIntent: string, imageUrls?: string[]) => {
    // Use detectMode for better intent detection (supports ES/EN)
    const newMode = detectMode(userIntent, "luna");
    
    setMode(newMode);
    setPhase("conversation");
    
    // Send the user's intent as first message
    handleSend(userIntent);
  }, []);
  
  // File upload with validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const remaining = 5 - uploadedImages.length;
    if (remaining <= 0) {
      toast({ title: "Max 5 images", variant: "destructive" });
      return;
    }
    
    const MAX_SIZE_MB = 8;
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    const validFiles: File[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      // Type validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: `${file.name}: Invalid type. Use JPG, PNG, WebP or GIF.`, variant: "destructive" });
        continue;
      }
      // Size validation
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast({ title: `${file.name}: Too large (max ${MAX_SIZE_MB}MB)`, variant: "destructive" });
        continue;
      }
      validFiles.push(file);
    }
    
    const newImages = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    
    setUploadedImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };
  
  // Helper: race upload against timeout to prevent infinite hang
  const uploadWithTimeout = async (
    file: File,
    timeoutMs: number
  ): Promise<{ success: boolean; url: string | null; error?: string }> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `concierge/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    
    console.log(`[Upload] Starting: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
    
    const uploadPromise = (async () => {
      const { data, error } = await supabase.storage
        .from("chat-uploads")
        .upload(fileName, file, { contentType: file.type, upsert: false });
      
      if (error) throw error;
      if (!data) throw new Error("No data returned");
      
      const { data: urlData } = supabase.storage.from("chat-uploads").getPublicUrl(data.path);
      return urlData.publicUrl;
    })();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs);
    });
    
    try {
      const url = await Promise.race([uploadPromise, timeoutPromise]);
      console.log(`[Upload] Success: ${file.name}`);
      return { success: true, url };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Upload] Failed: ${file.name} - ${errorMsg}`);
      return { success: false, url: null, error: errorMsg };
    }
  };
  
  // CONCURRENT image upload with real timeout (Promise.race)
  const uploadImagesWithProgress = useCallback(async (images: { file: File; preview: string }[]): Promise<string[]> => {
    if (images.length === 0) return [];
    
    setIsUploadingImages(true);
    setUploadProgress({ current: 0, total: images.length });
    
    const UPLOAD_TIMEOUT = 30000; // 30 seconds per image
    const MAX_RETRIES = 1;
    const uploadedUrls: string[] = [];
    const failedUploads: string[] = [];
    
    // Process each image with retry logic
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      let attempts = 0;
      let result: { success: boolean; url: string | null; error?: string } = { success: false, url: null };
      
      while (attempts <= MAX_RETRIES && !result.success) {
        if (attempts > 0) console.log(`[Upload] Retry ${attempts} for ${img.file.name}`);
        result = await uploadWithTimeout(img.file, UPLOAD_TIMEOUT);
        attempts++;
      }
      
      // Always increment progress (success or fail)
      setUploadProgress(prev => prev ? { ...prev, current: i + 1 } : null);
      
      if (result.success && result.url) {
        uploadedUrls.push(result.url);
      } else {
        failedUploads.push(img.file.name);
      }
    }
    
    setIsUploadingImages(false);
    setUploadProgress(null);
    
    // Show toast for failed uploads
    if (failedUploads.length > 0) {
      toast({
        title: `${failedUploads.length} image(s) failed`,
        description: failedUploads.length === 1 
          ? "Try with a smaller image or check your connection"
          : failedUploads.join(", "),
        variant: "destructive"
      });
    }
    
    return uploadedUrls;
  }, []);
  
  // ACTION ROUTER - handles SSE action events
  const handleActionEvent = useCallback((action: string, payload: Record<string, unknown>) => {
    console.log("[Concierge] Executing action:", action, payload);
    
    switch (action) {
      case "open_ar_preview":
        if (payload.imageUrl) {
          setArPreview({
            isOpen: true,
            referenceImageUrl: payload.imageUrl as string,
            suggestedBodyPart: payload.bodyPart as string,
            useFullAR: true,
          });
          trackAROpened();
        }
        break;
        
      case "open_booking_modal":
      case "open_booking":
        // Dispatch event to open booking wizard
        window.dispatchEvent(new CustomEvent('openBookingWizard', { detail: payload }));
        break;
        
      case "show_calendar":
      case "open_calendar":
        // Scroll to calendar section or open modal
        const calendarEl = document.getElementById('availability-calendar');
        if (calendarEl) {
          calendarEl.scrollIntoView({ behavior: 'smooth' });
        }
        break;
        
      case "collect_email":
        // Could show inline email input or modal
        toast({ title: "Please share your email to continue" });
        break;
        
      case "generate_sketch":
        handleGenerateSketch();
        break;
        
      case "show_pricing":
        toast({ 
          title: "Pricing Info",
          description: payload.message as string || "Contact us for a custom quote"
        });
        break;
        
      default:
        console.log("[Concierge] Unknown action:", action);
    }
  }, [trackAROpened]);

  // Send message
  const handleSend = async (overrideMessage?: string) => {
    const messageText = overrideMessage || input.trim();
    if (!messageText && uploadedImages.length === 0) return;
    if (isWaitingAssistant) return; // Only block if already waiting for AI
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Auto-detect mode switch
    const detectedMode = detectMode(messageText, mode);
    if (detectedMode !== mode) {
      console.log(`Mode switch: ${mode} → ${detectedMode}`);
      setMode(detectedMode);
    }
    
    // Add user message with placeholder for image info
    const hasImages = uploadedImages.length > 0;
    const displayContent = hasImages && !messageText 
      ? `📷 Shared ${uploadedImages.length} reference image${uploadedImages.length > 1 ? 's' : ''}`
      : messageText;
    
    const userMessage: Message = { role: "user", content: displayContent, mode: detectedMode };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    // Increment user message counter for gating
    setUserMessageCount(prev => prev + 1);
    
    try {
      await ensureConversation();
      
      // Upload images FIRST (separate loading state)
      let imageUrls: string[] = [];
      if (uploadedImages.length > 0) {
        const imagesToUpload = [...uploadedImages];
        setUploadedImages([]); // Clear immediately for UX
        
        imageUrls = await uploadImagesWithProgress(imagesToUpload);
        
        // IMPORTANT: Store reference URLs for later use in sketch generation
        if (imageUrls.length > 0) {
          setSessionReferenceUrls(prev => [...prev, ...imageUrls]);
          
          // Auto-analyze uploaded images with DesignEngine + Feasibility
          if (detectedMode === "concierge") {
            setIsAnalyzing(true);
            trackImageUploaded(imageUrls.length);
            
            try {
              // Run reference analysis (don't block sending)
              DesignEngine.analyzeReference(imageUrls[0]).then(analysis => {
                setReferenceAnalysis(analysis);
                console.log("Reference analyzed:", analysis);
                
                // Also run feasibility check
                checkFeasibility({ 
                  imageUrl: imageUrls[0], 
                  targetBodyPart: analysis.placement_suggestions?.[0] 
                });
              }).catch(err => {
                console.error("Failed to analyze reference:", err);
              }).finally(() => {
                setIsAnalyzing(false);
              });
            } catch (err) {
              console.error("Failed to start analysis:", err);
              setIsAnalyzing(false);
            }
          }
        }
      }
      
      // Now wait for assistant
      setIsWaitingAssistant(true);
      
      // Choose endpoint based on mode
      const endpoint = detectedMode === "concierge"
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/studio-concierge`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;
      
      // Get conversationId before sending
      const convId = await ensureConversation();
      
      // Retry logic for network resilience
      const maxRetries = 2;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[Concierge] Retry attempt ${attempt}/${maxRetries}`);
            await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          }
          
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              "x-device-fingerprint": fingerprint || "",
            },
            body: JSON.stringify({
              messages: messages.filter(m => m.mode === detectedMode || !m.mode).slice(-10).map(m => ({
                role: m.role,
                content: m.content,
              })).concat({ role: "user", content: messageText }),
              referenceImages: imageUrls.length > 0 ? imageUrls : undefined,
              imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              conversationId: convId,
              workspace_id: workspaceData?.workspaceId,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            console.error(`[Concierge] API error (${response.status}):`, errorText.slice(0, 200));
            throw new Error(`API error ${response.status}`);
          }
          
          // Handle streaming with robust SSE parser
          if (response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantContent = "";
            let buffer = "";
            
            try {
              const contextFromHeader = response.headers.get("X-Concierge-Context");
              if (contextFromHeader) {
                console.log("[Concierge] Context:", contextFromHeader);
              }
            } catch { /* ignore */ }
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
                
                if (trimmedLine.startsWith("data: ")) {
                  try {
                    const jsonStr = trimmedLine.slice(6);
                    if (!jsonStr) continue;
                    
                    const parsed = JSON.parse(jsonStr);
                    
                    // Handle action events from tool calls
                    if (parsed.type === "ar_action" && parsed.arReferenceImage) {
                      console.log("[Concierge] AR action received:", parsed);
                      setArPreview({
                        isOpen: false,
                        referenceImageUrl: parsed.arReferenceImage,
                        suggestedBodyPart: parsed.suggestedBodyPart,
                        useFullAR: true,
                      });
                      // Auto-open AR preview after a short delay
                      setTimeout(() => {
                        trackAROpened();
                        setArPreview(prev => ({ ...prev, isOpen: true }));
                      }, 1500);
                      continue;
                    }
                    
                    if (parsed.type === "action") {
                      console.log("[Concierge] Action received:", parsed.action);
                      // EXECUTE THE ACTION through the router
                      handleActionEvent(parsed.action, parsed.payload || parsed);
                      continue;
                    }
                    
                    // Handle regular content streaming
                    const content = parsed.choices?.[0]?.delta?.content || parsed.content || parsed.text || "";
                    if (content) {
                      assistantContent += content;
                      setMessages((prev) => {
                        const last = prev[prev.length - 1];
                        if (last?.role === "assistant") {
                          return prev.slice(0, -1).concat({ role: "assistant", content: assistantContent, mode: detectedMode });
                        }
                        return [...prev, { role: "assistant", content: assistantContent, mode: detectedMode }];
                      });
                    }
                    
                    // Legacy: handle inline AR reference
                    if (parsed.arReferenceImage || parsed.sketchUrl) {
                      setArPreview({
                        isOpen: false,
                        referenceImageUrl: parsed.arReferenceImage || parsed.sketchUrl,
                        useFullAR: true,
                      });
                    }
                  } catch (parseErr) {
                    if (trimmedLine.includes("{")) {
                      console.warn("[Concierge] SSE parse warning:", parseErr);
                    }
                  }
                }
              }
            }
            
            // Process remaining buffer
            if (buffer.trim() && buffer.startsWith("data: ") && buffer !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(buffer.slice(6));
                const content = parsed.choices?.[0]?.delta?.content || parsed.content || parsed.text || "";
                if (content) {
                  assistantContent += content;
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant") {
                      return prev.slice(0, -1).concat({ role: "assistant", content: assistantContent, mode: detectedMode });
                    }
                    return [...prev, { role: "assistant", content: assistantContent, mode: detectedMode }];
                  });
                }
              } catch { /* ignore */ }
            }
          }
          
          // Success - break out of retry loop
          break;
          
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.error(`[Concierge] Attempt ${attempt + 1} failed:`, lastError.message);
          
          if (attempt === maxRetries) {
            throw lastError;
          }
        }
      }
    } catch (error) {
      console.error("[Concierge] Final error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble responding. Please try again!", mode },
      ]);
    } finally {
      setIsWaitingAssistant(false);
    }
  };
  
  // Open AR Preview - FIXED to handle all image sources
  const handleOpenARPreview = (useFullAR = true) => {
    // Priority: generatedSketch > arPreview.referenceImageUrl > first uploaded image
    const imageUrl = generatedSketchUrl || arPreview.referenceImageUrl || 
      (uploadedImages.length > 0 ? uploadedImages[0].preview : null);
    
    if (imageUrl) {
      trackAROpened();
      setArPreview((prev) => ({ 
        ...prev, 
        isOpen: true, 
        useFullAR,
        referenceImageUrl: imageUrl 
      }));
    } else {
      toast({ title: "Upload a reference image first", variant: "destructive" });
    }
  };
  
  // Generate sketch with DesignEngine
  const handleGenerateSketch = async () => {
    // Use sessionReferenceUrls instead of arPreview.referenceImageUrl
    if (sessionReferenceUrls.length === 0) {
      toast({ title: "Upload a reference image first", variant: "destructive" });
      return;
    }
    
    if (!workspaceData?.workspaceId) {
      toast({ title: "Workspace not ready", variant: "destructive" });
      return;
    }
    
    setIsGeneratingSketch(true);
    try {
      const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
      
      const { sketch, arAsset } = await DesignEngine.fullDesignPipeline({
        referenceUrls: sessionReferenceUrls, // Use stored reference URLs
        clientDescription: lastUserMessage,
        preferredStyle: referenceAnalysis?.styles[0],
        placement: referenceAnalysis?.placement_suggestions[0],
        workspaceId: workspaceData.workspaceId,
      });
      
      setGeneratedSketchUrl(sketch.imageUrl);
      trackSketchViewed();
      
      setArPreview(prev => ({
        ...prev,
        referenceImageUrl: arAsset.transparentUrl,
        suggestedBodyPart: arAsset.suggestedPlacements[0],
      }));
      
      // Add assistant message about the sketch with feasibility info
      const feasibilityNote = feasibility 
        ? `\n**Viability Score:** ${Math.round(feasibility.overallScore * 100)}% - ${feasibility.recommendation === 'proceed' ? '✅ Recommended' : feasibility.recommendation === 'caution' ? '⚠️ Proceed with caution' : '❌ Consider alternatives'}`
        : '';
      
      const analysisInfo = referenceAnalysis 
        ? `**Style:** ${referenceAnalysis.styles.join(", ")}\n**Complexity:** ${referenceAnalysis.complexity}\n**Estimated time:** ${referenceAnalysis.estimatedHours} hours`
        : 'Style analysis pending';
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✨ I've generated a concept sketch based on your references!\n\n${analysisInfo}${feasibilityNote}\n\nYou can preview it in AR or request changes!`,
        mode: "concierge"
      }]);
      toast({ title: "Sketch generated!", description: "Preview it in AR" });
    } catch (err) {
      console.error("Sketch generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to generate sketch", description: errorMessage, variant: "destructive" });
    } finally {
      setIsGeneratingSketch(false);
    }
  };
  
  // Close everything
  const handleClose = () => {
    setIsOpen(false);
    setPhase("entry");
    setMessages([]);
    setConversationId(null);
    setUploadedImages([]);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            aria-label="Chat with assistant"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-100px)] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  mode === "concierge" 
                    ? "bg-gradient-to-br from-primary/30 to-primary/10" 
                    : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                }`}>
                  {mode === "concierge" ? (
                    <Bot className="w-5 h-5 text-primary" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                    {mode === "concierge" ? "Studio Concierge" : "Studio Manager"}
                    {!offlineStatus.isOnline && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <WifiOff className="w-3 h-3" />
                        Offline
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {mode === "concierge" ? (
                      <>
                        <Calendar className="w-3 h-3" /> Booking assistant
                      </>
                    ) : (
                      <>
                        <HelpCircle className="w-3 h-3" /> Quick answers
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            {phase === "entry" ? (
              <ConciergeEntry onProceed={handleEntryProceed} />
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Upload progress indicator */}
                  {isUploadingImages && uploadProgress && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading {uploadProgress.current}/{uploadProgress.total} images...
                      </div>
                    </motion.div>
                  )}
                  
                  {/* AI thinking indicator */}
                  {isWaitingAssistant && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Analysis indicator */}
                  {isAnalyzing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analyzing reference...
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Reference Analysis Summary */}
                  {referenceAnalysis && !isAnalyzing && mode === "concierge" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-2"
                    >
                      <div className="flex items-center gap-2 font-medium text-primary">
                        <Sparkles className="w-3 h-3" />
                        Reference Analyzed
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                        <span>Style: {referenceAnalysis.styles.slice(0, 2).join(", ")}</span>
                        <span>Complexity: {referenceAnalysis.complexity}</span>
                        <span>Est. {referenceAnalysis.estimatedHours}h</span>
                        <span>{referenceAnalysis.placement_suggestions[0]}</span>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Action buttons - GATING: Only show "Generate Sketch" after meaningful conversation progress */}
                  {/* Requirements: 
                       - Must be in concierge mode
                       - Must have at least 3 user messages (indicates the conversation has progressed)
                       - Must have reference URLs uploaded
                       - OR already have a generated sketch
                  */}
                  {mode === "concierge" && (
                    (userMessageCount >= 3 && sessionReferenceUrls.length > 0) || generatedSketchUrl
                  ) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center gap-2 flex-wrap"
                    >
                      {sessionReferenceUrls.length > 0 && !generatedSketchUrl && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleGenerateSketch}
                          disabled={isGeneratingSketch}
                          className="gap-2"
                        >
                          {isGeneratingSketch ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          Generate Sketch
                        </Button>
                      )}
                      
                      {(arPreview.referenceImageUrl || generatedSketchUrl || sessionReferenceUrls.length > 0) && !arPreview.isOpen && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenARPreview(true)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View in AR
                        </Button>
                      )}
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Image Previews */}
                {uploadedImages.length > 0 && (
                  <div className="px-4 pb-2 flex gap-2 flex-wrap">
                    {uploadedImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16">
                        <img
                          src={img.preview}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-border bg-card/50">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      <ImagePlus className="w-5 h-5" />
                    </Button>
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || (!input.trim() && uploadedImages.length === 0)}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR Preview Modals */}
      {arPreview.isOpen && arPreview.useFullAR && (
        <ConciergeARPreview
          isOpen={arPreview.isOpen}
          onClose={() => setArPreview((prev) => ({ ...prev, isOpen: false }))}
          referenceImageUrl={arPreview.referenceImageUrl}
          onBookingClick={() => {
            setArPreview((prev) => ({ ...prev, isOpen: false }));
            toast({ title: "¡Excelente! Let's continue with your booking." });
          }}
        />
      )}
      
      {arPreview.isOpen && !arPreview.useFullAR && (
        <ARQuickPreview
          isOpen={arPreview.isOpen}
          onClose={() => setArPreview((prev) => ({ ...prev, isOpen: false }))}
          referenceImageUrl={arPreview.referenceImageUrl}
        />
      )}
    </>
  );
}

export default UnifiedConcierge;
