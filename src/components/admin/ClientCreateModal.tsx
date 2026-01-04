import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, UserPlus } from "lucide-react";

interface ClientCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: () => void;
  initialData?: {
    email?: string;
    name?: string;
  };
}

const STYLE_OPTIONS = [
  "Fine Line", "Micro Realism", "Black & Grey", "Color", "Traditional",
  "Neo Traditional", "Geometric", "Minimalist", "Watercolor", "Blackwork"
];

export const ClientCreateModal = ({ 
  open, 
  onOpenChange, 
  onClientCreated,
  initialData 
}: ClientCreateModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: initialData?.name || "",
    email: initialData?.email || "",
    instagram_handle: "",
    phone: "",
    preferred_styles: [] as string[],
    allergies: "",
    medical_notes: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Generate email hash
      const encoder = new TextEncoder();
      const data = encoder.encode(formData.email.toLowerCase().trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const email_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from("client_profiles")
        .insert({
          email: formData.email.trim().toLowerCase(),
          email_hash,
          full_name: formData.full_name.trim() || null,
          instagram_handle: formData.instagram_handle.trim() || null,
          preferred_styles: formData.preferred_styles.length > 0 ? formData.preferred_styles : null,
          allergies: formData.allergies.trim() ? formData.allergies.split(",").map(a => a.trim()) : null,
          medical_notes: formData.medical_notes.trim() || null,
          lead_score: 50, // Default score for manually created clients
        });

      if (error) throw error;

      toast({ title: "Success", description: "Client profile created" });
      onOpenChange(false);
      onClientCreated?.();
      
      // Reset form
      setFormData({
        full_name: "",
        email: "",
        instagram_handle: "",
        phone: "",
        preferred_styles: [],
        allergies: "",
        medical_notes: "",
      });
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create client", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle = (style: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_styles: prev.preferred_styles.includes(style)
        ? prev.preferred_styles.filter(s => s !== style)
        : [...prev.preferred_styles, style]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <UserPlus className="w-5 h-5 text-primary" />
            Nuevo Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram_handle}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram_handle: e.target.value }))}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estilos Preferidos</Label>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((style) => (
                <Badge
                  key={style}
                  variant={formData.preferred_styles.includes(style) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleStyle(style)}
                >
                  {style}
                  {formData.preferred_styles.includes(style) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allergies">Alergias (separadas por coma)</Label>
            <Input
              id="allergies"
              value={formData.allergies}
              onChange={(e) => setFormData(prev => ({ ...prev, allergies: e.target.value }))}
              placeholder="Latex, certain inks..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medical_notes">Notas Médicas</Label>
            <Textarea
              id="medical_notes"
              value={formData.medical_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, medical_notes: e.target.value }))}
              placeholder="Any relevant medical information..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCreateModal;
