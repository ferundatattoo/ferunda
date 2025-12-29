import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, Plus, Trash2, Edit2, Save, Loader2, Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Artist {
  id: string;
  name: string;
  display_name: string | null;
}

interface City {
  id: string;
  city_name: string;
}

interface PricingModel {
  id: string;
  artist_id: string | null;
  city_id: string | null;
  pricing_type: string;
  rate_amount: number;
  rate_currency: string;
  min_price: number | null;
  max_price: number | null;
  minimum_amount: number | null;
  minimum_applies_to: string | null;
  deposit_type: string;
  deposit_amount: number;
  deposit_percentage: number | null;
  is_default: boolean;
  applies_to_styles: string[];
  notes: string | null;
  is_active: boolean;
  artist?: Artist;
  city?: City;
}

const PRICING_TYPES = [
  { value: "hourly", label: "Hourly Rate", description: "$/hour" },
  { value: "day_session", label: "Day Session", description: "Full day rate" },
  { value: "by_piece", label: "By Piece", description: "Quote per design" },
  { value: "minimum", label: "Shop Minimum", description: "Base price for small work" }
];

const PricingModelsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pricingModels, setPricingModels] = useState<PricingModel[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [editingModel, setEditingModel] = useState<PricingModel | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModel, setNewModel] = useState<{
    artist_id: string;
    city_id: string;
    pricing_type: string;
    rate_amount: number;
    deposit_type: string;
    deposit_amount: number;
    deposit_percentage: number;
    is_default: boolean;
    notes: string;
  }>({
    artist_id: "",
    city_id: "",
    pricing_type: "day_session",
    rate_amount: 2500,
    deposit_type: "fixed",
    deposit_amount: 500,
    deposit_percentage: 20,
    is_default: false,
    notes: ""
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [modelsRes, artistsRes, citiesRes] = await Promise.all([
      supabase.from("artist_pricing_models").select("*").order("pricing_type"),
      supabase.from("studio_artists").select("id, name, display_name").eq("is_active", true),
      supabase.from("city_configurations").select("id, city_name").eq("is_active", true)
    ]);

    if (modelsRes.data) setPricingModels(modelsRes.data);
    if (artistsRes.data) setArtists(artistsRes.data);
    if (citiesRes.data) setCities(citiesRes.data);
    setLoading(false);
  };

  const addPricingModel = async () => {
    const { error } = await supabase.from("artist_pricing_models").insert({
      artist_id: newModel.artist_id || null,
      city_id: newModel.city_id || null,
      pricing_type: newModel.pricing_type,
      rate_amount: newModel.rate_amount,
      deposit_type: newModel.deposit_type,
      deposit_amount: newModel.deposit_type === "fixed" ? newModel.deposit_amount : null,
      deposit_percentage: newModel.deposit_type === "percentage" ? newModel.deposit_percentage : null,
      is_default: newModel.is_default,
      notes: newModel.notes || null
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add pricing model", variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Pricing model created" });
      setShowAddForm(false);
      setNewModel({
        artist_id: "", city_id: "", pricing_type: "day_session",
        rate_amount: 2500, deposit_type: "fixed", deposit_amount: 500,
        deposit_percentage: 20, is_default: false, notes: ""
      });
      fetchAll();
    }
  };

  const updatePricingModel = async (model: PricingModel) => {
    const { error } = await supabase
      .from("artist_pricing_models")
      .update({
        artist_id: model.artist_id,
        city_id: model.city_id,
        pricing_type: model.pricing_type,
        rate_amount: model.rate_amount,
        deposit_type: model.deposit_type,
        deposit_amount: model.deposit_amount,
        deposit_percentage: model.deposit_percentage,
        is_default: model.is_default,
        is_active: model.is_active,
        notes: model.notes
      })
      .eq("id", model.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Pricing model updated" });
      setEditingModel(null);
      fetchAll();
    }
  };

  const deletePricingModel = async (id: string) => {
    if (!confirm("Delete this pricing model?")) return;

    const { error } = await supabase.from("artist_pricing_models").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Pricing model removed" });
      fetchAll();
    }
  };

  const getArtistName = (artistId: string | null) => {
    if (!artistId) return "All Artists";
    const artist = artists.find(a => a.id === artistId);
    return artist?.display_name || artist?.name || "Unknown";
  };

  const getCityName = (cityId: string | null) => {
    if (!cityId) return "All Cities";
    const city = cities.find(c => c.id === cityId);
    return city?.city_name || "Unknown";
  };

  const formatRate = (model: PricingModel) => {
    switch (model.pricing_type) {
      case "hourly":
        return `$${model.rate_amount}/hr`;
      case "day_session":
        return `$${model.rate_amount}/day`;
      case "by_piece":
        return model.min_price && model.max_price 
          ? `$${model.min_price} - $${model.max_price}`
          : `$${model.rate_amount}+`;
      case "minimum":
        return `$${model.rate_amount} min`;
      default:
        return `$${model.rate_amount}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Set up pricing models: hourly, day sessions, by piece, or minimums. Link to specific artists or cities.
        </p>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Pricing
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-card border border-border space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Pricing Type</label>
                <select
                  value={newModel.pricing_type}
                  onChange={(e) => setNewModel(prev => ({ ...prev, pricing_type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                >
                  {PRICING_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.description})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Artist (optional)</label>
                <select
                  value={newModel.artist_id}
                  onChange={(e) => setNewModel(prev => ({ ...prev, artist_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                >
                  <option value="">All Artists</option>
                  {artists.map(artist => (
                    <option key={artist.id} value={artist.id}>
                      {artist.display_name || artist.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">City (optional)</label>
                <select
                  value={newModel.city_id}
                  onChange={(e) => setNewModel(prev => ({ ...prev, city_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                >
                  <option value="">All Cities</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.city_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Rate Amount ($)</label>
                <input
                  type="number"
                  value={newModel.rate_amount}
                  onChange={(e) => setNewModel(prev => ({ ...prev, rate_amount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Deposit Type</label>
                <select
                  value={newModel.deposit_type}
                  onChange={(e) => setNewModel(prev => ({ ...prev, deposit_type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {newModel.deposit_type === "fixed" ? "Deposit Amount ($)" : "Deposit (%)"}
                </label>
                <input
                  type="number"
                  value={newModel.deposit_type === "fixed" ? newModel.deposit_amount : newModel.deposit_percentage}
                  onChange={(e) => setNewModel(prev => ({
                    ...prev,
                    [prev.deposit_type === "fixed" ? "deposit_amount" : "deposit_percentage"]: Number(e.target.value)
                  }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newModel.is_default}
                  onChange={(e) => setNewModel(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded"
                />
                Set as default pricing
              </label>
            </div>

            <textarea
              placeholder="Notes (internal only)"
              value={newModel.notes}
              onChange={(e) => setNewModel(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={addPricingModel}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
              >
                <Save className="w-4 h-4" />
                Save Pricing
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Models List */}
      <div className="grid gap-3">
        {pricingModels.map((model) => (
          <div
            key={model.id}
            className={`p-4 bg-card border ${model.is_active ? "border-border" : "border-muted opacity-60"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{formatRate(model)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {PRICING_TYPES.find(t => t.value === model.pricing_type)?.label}
                    </Badge>
                    {model.is_default && (
                      <Badge variant="default" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getArtistName(model.artist_id)} • {getCityName(model.city_id)}
                    {model.deposit_amount && ` • $${model.deposit_amount} deposit`}
                    {model.deposit_percentage && ` • ${model.deposit_percentage}% deposit`}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updatePricingModel({ ...model, is_active: !model.is_active })}
                  className={`p-2 transition-colors ${
                    model.is_active ? "text-primary" : "text-muted-foreground"
                  } hover:text-foreground`}
                >
                  <Tag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingModel(model)}
                  className="p-2 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePricingModel(model.id)}
                  className="p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {pricingModels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No pricing models configured. Add your first pricing model.
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingModelsManager;
