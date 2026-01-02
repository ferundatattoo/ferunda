import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Palette, 
  Upload, 
  MapPin, 
  Calendar, 
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Image as ImageIcon,
  Ruler,
  Clock,
  MessageSquare,
  Loader2
} from "lucide-react";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Flow steps
type FlowStep = "type" | "references" | "details" | "availability" | "confirmation";

interface ProjectType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface AvailableSlot {
  id: string;
  date: string;
  label: string;
  time: string;
  city?: string;
}

interface DesignBrief {
  projectType: string;
  references: string[];
  description: string;
  size: string;
  placement: string;
  style: string;
  preferredDates: string[];
  estimatedHours: number;
}

const PROJECT_TYPES: ProjectType[] = [
  { 
    id: "new_tattoo", 
    label: "Nuevo Tatuaje", 
    description: "Diseño personalizado desde cero",
    icon: <Sparkles className="w-5 h-5" />
  },
  { 
    id: "coverup", 
    label: "Cover-up", 
    description: "Cubrir un tatuaje existente",
    icon: <Palette className="w-5 h-5" />
  },
  { 
    id: "touchup", 
    label: "Retoque", 
    description: "Mejorar un tatuaje existente",
    icon: <Check className="w-5 h-5" />
  },
];

const SIZES = [
  { id: "small", label: "Pequeño", sublabel: "< 5cm" },
  { id: "medium", label: "Mediano", sublabel: "5-15cm" },
  { id: "large", label: "Grande", sublabel: "15-30cm" },
  { id: "xlarge", label: "Extra Grande", sublabel: "> 30cm" },
];

const PLACEMENTS = [
  "Brazo", "Antebrazo", "Muñeca", "Hombro", 
  "Pecho", "Espalda", "Costilla", "Pierna",
  "Tobillo", "Cuello", "Mano", "Otro"
];

const STYLES = [
  "Blackwork", "Fine Line", "Realismo", "Neotradicional",
  "Japonés", "Minimalista", "Geométrico", "Acuarela",
  "Dotwork", "Tribal", "Old School", "Otro"
];

const STEP_ORDER: FlowStep[] = ["type", "references", "details", "availability", "confirmation"];

