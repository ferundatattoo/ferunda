import React, { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Home,
  Building2,
  Plane,
  DollarSign,
  Clock,
  Check,
  X,
  Settings,
  Palette
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CityType = 'home_base' | 'second_base' | 'guest_spot';

interface CityConfiguration {
  id: string;
  city_name: string;
  city_type: CityType;
  address: string | null;
  studio_name: string | null;
  timezone: string;
  session_rate: number;
  deposit_amount: number;
  is_active: boolean;
  color_hex: string;
  notes: string | null;
  travel_buffer_days: number;
  min_sessions_per_trip: number;
  max_sessions_per_day: number;
}

const CITY_TYPES = {
  home_base: { label: "Home Base", icon: Home, color: "text-emerald-400" },
  second_base: { label: "Second Base", icon: Building2, color: "text-sky-400" },
  guest_spot: { label: "Guest Spot", icon: Plane, color: "text-amber-400" }
};

const TIMEZONES = [
  "America/Chicago",
  "America/Los_Angeles",
  "America/New_York",
  "America/Denver",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris"
];

const COLOR_OPTIONS = [
  "#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4", "#84cc16"
];

const CityConfigurationManager = forwardRef<HTMLDivElement>((_, ref) => {
  const { toast } = useToast();
  const [cities, setCities] = useState<CityConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCity, setEditingCity] = useState<CityConfiguration | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<{
    city_name: string;
    city_type: CityType;
    address: string;
    studio_name: string;
    timezone: string;
    session_rate: number;
    deposit_amount: number;
    is_active: boolean;
    color_hex: string;
    notes: string;
    travel_buffer_days: number;
    min_sessions_per_trip: number;
    max_sessions_per_day: number;
  }>({
    city_name: "",
    city_type: "guest_spot",
    address: "",
    studio_name: "",
    timezone: "America/Chicago",
    session_rate: 2500,
    deposit_amount: 500,
    is_active: true,
    color_hex: "#10b981",
    notes: "",
    travel_buffer_days: 1,
    min_sessions_per_trip: 3,
    max_sessions_per_day: 2
  });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from("city_configurations")
        .select("*")
        .order("city_type", { ascending: true });

      if (error) throw error;
      setCities((data || []) as CityConfiguration[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      city_name: "",
      city_type: "guest_spot",
      address: "",
      studio_name: "",
      timezone: "America/Chicago",
      session_rate: 2500,
      deposit_amount: 500,
      is_active: true,
      color_hex: "#10b981",
      notes: "",
      travel_buffer_days: 1,
      min_sessions_per_trip: 3,
      max_sessions_per_day: 2
    });
    setEditingCity(null);
    setIsCreating(false);
  };

  const openEditForm = (city: CityConfiguration) => {
    setEditingCity(city);
    setFormData({
      city_name: city.city_name,
      city_type: city.city_type,
      address: city.address || "",
      studio_name: city.studio_name || "",
      timezone: city.timezone,
      session_rate: city.session_rate,
      deposit_amount: city.deposit_amount,
      is_active: city.is_active,
      color_hex: city.color_hex,
      notes: city.notes || "",
      travel_buffer_days: city.travel_buffer_days,
      min_sessions_per_trip: city.min_sessions_per_trip,
      max_sessions_per_day: city.max_sessions_per_day
    });
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!formData.city_name.trim()) {
      toast({ title: "Error", description: "City name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingCity) {
        const { error } = await supabase
          .from("city_configurations")
          .update({
            city_name: formData.city_name,
            city_type: formData.city_type,
            address: formData.address || null,
            studio_name: formData.studio_name || null,
            timezone: formData.timezone,
            session_rate: formData.session_rate,
            deposit_amount: formData.deposit_amount,
            is_active: formData.is_active,
            color_hex: formData.color_hex,
            notes: formData.notes || null,
            travel_buffer_days: formData.travel_buffer_days,
            min_sessions_per_trip: formData.min_sessions_per_trip,
            max_sessions_per_day: formData.max_sessions_per_day
          })
          .eq("id", editingCity.id);

        if (error) throw error;
        toast({ title: "Updated", description: `${formData.city_name} settings saved.` });
      } else {
        const { error } = await supabase
          .from("city_configurations")
          .insert({
            city_name: formData.city_name,
            city_type: formData.city_type,
            address: formData.address || null,
            studio_name: formData.studio_name || null,
            timezone: formData.timezone,
            session_rate: formData.session_rate,
            deposit_amount: formData.deposit_amount,
            is_active: formData.is_active,
            color_hex: formData.color_hex,
            notes: formData.notes || null,
            travel_buffer_days: formData.travel_buffer_days,
            min_sessions_per_trip: formData.min_sessions_per_trip,
            max_sessions_per_day: formData.max_sessions_per_day
          });

        if (error) throw error;
        toast({ title: "Created", description: `${formData.city_name} added as ${CITY_TYPES[formData.city_type].label}.` });
      }

      resetForm();
      fetchCities();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (city: CityConfiguration) => {
    if (!confirm(`Delete ${city.city_name}? This will also remove associated availability dates.`)) return;

    try {
      const { error } = await supabase
        .from("city_configurations")
        .delete()
        .eq("id", city.id);

      if (error) throw error;
      toast({ title: "Deleted", description: `${city.city_name} removed.` });
      fetchCities();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleActive = async (city: CityConfiguration) => {
    try {
      const { error } = await supabase
        .from("city_configurations")
        .update({ is_active: !city.is_active })
        .eq("id", city.id);

      if (error) throw error;
      toast({ 
        title: city.is_active ? "Deactivated" : "Activated", 
        description: `${city.city_name} is now ${city.is_active ? "hidden" : "visible"} on the website.` 
      });
      fetchCities();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const groupedCities = {
    home_base: cities.filter(c => c.city_type === "home_base"),
    second_base: cities.filter(c => c.city_type === "second_base"),
    guest_spot: cities.filter(c => c.city_type === "guest_spot")
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            City Configuration
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Manage studio locations, guest spots, and city-specific pricing
          </p>
        </div>
        <button
          onClick={() => { setIsCreating(true); resetForm(); setIsCreating(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add City
        </button>
      </div>

      {/* Edit/Create Form */}
      <AnimatePresence>
        {(isCreating || editingCity) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-border overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-light text-foreground">
                  {editingCity ? `Edit ${editingCity.city_name}` : "Add New City"}
                </h3>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h4 className="font-body text-sm uppercase tracking-wider text-muted-foreground">Basic Info</h4>
                  
                  <div>
                    <label className="font-body text-sm text-muted-foreground">City Name *</label>
                    <input
                      type="text"
                      value={formData.city_name}
                      onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                      placeholder="e.g., Miami"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">City Type</label>
                    <select
                      value={formData.city_type}
                      onChange={(e) => setFormData({ ...formData, city_type: e.target.value as any })}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    >
                      <option value="home_base">Home Base (Primary Studio)</option>
                      <option value="second_base">Second Base (Regular Location)</option>
                      <option value="guest_spot">Guest Spot (Temporary)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Studio Name</label>
                    <input
                      type="text"
                      value={formData.studio_name}
                      onChange={(e) => setFormData({ ...formData, studio_name: e.target.value })}
                      placeholder="e.g., Ink Masters Miami"
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full studio address..."
                      rows={2}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Timezone</label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h4 className="font-body text-sm uppercase tracking-wider text-muted-foreground">Pricing</h4>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Session Rate ($)</label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={formData.session_rate}
                        onChange={(e) => setFormData({ ...formData, session_rate: Number(e.target.value) })}
                        className="w-full pl-10 pr-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Deposit Amount ($)</label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={formData.deposit_amount}
                        onChange={(e) => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                        className="w-full pl-10 pr-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Color</label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({ ...formData, color_hex: color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.color_hex === color ? "border-foreground scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scheduling Rules */}
                <div className="space-y-4">
                  <h4 className="font-body text-sm uppercase tracking-wider text-muted-foreground">Scheduling Rules</h4>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Travel Buffer (days)</label>
                    <p className="font-body text-xs text-muted-foreground/70">Days blocked before/after travel</p>
                    <input
                      type="number"
                      value={formData.travel_buffer_days}
                      onChange={(e) => setFormData({ ...formData, travel_buffer_days: Number(e.target.value) })}
                      min={0}
                      max={7}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Min Sessions Per Trip</label>
                    <p className="font-body text-xs text-muted-foreground/70">Minimum bookings to justify travel</p>
                    <input
                      type="number"
                      value={formData.min_sessions_per_trip}
                      onChange={(e) => setFormData({ ...formData, min_sessions_per_trip: Number(e.target.value) })}
                      min={1}
                      max={10}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Max Sessions Per Day</label>
                    <input
                      type="number"
                      value={formData.max_sessions_per_day}
                      onChange={(e) => setFormData({ ...formData, max_sessions_per_day: Number(e.target.value) })}
                      min={1}
                      max={5}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
                    />
                  </div>

                  <div>
                    <label className="font-body text-sm text-muted-foreground">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Internal notes..."
                      rows={3}
                      className="w-full mt-1 px-3 py-2 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        formData.is_active ? "bg-emerald-500" : "bg-muted"
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        formData.is_active ? "left-5" : "left-1"
                      }`} />
                    </button>
                    <span className="font-body text-sm text-foreground">
                      {formData.is_active ? "Active (visible on website)" : "Inactive (hidden)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingCity ? "Save Changes" : "Create City"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-6 py-2 border border-border font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* City Groups */}
      {Object.entries(groupedCities).map(([type, citiesList]) => {
        const typeInfo = CITY_TYPES[type as keyof typeof CITY_TYPES];
        if (citiesList.length === 0) return null;

        return (
          <div key={type} className="space-y-3">
            <div className="flex items-center gap-2">
              <typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} />
              <h2 className="font-body text-sm uppercase tracking-wider text-muted-foreground">
                {typeInfo.label}s ({citiesList.length})
              </h2>
            </div>

            <div className="grid gap-4">
              {citiesList.map((city) => (
                <motion.div
                  key={city.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border p-4 transition-colors ${
                    city.is_active ? "border-border hover:border-foreground/30" : "border-border/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: city.color_hex + "20", color: city.color_hex }}
                      >
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg text-foreground">{city.city_name}</h3>
                          {!city.is_active && (
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-body">
                              Inactive
                            </span>
                          )}
                        </div>
                        {city.studio_name && (
                          <p className="font-body text-sm text-muted-foreground">{city.studio_name}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="font-body text-sm text-foreground">
                            <DollarSign className="w-3 h-3 inline" />
                            {city.session_rate.toLocaleString()}
                          </span>
                          <span className="font-body text-sm text-muted-foreground">
                            Deposit: ${city.deposit_amount}
                          </span>
                          <span className="font-body text-sm text-muted-foreground">
                            {city.timezone.split("/")[1]?.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(city)}
                        className={`p-2 transition-colors ${
                          city.is_active 
                            ? "text-emerald-400 hover:text-emerald-300" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title={city.is_active ? "Deactivate" : "Activate"}
                      >
                        {city.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditForm(city)}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {city.city_type === "guest_spot" && (
                        <button
                          onClick={() => handleDelete(city)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {city.address && (
                    <p className="font-body text-xs text-muted-foreground mt-3 pl-16">
                      {city.address}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      {cities.length === 0 && (
        <div className="text-center py-20 border border-border">
          <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground">No cities configured yet</p>
          <button
            onClick={() => setIsCreating(true)}
            className="mt-4 px-6 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
          >
            Add Your First City
          </button>
        </div>
      )}
    </div>
  );
});

CityConfigurationManager.displayName = "CityConfigurationManager";

export default CityConfigurationManager;
