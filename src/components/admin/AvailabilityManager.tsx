import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface AvailabilityDate {
  id: string;
  date: string;
  city: string;
  is_available: boolean;
  notes: string | null;
}

interface AvailabilityManagerProps {
  dates: AvailabilityDate[];
  loading: boolean;
  onAdd: (date: string, city: string, notes: string) => Promise<void>;
  onDelete: (id: string) => void;
}

const AvailabilityManager = ({ 
  dates, 
  loading, 
  onAdd, 
  onDelete 
}: AvailabilityManagerProps) => {
  const [newDate, setNewDate] = useState("");
  const [newCity, setNewCity] = useState<"Austin" | "Los Angeles" | "Houston">("Austin");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [filterCity, setFilterCity] = useState<string>("all");
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newDate) {
      setAddError("Selecciona una fecha");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await onAdd(newDate, newCity, newNotes);
      // Only clear on success
      setNewDate("");
      setNewNotes("");
      setAddError(null);
    } catch (e: any) {
      // Keep inputs populated, show real error
      setAddError(e.message || "Error desconocido al agregar fecha");
    } finally {
      setAdding(false);
    }
  };

  const filteredDates = dates.filter(date => 
    filterCity === "all" || date.city === filterCity
  );

  const upcomingDates = filteredDates.filter(d => new Date(d.date) >= new Date());
  const pastDates = filteredDates.filter(d => new Date(d.date) < new Date());

  const cityColors: Record<string, { bg: string; text: string; border: string }> = {
    "Austin": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    "Los Angeles": { bg: "bg-gold/10", text: "text-gold", border: "border-gold/20" },
    "Houston": { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/20" },
  };

  const cityCounts = {
    all: dates.length,
    Austin: dates.filter(d => d.city === "Austin").length,
    "Los Angeles": dates.filter(d => d.city === "Los Angeles").length,
    Houston: dates.filter(d => d.city === "Houston").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20">
              <Calendar className="w-6 h-6 text-gold" />
            </div>
            <div className="absolute inset-0 blur-xl bg-gold/20 -z-10" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-light text-foreground tracking-tight">
              Availability Calendar
            </h1>
            <p className="font-body text-sm text-muted-foreground mt-0.5">
              Manage your available dates for each city
            </p>
          </div>
        </div>
        
        {/* Decorative line */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-6 h-px bg-gradient-to-r from-gold/50 via-border to-transparent origin-left"
        />
      </div>

      {/* Add New Date Form */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-card to-background border border-border/50 p-6"
      >
        {/* Header glow */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gold/5 to-transparent pointer-events-none" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-gold" />
            </div>
            <h3 className="font-display text-xl font-light text-foreground">
              Add Available Date
            </h3>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block font-body text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="w-full px-4 py-3 bg-background border border-border/50 text-foreground font-body focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div>
              <label className="block font-body text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
                City
              </label>
              <select
                value={newCity}
                onChange={(e) => setNewCity(e.target.value as typeof newCity)}
                className="w-full px-4 py-3 bg-background border border-border/50 text-foreground font-body focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="Austin">Austin, TX</option>
                <option value="Los Angeles">Los Angeles, CA</option>
                <option value="Houston">Houston, TX</option>
              </select>
            </div>
            <div>
              <label className="block font-body text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Notes (optional)
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g., Morning only"
                className="w-full px-4 py-3 bg-background border border-border/50 text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/50 transition-colors"
              />
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleAdd}
                disabled={adding || !newDate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gold to-amber-500 text-primary-foreground font-body text-xs uppercase tracking-[0.2em] hover:shadow-gold transition-all duration-300 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Date
              </button>
              {addError && (
                <div className="w-full p-2 bg-destructive/10 border border-destructive/30 rounded">
                  <p className="text-xs text-destructive">{addError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* City Filter */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(cityCounts).map(([city, count]) => (
          <motion.button
            key={city}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setFilterCity(city)}
            className={`px-4 py-2 font-body text-xs uppercase tracking-[0.15em] transition-all duration-300 border ${
              filterCity === city
                ? "bg-gradient-to-r from-gold/20 to-gold/10 text-gold border-gold/30"
                : "bg-transparent text-muted-foreground border-border/50 hover:text-foreground hover:border-gold/30"
            }`}
          >
            {city === "all" ? "All Cities" : city} ({count})
          </motion.button>
        ))}
      </div>

      {/* Availability List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading availability...</p>
          </div>
        </div>
      ) : filteredDates.length === 0 ? (
        <div className="text-center py-20 border border-border/50 bg-gradient-to-br from-card to-background">
          <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-body text-muted-foreground">
            No availability dates added yet
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Dates */}
          {upcomingDates.length > 0 && (
            <div>
              <h3 className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-gold" />
                Upcoming Dates ({upcomingDates.length})
              </h3>
              <div className="space-y-2">
                {upcomingDates.map((date, index) => {
                  const colors = cityColors[date.city] || cityColors["Austin"];
                  return (
                    <motion.div
                      key={date.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="relative group flex items-center justify-between p-4 bg-gradient-to-br from-card to-background border border-border/50 hover:border-gold/30 transition-all duration-300 overflow-hidden"
                    >
                      {/* Hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-r from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="w-10 h-10 bg-gold/10 border border-gold/20 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                          <p className="font-body text-foreground group-hover:text-gold transition-colors">
                            {format(new Date(date.date), "EEEE, MMMM d, yyyy")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-body border ${colors.bg} ${colors.text} ${colors.border}`}>
                              {date.city}
                            </span>
                            {date.notes && (
                              <span className="font-body text-xs text-muted-foreground">
                                {date.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(date.id)}
                        className="relative z-10 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Dates */}
          {pastDates.length > 0 && (
            <div>
              <h3 className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">
                Past Dates ({pastDates.length})
              </h3>
              <div className="space-y-2 opacity-50">
                {pastDates.slice(0, 5).map((date) => {
                  const colors = cityColors[date.city] || cityColors["Austin"];
                  return (
                    <div
                      key={date.id}
                      className="flex items-center justify-between p-4 border border-border/30 bg-secondary/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted/30 border border-border/30 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-body text-muted-foreground">
                            {format(new Date(date.date), "EEEE, MMMM d, yyyy")}
                          </p>
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-body border opacity-50 ${colors.bg} ${colors.text} ${colors.border}`}>
                            {date.city}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(date.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilityManager;