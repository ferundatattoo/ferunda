import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Plus,
  Trash2,
  Loader2,
  MapPin
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

  const handleAdd = async () => {
    if (!newDate) return;
    setAdding(true);
    await onAdd(newDate, newCity, newNotes);
    setNewDate("");
    setNewNotes("");
    setAdding(false);
  };

  const filteredDates = dates.filter(date => 
    filterCity === "all" || date.city === filterCity
  );

  const upcomingDates = filteredDates.filter(d => new Date(d.date) >= new Date());
  const pastDates = filteredDates.filter(d => new Date(d.date) < new Date());

  const cityColors: Record<string, string> = {
    "Austin": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Los Angeles": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "Houston": "bg-sky-500/20 text-sky-400 border-sky-500/30",
  };

  const cityCounts = {
    all: dates.length,
    Austin: dates.filter(d => d.city === "Austin").length,
    "Los Angeles": dates.filter(d => d.city === "Los Angeles").length,
    Houston: dates.filter(d => d.city === "Houston").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-light text-foreground">
          Availability Calendar
        </h1>
        <p className="font-body text-muted-foreground mt-1">
          Manage your available dates for each city
        </p>
      </div>

      {/* Add New Date Form */}
      <div className="border border-border p-6">
        <h3 className="font-display text-xl font-light text-foreground mb-4">
          Add Available Date
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block font-body text-sm text-muted-foreground mb-2">
              Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
              className="w-full px-4 py-3 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
            />
          </div>
          <div>
            <label className="block font-body text-sm text-muted-foreground mb-2">
              City
            </label>
            <select
              value={newCity}
              onChange={(e) => setNewCity(e.target.value as typeof newCity)}
              className="w-full px-4 py-3 bg-background border border-border text-foreground font-body focus:outline-none focus:border-foreground/50"
            >
              <option value="Austin">Austin, TX</option>
              <option value="Los Angeles">Los Angeles, CA</option>
              <option value="Houston">Houston, TX</option>
            </select>
          </div>
          <div>
            <label className="block font-body text-sm text-muted-foreground mb-2">
              Notes (optional)
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g., Morning only"
              className="w-full px-4 py-3 bg-background border border-border text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:border-foreground/50"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAdd}
              disabled={adding || !newDate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-foreground text-background font-body text-sm tracking-wider uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Date
            </button>
          </div>
        </div>
      </div>

      {/* City Filter */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(cityCounts).map(([city, count]) => (
          <button
            key={city}
            onClick={() => setFilterCity(city)}
            className={`px-4 py-2 font-body text-sm transition-colors border ${
              filterCity === city
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/50"
            }`}
          >
            {city === "all" ? "All Cities" : city} ({count})
          </button>
        ))}
      </div>

      {/* Availability List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDates.length === 0 ? (
        <div className="text-center py-20 border border-border">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground">
            No availability dates added yet
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Dates */}
          {upcomingDates.length > 0 && (
            <div>
              <h3 className="font-body text-sm uppercase tracking-wider text-muted-foreground mb-3">
                Upcoming Dates ({upcomingDates.length})
              </h3>
              <div className="space-y-2">
                {upcomingDates.map((date, index) => (
                  <motion.div
                    key={date.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border border-border hover:border-foreground/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-body text-foreground">
                          {format(new Date(date.date), "EEEE, MMMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-xs font-body border ${cityColors[date.city]}`}>
                            {date.city}
                          </span>
                          {date.notes && (
                            <span className="font-body text-sm text-muted-foreground">
                              {date.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(date.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Past Dates */}
          {pastDates.length > 0 && (
            <div>
              <h3 className="font-body text-sm uppercase tracking-wider text-muted-foreground mb-3">
                Past Dates ({pastDates.length})
              </h3>
              <div className="space-y-2 opacity-50">
                {pastDates.slice(0, 5).map((date) => (
                  <div
                    key={date.id}
                    className="flex items-center justify-between p-4 border border-border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent/50 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-body text-muted-foreground">
                          {format(new Date(date.date), "EEEE, MMMM d, yyyy")}
                        </p>
                        <span className={`px-2 py-0.5 text-xs font-body border opacity-50 ${cityColors[date.city]}`}>
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AvailabilityManager;
