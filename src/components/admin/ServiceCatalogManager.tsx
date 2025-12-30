import { useState, useEffect } from "react";
import { 
  Package, 
  Save, 
  Clock, 
  DollarSign,
  Plus,
  Trash2,
  GripVertical,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  service_key: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  deposit_amount: number;
  buffer_before_min: number;
  buffer_after_min: number;
  extra_after_buffer_min: number;
  is_active: boolean;
  sort_order: number;
  settings: Record<string, unknown> | null;
}

type ServiceUpdate = {
  name?: string;
  description?: string | null;
  duration_minutes?: number;
  deposit_amount?: number;
  buffer_before_min?: number;
  buffer_after_min?: number;
  extra_after_buffer_min?: number;
  is_active?: boolean;
};

const ServiceCatalogManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setServices((data || []) as Service[]);
    } catch (err) {
      console.error("Error fetching services:", err);
      toast({
        title: "Error",
        description: "Failed to load services.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateService = async (id: string, updates: ServiceUpdate) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("services")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      setEditingId(null);
      toast({
        title: "Service updated",
        description: "Changes saved successfully."
      });
    } catch (err) {
      console.error("Error updating service:", err);
      toast({
        title: "Error",
        description: "Failed to update service.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await updateService(id, { is_active: isActive });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <div>
            <h2 className="font-display text-xl text-foreground">Service Catalog</h2>
            <p className="text-sm text-muted-foreground">
              {services.filter(s => s.is_active).length} active services
            </p>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {services.map((service) => (
          <div 
            key={service.id}
            className="bg-card border border-border rounded-lg p-5 transition-all hover:border-primary/30"
          >
            {editingId === service.id ? (
              <ServiceEditForm
                service={service}
                onSave={(updates) => updateService(service.id, updates)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-lg">{service.name}</h3>
                    {!service.is_active && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {service.description || service.service_key}
                  </p>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(service.duration_minutes)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>${service.deposit_amount}</span>
                    </div>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">
                    <div>+{service.buffer_before_min}min before</div>
                    <div>+{service.buffer_after_min + service.extra_after_buffer_min}min after</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={service.is_active}
                    onCheckedChange={(checked) => toggleActive(service.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(service.id)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Card */}
      <div className="bg-muted/30 border border-border rounded-lg p-5">
        <h3 className="font-display text-lg mb-4">Luxury Defaults</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Consultation</p>
            <p className="font-medium">20min, $0 deposit</p>
          </div>
          <div>
            <p className="text-muted-foreground">3-4h Sessions</p>
            <p className="font-medium">$150 deposit</p>
          </div>
          <div>
            <p className="text-muted-foreground">6h Sessions</p>
            <p className="font-medium">$250 deposit</p>
          </div>
          <div>
            <p className="text-muted-foreground">8h Sessions</p>
            <p className="font-medium">$350 deposit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ServiceEditFormProps {
  service: Service;
  onSave: (updates: ServiceUpdate) => void;
  onCancel: () => void;
  saving: boolean;
}

const ServiceEditForm = ({ service, onSave, onCancel, saving }: ServiceEditFormProps) => {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description || "");
  const [durationMinutes, setDurationMinutes] = useState(service.duration_minutes);
  const [depositAmount, setDepositAmount] = useState(service.deposit_amount);
  const [bufferBefore, setBufferBefore] = useState(service.buffer_before_min);
  const [bufferAfter, setBufferAfter] = useState(service.buffer_after_min);
  const [extraBuffer, setExtraBuffer] = useState(service.extra_after_buffer_min);

  const handleSubmit = () => {
    onSave({
      name,
      description: description || null,
      duration_minutes: durationMinutes,
      deposit_amount: depositAmount,
      buffer_before_min: bufferBefore,
      buffer_after_min: bufferAfter,
      extra_after_buffer_min: extraBuffer
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Deposit ($)</Label>
          <Input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Buffer Before (min)</Label>
          <Input
            type="number"
            value={bufferBefore}
            onChange={(e) => setBufferBefore(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Buffer After (min)</Label>
          <Input
            type="number"
            value={bufferAfter}
            onChange={(e) => setBufferAfter(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Extra Buffer for Long Sessions (min)</Label>
          <Input
            type="number"
            value={extraBuffer}
            onChange={(e) => setExtraBuffer(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="gap-2">
          {saving ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default ServiceCatalogManager;
