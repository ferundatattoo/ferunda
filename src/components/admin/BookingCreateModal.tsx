import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Loader2, Sparkles, User, Mail, Phone, Palette, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BookingCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: { email?: string; clientName?: string };
  onBookingCreated?: () => void;
}

const TATTOO_STYLES = [
  "Tradicional", "Neo-tradicional", "Realismo", "Blackwork", 
  "Dotwork", "Watercolor", "Minimalista", "Japonés", 
  "Tribal", "Geometric", "Trash Polka", "Lettering"
];

const TIME_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00"
];

export function BookingCreateModal({ 
  open, 
  onOpenChange, 
  initialData,
  onBookingCreated 
}: BookingCreateModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [artists, setArtists] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    selectedDate: undefined as Date | undefined,
    selectedTime: "",
    artistId: "",
    style: "",
    placement: "",
    size: "",
    description: "",
    referenceNotes: ""
  });

  // Load artists
  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from("studio_artists")
        .select("id, display_name, specialty_styles")
        .eq("is_active", true);
      if (data) setArtists(data);
    };
    fetchArtists();
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        clientName: initialData?.clientName || "",
        clientEmail: initialData?.email || "",
      }));
    }
  }, [open, initialData]);

  const handleAiSuggestSlots = async () => {
    setIsAiSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("grok-gateway", {
        body: {
          messages: [
            {
              role: "user",
              content: `Sugiere 3 horarios óptimos para una cita de tatuaje considerando:
              - Estilo: ${formData.style || "No especificado"}
              - Tamaño: ${formData.size || "Mediano"}
              - Es para un cliente ${formData.clientName ? "llamado " + formData.clientName : "nuevo"}
              
              Responde solo con los horarios sugeridos y una breve razón.`
            }
          ]
        }
      });

      if (data?.content) {
        toast({
          title: "🤖 Sugerencias de Grok AI",
          description: data.content.slice(0, 200),
        });
      }
    } catch (error) {
      console.error("AI suggestion error:", error);
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.clientEmail || !formData.selectedDate) {
      toast({
        title: "Campos requeridos",
        description: "Email y fecha son obligatorios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate email hash
      const encoder = new TextEncoder();
      const data = encoder.encode(formData.clientEmail.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const emailHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // Create or find client profile
      let clientId: string | undefined;
      const { data: existingClient } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("email_hash", emailHash)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const clientInsert = {
          email: formData.clientEmail,
          email_hash: emailHash,
          full_name: formData.clientName,
          phone: formData.clientPhone,
          preferred_styles: formData.style ? [formData.style] : []
        };
        const { data: newClient, error: clientError } = await supabase
          .from("client_profiles")
          .insert(clientInsert)
          .select("id")
          .single();

        if (clientError) throw clientError;
        clientId = newClient?.id;
      }

      // Create booking - bookings table requires email, name, and tattoo_description
      const bookingInsert = {
        email: formData.clientEmail,
        name: formData.clientName || "Cliente",
        tattoo_description: formData.description || `${formData.style || "Tatuaje"} - ${formData.placement || "ubicación no especificada"}`,
        full_name: formData.clientName || null,
        phone: formData.clientPhone || null,
        preferred_date: formData.selectedDate.toISOString().split("T")[0],
        scheduled_time: formData.selectedTime || null,
        placement: formData.placement || null,
        size: formData.size || null,
        source: "os_manual",
        status: "lead",
        artist_id: formData.artistId && formData.artistId !== "any" ? formData.artistId : null
      };

      const { error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingInsert);

      if (bookingError) throw bookingError;

      toast({
        title: "✅ Reserva creada",
        description: `Cita agendada para ${format(formData.selectedDate, "PPP", { locale: es })}`,
      });

      onBookingCreated?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        selectedDate: undefined,
        selectedTime: "",
        artistId: "",
        style: "",
        placement: "",
        size: "",
        description: "",
        referenceNotes: ""
      });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la reserva",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Nueva Reserva
          </DialogTitle>
          <DialogDescription>
            Crea una nueva cita de tatuaje
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Client Info */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> Información del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre</Label>
                <Input
                  id="clientName"
                  placeholder="Nombre completo"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clientEmail"
                    type="email"
                    className="pl-9"
                    placeholder="cliente@email.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="clientPhone"
                    className="pl-9"
                    placeholder="+1 234 567 8900"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" /> Fecha y Hora
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiSuggestSlots}
                disabled={isAiSuggesting}
              >
                {isAiSuggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI Sugerir
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Preferida *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.selectedDate ? (
                        format(formData.selectedDate, "PPP", { locale: es })
                      ) : (
                        "Seleccionar fecha"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.selectedDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, selectedDate: date }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Hora Preferida</Label>
                <Select
                  value={formData.selectedTime}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, selectedTime: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tattoo Details */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" /> Detalles del Tatuaje
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Artista</Label>
                <Select
                  value={formData.artistId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, artistId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar artista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier artista</SelectItem>
                    {artists.map(artist => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.display_name || "Artista"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estilo</Label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, style: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estilo de tatuaje" />
                  </SelectTrigger>
                  <SelectContent>
                    {TATTOO_STYLES.map(style => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Ej: Antebrazo derecho"
                    value={formData.placement}
                    onChange={(e) => setFormData(prev => ({ ...prev, placement: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tamaño aproximado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiny">Tiny (2-5cm)</SelectItem>
                    <SelectItem value="small">Pequeño (5-10cm)</SelectItem>
                    <SelectItem value="medium">Mediano (10-20cm)</SelectItem>
                    <SelectItem value="large">Grande (20-35cm)</SelectItem>
                    <SelectItem value="xlarge">Extra grande (35cm+)</SelectItem>
                    <SelectItem value="sleeve">Manga completa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción de la idea</Label>
              <Textarea
                placeholder="Describe el diseño que busca el cliente..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crear Reserva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
