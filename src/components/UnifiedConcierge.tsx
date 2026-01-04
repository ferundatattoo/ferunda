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
import { ARPreview } from "@/components/concierge";
import { DesignEngine, ReferenceAnalysis } from "@/services/DesignEngineInternal";
import { useFeasibilityCheck } from "@/hooks/useFeasibilityCheck";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { FeasibilityBadge } from "@/components/concierge/FeasibilityBadge";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { GrokPoweredBadge, EtherealThinkingIndicator } from "@/components/GrokPoweredBadge";
import { RealtimeInlineStatus } from "@/components/RealtimeStatusBadge";
import { useModuleRealtime } from "@/hooks/useGlobalRealtime";

// ============================================================================
// TYPES
// ============================================================================

// Unified mode - ETHEREAL only (Luna deprecated)
type AssistantMode = "ethereal";
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
// INTENT DETECTION - All requests go through ETHEREAL (unified AI Router)
// ============================================================================

// Helper to detect request type for AI Router
const BOOKING_PATTERNS = [
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

function detectRequestType(message: string, hasImages: boolean): 'chat' | 'vision' | 'booking' {
  if (hasImages) return 'vision';
  
  const lowerMessage = message.toLowerCase().trim();
  const hasBookingIntent = BOOKING_PATTERNS.some(p => p.test(lowerMessage));
  
  return hasBookingIntent ? 'booking' : 'chat';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UnifiedConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>("entry");
  const [mode] = useState<AssistantMode>("ethereal"); // Always ethereal now
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
  
  // ETHEREAL greeting - unified for all workspaces
  const greeting = useMemo(() => {
    const isStudio = workspaceData?.workspaceType === "studio";
    
    return isStudio
      ? "¡Hola! 🎨 Soy ETHEREAL, tu enlace exclusivo con el arte de Ferunda. Cuéntame sobre el tatuaje que sueñas."
      : "¡Hola! 🎨 Soy ETHEREAL, tu guía artístico. Cuéntame sobre el tatuaje que sueñas.";
  }, [workspaceData?.workspaceType]);
  
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
  
  // Realtime subscription for live chat messages
  useEffect(() => {
    if (!conversationId) return;
    
    console.log('[Concierge] Setting up realtime for conversation:', conversationId);
    
    const channel = supabase
      .channel(`concierge-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'concierge_messages',
          filter: `session_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add if it's from assistant and not a duplicate
          if (newMsg.sender === 'assistant' || newMsg.sender === 'ai') {
            console.log('[Concierge] Realtime message received:', newMsg);
            setMessages(prev => {
              // Check if message already exists (avoid duplicates)
              const exists = prev.some(m => 
                m.content === newMsg.content && 
                m.role === 'assistant' &&
                Math.abs(new Date(m.timestamp || 0).getTime() - new Date(newMsg.created_at).getTime()) < 5000
              );
              if (exists) return prev;
              
              return [...prev, {
                role: 'assistant' as const,
                content: newMsg.content,
                mode: mode,
                timestamp: new Date(newMsg.created_at)
              }];
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Concierge] Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, mode]);
  
  // Listen for external events to open the chat
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      setPhase("conversation");
    };
    
    // Listen for all chat events - all route to ETHEREAL now
    window.addEventListener('openStudioManagerChat', handleOpenChat);
    window.addEventListener('openStudioConciergeChat', handleOpenChat);
    window.addEventListener('openLunaChat', handleOpenChat); // Backwards compat
    window.addEventListener('openEtherealChat', handleOpenChat); // New event
    
    return () => {
      window.removeEventListener('openStudioManagerChat', handleOpenChat);
      window.removeEventListener('openStudioConciergeChat', handleOpenChat);
      window.removeEventListener('openLunaChat', handleOpenChat);
      window.removeEventListener('openEtherealChat', handleOpenChat);
    };
  }, []);
  
  // Handle entry selection (from ConciergeEntry component)
  const handleEntryProceed = useCallback((userIntent: string, imageUrls?: string[]) => {
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
  
  // Cancel upload ref - allows user to cancel stuck uploads
  const uploadCancelledRef = useRef(false);
  
  // Cancel upload handler
  const cancelUpload = useCallback(() => {
    console.log("[Upload] User cancelled upload");
    uploadCancelledRef.current = true;
    setIsUploadingImages(false);
    setUploadProgress(null);
    toast({ title: "Upload cancelled", description: "You can try again" });
  }, []);
  
  // ============================================================================
  // IMAGE COMPRESSION - Resize and normalize before upload
  // ============================================================================
  
  const compressImage = async (file: File, maxDimension = 2048, quality = 0.85): Promise<File> => {
    // Skip compression for small files or already-compressed formats
    if (file.size < 500 * 1024) {
      console.log(`[Compress] Skipping ${file.name}: already small (${(file.size / 1024).toFixed(1)}KB)`);
      return file;
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            console.log(`[Compress] ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${width}x${height})`);
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.warn(`[Compress] Failed to load ${file.name}, using original`);
        resolve(file); // Fallback to original
      };
      
      img.src = objectUrl;
    });
  };
  
  // Upload V2: Use signed URL + fetch with real AbortController (no SDK hang)
  const uploadWithSignedUrl = async (
    file: File,
    timeoutMs: number,
    abortSignal?: AbortSignal
  ): Promise<{ success: boolean; url: string | null; error?: string }> => {
    const startTime = Date.now();
    console.log(`[Upload V2] Starting: ${file.name} (${(file.size / 1024).toFixed(1)}KB), online=${navigator.onLine}`);
    
    // Create our own abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Link to parent abort signal if provided
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => controller.abort());
    }
    
    try {
      // Step 1: Get signed upload URL from backend
      const { data: signedData, error: signedError } = await supabase.functions.invoke('chat-upload-url', {
        body: { 
          filename: file.name, 
          contentType: file.type || 'image/jpeg',
          conversationId: conversationId 
        }
      });
      
      if (signedError || !signedData?.uploadUrl) {
        throw new Error(signedError?.message || 'Failed to get upload URL');
      }
      
      console.log(`[Upload V2] Got signed URL in ${Date.now() - startTime}ms`);
      
      // Step 2: Upload file using fetch with AbortController (this can be aborted!)
      const uploadResponse = await fetch(signedData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'image/jpeg',
        },
        signal: controller.signal,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      console.log(`[Upload V2] Success: ${file.name} in ${Date.now() - startTime}ms`);
      return { success: true, url: signedData.publicUrl };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const isAbort = errorMsg.includes('abort') || controller.signal.aborted;
      console.error(`[Upload V2] ${isAbort ? 'Aborted' : 'Failed'}: ${file.name} - ${errorMsg} after ${Date.now() - startTime}ms`);
      return { success: false, url: null, error: isAbort ? 'TIMEOUT' : errorMsg };
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  // CONCURRENT image upload with real timeout (Promise.race) + global watchdog + cancel support
  const uploadImagesWithProgress = useCallback(async (images: { file: File; preview: string }[]): Promise<string[]> => {
    if (images.length === 0) return [];
    
    // OFFLINE CHECK - fail fast if no connection
    if (!navigator.onLine) {
      console.log("[Upload] Blocked: offline");
      toast({ 
        title: "No internet connection", 
        description: "Check your connection and try again",
        variant: "destructive" 
      });
      return [];
    }
    
    // Reset cancel flag
    uploadCancelledRef.current = false;
    
    const UPLOAD_TIMEOUT = 30000; // 30 seconds per image
    const GLOBAL_WATCHDOG = 90000; // 90 seconds max for entire batch
    const MAX_RETRIES = 1;
    const uploadedUrls: string[] = [];
    const failedUploads: string[] = [];
    
    // Global watchdog - force reset if entire process takes too long
    const watchdogTimer = setTimeout(() => {
      if (uploadCancelledRef.current) return; // Already cancelled
      console.error("[Upload] WATCHDOG: Global timeout exceeded, forcing reset");
      setIsUploadingImages(false);
      setUploadProgress(null);
      toast({ 
        title: "Upload timed out", 
        description: "The upload took too long. Try with smaller images.",
        variant: "destructive" 
      });
    }, GLOBAL_WATCHDOG);
    
    // Wrap in try/finally to ALWAYS reset state
    try {
      setIsUploadingImages(true);
      setUploadProgress({ current: 0, total: images.length });
      
      // Process each image with retry logic
      for (let i = 0; i < images.length; i++) {
        // Check if cancelled
        if (uploadCancelledRef.current) {
          console.log("[Upload] Aborted by user");
          break;
        }
        
        const img = images[i];
        let attempts = 0;
        let result: { success: boolean; url: string | null; error?: string } = { success: false, url: null };
        
        // Compress image before upload
        const compressedFile = await compressImage(img.file);
        
        while (attempts <= MAX_RETRIES && !result.success && !uploadCancelledRef.current) {
          if (attempts > 0) console.log(`[Upload V2] Retry ${attempts} for ${compressedFile.name}`);
          result = await uploadWithSignedUrl(compressedFile, UPLOAD_TIMEOUT);
          attempts++;
          attempts++;
        }
        
        // Always increment progress (success or fail)
        setUploadProgress(prev => prev ? { ...prev, current: i + 1 } : null);
        
        if (result.success && result.url) {
          uploadedUrls.push(result.url);
        } else if (!uploadCancelledRef.current) {
          failedUploads.push(img.file.name);
        }
      }
      
      // Show toast for failed uploads (only if not cancelled)
      if (failedUploads.length > 0 && !uploadCancelledRef.current) {
        toast({
          title: `${failedUploads.length} image(s) failed`,
          description: failedUploads.length === 1 
            ? "Try with a smaller image or check your connection"
            : failedUploads.join(", "),
          variant: "destructive"
        });
      }
      
      return uploadedUrls;
    } finally {
      // ALWAYS clean up - this ensures UI never gets stuck
      clearTimeout(watchdogTimer);
      setIsUploadingImages(false);
      setUploadProgress(null);
      console.log(`[Upload] Complete: ${uploadedUrls.length} succeeded, ${failedUploads.length} failed`);
    }
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
    
    // Detect request type for AI Router (no mode switching needed)
    const hasImages = uploadedImages.length > 0;
    const requestType = detectRequestType(messageText, hasImages);
    console.log(`[ETHEREAL] Request type: ${requestType}`);
    
    // Add user message with placeholder for image info
    const displayContent = hasImages && !messageText 
      ? `📷 Shared ${uploadedImages.length} reference image${uploadedImages.length > 1 ? 's' : ''}`
      : messageText;
    
    const userMessage: Message = { role: "user", content: displayContent, mode };
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
          
          // AUTO-TRIGGER AR PREVIEW after successful upload (NEW FEATURE)
          // Show AR preview automatically so user can see placement right away
          toast({
            title: "🎨 Imagen recibida",
            description: "Analizando y preparando vista previa AR...",
          });
          
          // Auto-analyze uploaded images with DesignEngine + Feasibility
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
              
              // AUTO-OPEN AR PREVIEW with detected body part
              // This creates an immediate visual feedback loop for the user
              setTimeout(() => {
                setArPreview({
                  isOpen: true,
                  referenceImageUrl: imageUrls[0],
                  suggestedBodyPart: analysis.placement_suggestions?.[0] || 'forearm',
                  useFullAR: false, // Start with quick preview, user can switch to full AR
                });
                trackAROpened();
                
                toast({
                  title: "✨ AR Preview listo",
                  description: "Toca para ver cómo quedará tu tatuaje",
                });
              }, 1500); // Small delay for better UX
              
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
      
      // Now wait for assistant
      setIsWaitingAssistant(true);
      
      // Use unified AI Router
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`;
      
      // Get conversationId before sending
      const convId = await ensureConversation();
      
      // Retry logic for network resilience
      const maxRetries = 2;
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[ETHEREAL] Retry attempt ${attempt}/${maxRetries}`);
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
              type: requestType,
              messages: messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content,
              })).concat({ role: "user", content: messageText }),
              referenceImages: imageUrls.length > 0 ? imageUrls : undefined,
              imageUrl: imageUrls.length > 0 ? imageUrls[0] : undefined,
              conversationId: convId,
              fingerprint,
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
                          return prev.slice(0, -1).concat({ role: "assistant", content: assistantContent, mode });
                        }
                        return [...prev, { role: "assistant", content: assistantContent, mode }];
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
                      console.warn("[ETHEREAL] SSE parse warning:", parseErr);
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
                      return prev.slice(0, -1).concat({ role: "assistant", content: assistantContent, mode });
                    }
                    return [...prev, { role: "assistant", content: assistantContent, mode }];
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
        mode: "ethereal"
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-foreground flex items-center gap-2">
                    ETHEREAL
                    <RealtimeInlineStatus />
                    {!offlineStatus.isOnline && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <WifiOff className="w-3 h-3" />
                        Offline
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> AI Concierge
                    <GrokPoweredBadge variant="compact" />
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
                  
                  {/* Upload progress indicator with cancel button */}
                  {isUploadingImages && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center"
                    >
                      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 text-blue-500 text-xs">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {uploadProgress 
                            ? `Uploading ${uploadProgress.current}/${uploadProgress.total} images...`
                            : "Preparing upload..."
                          }
                        </div>
                        <button
                          onClick={cancelUpload}
                          className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* AI thinking indicator - Ethereal branding */}
                  {isWaitingAssistant && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                        <EtherealThinkingIndicator />
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Analysis indicator - Ethereal Vision branding */}
                  {isAnalyzing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        🔮 Ethereal Vision analizando...
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Reference Analysis Summary */}
                  {referenceAnalysis && !isAnalyzing && (
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
                  
                  {/* Action buttons - show after meaningful conversation progress */}
                  {(
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

      {/* AR Preview Modal - Unified component with mode prop */}
      {arPreview.isOpen && (
        <ARPreview
          isOpen={arPreview.isOpen}
          onClose={() => setArPreview((prev) => ({ ...prev, isOpen: false }))}
          referenceImageUrl={arPreview.referenceImageUrl}
          mode={arPreview.useFullAR ? "tracking" : "quick"}
          onBookingClick={() => {
            setArPreview((prev) => ({ ...prev, isOpen: false }));
            toast({ title: "¡Excelente! Let's continue with your booking." });
          }}
        />
      )}
    </>
  );
}

export default UnifiedConcierge;