export default function CardFlowConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<FlowStep>("type");
  const [brief, setBrief] = useState<DesignBrief>({
    projectType: "",
    references: [],
    description: "",
    size: "",
    placement: "",
    style: "",
    preferredDates: [],
    estimatedHours: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const { fingerprint } = useDeviceFingerprint();
  const { user } = useAuth();
  const { workspaceId } = useWorkspace(user?.id ?? null);

  // Fetch real availability from database
  useEffect(() => {
    const fetchAvailability = async () => {
      setLoadingSlots(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("availability")
          .select("id, date, city, time_slots, notes")
          .eq("is_available", true)
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(20);

        if (error) throw error;

        const slots: AvailableSlot[] = (data || []).map((slot) => {
          const dateObj = new Date(slot.date + "T12:00:00");
          const dayName = format(dateObj, "EEEE d MMMM", { locale: es });
          
          // Parse time_slots JSONB if available
          let timeRange = "Horario flexible";
          if (slot.time_slots && Array.isArray(slot.time_slots) && slot.time_slots.length > 0) {
            const firstSlot = slot.time_slots[0] as { start?: string; end?: string };
            if (firstSlot?.start && firstSlot?.end) {
              timeRange = `${firstSlot.start} - ${firstSlot.end}`;
            }
          }

          return {
            id: slot.id,
            date: slot.date,
            label: dayName.charAt(0).toUpperCase() + dayName.slice(1),
            time: timeRange,
            city: slot.city || undefined,
          };
        });

        setAvailableSlots(slots);
      } catch (err) {
        console.error("Error fetching availability:", err);
        // Fallback to empty - user can still submit without preferred dates
      } finally {
        setLoadingSlots(false);
      }
    };

    if (isOpen && currentStep === "availability") {
      fetchAvailability();
    }
  }, [isOpen, currentStep]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [currentStepIndex]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const fileName = `${fingerprint || "anon"}-${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("reference-images")
        .upload(fileName, file);

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from("reference-images")
          .getPublicUrl(data.path);
        newUrls.push(urlData.publicUrl);
      }
    }

    setBrief(prev => ({ ...prev, references: [...prev.references, ...newUrls] }));
    setUploading(false);
    toast.success(`${newUrls.length} imagen(es) subida(s)`);
  };

  const removeImage = (index: number) => {
    setBrief(prev => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      // Insert into booking_requests
      const { data: bookingRequest, error } = await supabase.from("booking_requests").insert({
        workspace_id: workspaceId,
        user_id: user?.id,
        device_fingerprint: fingerprint,
        service_type: brief.projectType,
        status: "new",
        route: "concierge",
        brief: {
          description: brief.description,
          size: brief.size,
          placement: brief.placement,
          style: brief.style,
        },
        reference_images: brief.references,
        preferred_dates: brief.preferredDates,
        estimated_hours: brief.estimatedHours || 2,
      }).select("id").single();

      if (error) throw error;

      // Also log to omnichannel_messages for unified inbox
      await supabase.from("omnichannel_messages").insert({
        channel: "web",
        direction: "inbound",
        sender_id: fingerprint || user?.id || "anonymous",
        content: `Nueva solicitud de ${brief.projectType}: ${brief.description || "Sin descripción"}`,
        message_type: "booking_request",
        status: "unread",
        ai_processed: false,
        metadata: {
          booking_request_id: bookingRequest?.id,
          project_type: brief.projectType,
          size: brief.size,
          placement: brief.placement,
          style: brief.style,
        },
      });

      toast.success("¡Solicitud enviada! Te contactaremos pronto.");
      setIsOpen(false);
      setCurrentStep("type");
      setBrief({
        projectType: "",
        references: [],
        description: "",
        size: "",
        placement: "",
        style: "",
        preferredDates: [],
        estimatedHours: 0,
      });
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Error al enviar la solicitud");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case "type":
        return !!brief.projectType;
      case "references":
        return true; // Optional
      case "details":
        return !!brief.size && !!brief.placement;
      case "availability":
        return true; // Made optional since slots might not be available
      case "confirmation":
        return true;
      default:
        return false;
    }
  }, [currentStep, brief]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "type":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">¿Qué tipo de proyecto tienes en mente?</h3>
              <p className="text-sm text-muted-foreground mt-1">Selecciona una opción</p>
            </div>
            <div className="grid gap-3">
              {PROJECT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setBrief(prev => ({ ...prev, projectType: type.id }))}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    brief.projectType === type.id
                      ? "border-primary bg-primary/10 shadow-lg"
                      : "border-border/50 bg-card/50 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      brief.projectType === type.id ? "bg-primary/20" : "bg-muted"
                    }`}>
                      {type.icon}
                    </div>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                    {brief.projectType === type.id && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case "references":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Sube tus referencias</h3>
              <p className="text-sm text-muted-foreground mt-1">Imágenes que inspiran tu diseño (opcional)</p>
            </div>

            {/* Upload area */}
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/50 rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-card/30">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="animate-pulse text-muted-foreground">Subiendo...</div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Arrastra imágenes o haz clic</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 10MB</p>
                </>
              )}
            </label>

            {/* Uploaded images */}
            {brief.references.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {brief.references.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={url} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-destructive/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Describe tu idea
              </label>
              <Textarea
                value={brief.description}
                onChange={(e) => setBrief(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Cuéntanos sobre tu visión para el tatuaje..."
                className="min-h-[100px] bg-card/50"
              />
            </div>
          </div>
        );

      case "details":
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Detalles del tatuaje</h3>
              <p className="text-sm text-muted-foreground mt-1">Tamaño, ubicación y estilo</p>
            </div>

            {/* Size */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Tamaño
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setBrief(prev => ({ ...prev, size: size.id }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      brief.size === size.id
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-card/50 hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{size.label}</p>
                    <p className="text-xs text-muted-foreground">{size.sublabel}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Placement */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Ubicación
              </label>
              <div className="flex flex-wrap gap-2">
                {PLACEMENTS.map((place) => (
                  <button
                    key={place}
                    onClick={() => setBrief(prev => ({ ...prev, placement: place }))}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      brief.placement === place
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {place}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Estilo preferido
              </label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => setBrief(prev => ({ ...prev, style }))}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      brief.style === style
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "availability":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">¿Cuándo te viene bien?</h3>
              <p className="text-sm text-muted-foreground mt-1">Selecciona tus fechas preferidas</p>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Cargando disponibilidad...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/50">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No hay fechas disponibles próximamente</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Puedes continuar y te contactaremos cuando haya disponibilidad
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => {
                      setBrief(prev => ({
                        ...prev,
                        preferredDates: prev.preferredDates.includes(slot.date)
                          ? prev.preferredDates.filter(d => d !== slot.date)
                          : [...prev.preferredDates, slot.date]
                      }));
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      brief.preferredDates.includes(slot.date)
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border/50 bg-card/50 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{slot.label}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {slot.time}
                            {slot.city && (
                              <>
                                <span className="mx-1">•</span>
                                <MapPin className="w-3 h-3" />
                                {slot.city}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      {brief.preferredDates.includes(slot.date) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {availableSlots.length > 0 ? "Puedes seleccionar múltiples fechas" : "Este paso es opcional"}
            </p>
          </div>
        );

      case "confirmation":
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Resumen de tu solicitud</h3>
              <p className="text-sm text-muted-foreground mt-1">Revisa los detalles antes de enviar</p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Tipo de proyecto</p>
                <p className="font-medium">
                  {PROJECT_TYPES.find(t => t.id === brief.projectType)?.label || brief.projectType}
                </p>
              </div>

              {brief.references.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Referencias</p>
                  <div className="flex gap-2">
                    {brief.references.slice(0, 3).map((url, idx) => (
                      <img key={idx} src={url} alt="" className="w-12 h-12 rounded object-cover" />
                    ))}
                    {brief.references.length > 3 && (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs">
                        +{brief.references.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tamaño</p>
                  <p className="font-medium">{SIZES.find(s => s.id === brief.size)?.label || "-"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Ubicación</p>
                  <p className="font-medium">{brief.placement || "-"}</p>
                </div>
              </div>

              {brief.style && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Estilo</p>
                  <p className="font-medium">{brief.style}</p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Fechas preferidas</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {brief.preferredDates.map((date) => {
                    const slot = availableSlots.find(d => d.date === date);
                    return (
                      <Badge key={date} variant="secondary" className="text-xs">
                        {slot?.label || date}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-gradient-to-br from-card via-card to-muted/20 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/30 bg-card/50 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Nueva Solicitud</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Progress value={progress} className="h-1" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Paso {currentStepIndex + 1} de {STEP_ORDER.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border/30 bg-card/50 backdrop-blur-xl">
                <div className="flex gap-3">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="outline"
                      onClick={goBack}
                      className="flex-1"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Atrás
                    </Button>
                  )}
                  {currentStep === "confirmation" ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting ? "Enviando..." : "Enviar Solicitud"}
                      <Check className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={goNext}
                      disabled={!canProceed()}
                      className="flex-1"
                    >
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
