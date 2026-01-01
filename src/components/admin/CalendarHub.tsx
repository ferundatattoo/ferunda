import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, RefreshCw, MapPin, Brain, CalendarClock, Sparkles } from "lucide-react";
import AvailabilityManager from "./AvailabilityManager";
import GoogleCalendarSync from "./GoogleCalendarSync";
import CityConfigurationManager from "./CityConfigurationManager";
import AISchedulingAssistant from "./AISchedulingAssistant";
import AdvancedCalendarManager from "./AdvancedCalendarManager";
import SmartSchedulingAI from "./SmartSchedulingAI";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface AvailabilityDate {
  id: string;
  date: string;
  city: string;
  is_available: boolean;
  notes: string | null;
}

const CalendarHub = () => {
  const [activeSubTab, setActiveSubTab] = useState("availability");
  const [availabilityDates, setAvailabilityDates] = useState<AvailabilityDate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      setAvailabilityDates(data || []);
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const addAvailability = async (date: string, city: string, notes: string) => {
    try {
      const { error } = await supabase.from("availability").insert({
        date,
        city,
        notes: notes || null,
        is_available: true,
      });

      if (error) throw error;

      toast({
        title: "Fecha Agregada",
        description: `Disponibilidad en ${city} agregada.`,
      });

      fetchAvailability();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message?.includes("duplicate")
          ? "Esta fecha ya existe."
          : "Error al agregar fecha.",
        variant: "destructive",
      });
    }
  };

  const deleteAvailability = async (id: string) => {
    try {
      const { error } = await supabase.from("availability").delete().eq("id", id);
      if (error) throw error;
      setAvailabilityDates((prev) => prev.filter((d) => d.id !== id));
      toast({
        title: "Fecha Eliminada",
        description: "La fecha de disponibilidad fue eliminada.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar fecha.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl text-foreground">Calendario</h1>
        <p className="font-body text-muted-foreground mt-1">
          Gestiona disponibilidad, sincronización y ciudades
        </p>
      </div>

      {/* Sub Navigation */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="w-full justify-start bg-secondary/30 border border-border/50 p-1 flex-wrap">
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Disponibilidad</span>
          </TabsTrigger>
          <TabsTrigger value="ai-scheduler" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span>AI Scheduler</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            <span>Avanzado</span>
          </TabsTrigger>
          <TabsTrigger value="google-sync" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>Google Sync</span>
          </TabsTrigger>
          <TabsTrigger value="cities" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Ciudades</span>
          </TabsTrigger>
          <TabsTrigger value="smart-ai" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Smart AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="mt-6">
          <AvailabilityManager
            dates={availabilityDates}
            loading={loading}
            onAdd={addAvailability}
            onDelete={deleteAvailability}
          />
        </TabsContent>

        <TabsContent value="ai-scheduler" className="mt-6">
          <AISchedulingAssistant />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <AdvancedCalendarManager />
        </TabsContent>

        <TabsContent value="google-sync" className="mt-6">
          <GoogleCalendarSync />
        </TabsContent>

        <TabsContent value="cities" className="mt-6">
          <CityConfigurationManager />
        </TabsContent>

        <TabsContent value="smart-ai" className="mt-6">
          <SmartSchedulingAI />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarHub;
