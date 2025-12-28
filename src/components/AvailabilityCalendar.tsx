import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "./ScrollReveal";

interface AvailabilityDate {
  id: string;
  date: string;
  city: string;
  is_available: boolean;
  notes: string | null;
}

const cityColors: Record<string, { bg: string; text: string; border: string }> = {
  "Austin": { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50" },
  "Los Angeles": { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50" },
  "Houston": { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/50" },
};

const AvailabilityCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<AvailabilityDate | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth]);

  const fetchAvailability = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(addMonths(currentMonth, 2));
    
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .gte("date", format(start, "yyyy-MM-dd"))
      .lte("date", format(end, "yyyy-MM-dd"))
      .eq("is_available", true)
      .order("date", { ascending: true });

    if (!error && data) {
      setAvailability(data);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getAvailabilityForDate = (date: Date) => {
    return availability.find((a) => isSameDay(new Date(a.date), date));
  };

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  return (
    <section className="py-24 md:py-32 bg-background relative" id="availability">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-border" />
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Schedule
              </span>
              <div className="h-px w-12 bg-border" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-light text-foreground mb-4">
              Availability
            </h2>
            <p className="font-body text-muted-foreground max-w-xl mx-auto">
              See when I'm available and in which city. Book your session on a date that works for you.
            </p>
          </div>
        </ScrollReveal>

        {/* City Legend */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {Object.entries(cityColors).map(([city, colors]) => (
              <div key={city} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${colors.bg} ${colors.border} border`} />
                <span className="font-body text-sm text-muted-foreground">{city}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Calendar Navigation */}
        <ScrollReveal delay={0.2}>
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-accent/10 transition-colors rounded-lg"
              disabled={isBefore(startOfMonth(subMonths(currentMonth, 1)), startOfMonth(new Date()))}
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="font-display text-2xl text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-accent/10 transition-colors rounded-lg"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </ScrollReveal>

        {/* Calendar Grid */}
        <ScrollReveal delay={0.3}>
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-accent/5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-3 text-center font-body text-xs tracking-wider text-muted-foreground uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square border-t border-r border-border bg-background/50" />
              ))}
              {days.map((day) => {
                const availableDate = getAvailabilityForDate(day);
                const isPast = isBefore(day, new Date()) && !isToday(day);
                const colors = availableDate ? cityColors[availableDate.city] : null;

                return (
                  <motion.button
                    key={day.toISOString()}
                    onClick={() => availableDate && setSelectedDate(availableDate)}
                    disabled={!availableDate || isPast}
                    className={`
                      aspect-square border-t border-r border-border p-2 relative
                      transition-all duration-200
                      ${isPast ? "opacity-30" : ""}
                      ${availableDate && !isPast ? "cursor-pointer hover:bg-accent/10" : "cursor-default"}
                      ${isToday(day) ? "bg-foreground/5" : ""}
                    `}
                    whileHover={availableDate && !isPast ? { scale: 1.02 } : {}}
                    whileTap={availableDate && !isPast ? { scale: 0.98 } : {}}
                  >
                    <span className={`
                      font-body text-sm
                      ${isToday(day) ? "text-foreground font-medium" : "text-muted-foreground"}
                    `}>
                      {format(day, "d")}
                    </span>
                    {availableDate && colors && !isPast && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`
                          absolute bottom-2 left-1/2 -translate-x-1/2
                          px-2 py-0.5 rounded text-[10px] font-body
                          ${colors.bg} ${colors.text} ${colors.border} border
                        `}
                      >
                        {availableDate.city.split(" ")[0]}
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Selected Date Info */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 border border-border rounded-lg bg-accent/5"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-body text-foreground">
                    {format(new Date(selectedDate.date), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className={`font-body ${cityColors[selectedDate.city]?.text || "text-foreground"}`}>
                    {selectedDate.city}
                  </span>
                </div>
                {selectedDate.notes && (
                  <p className="mt-3 font-body text-sm text-muted-foreground">
                    {selectedDate.notes}
                  </p>
                )}
              </div>
              <a
                href="https://wa.me/51952141416?text=Hi%20Fernando%2C%20I%27d%20like%20to%20book%20a%20session%20on%20" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-foreground text-background font-body text-sm tracking-wider uppercase hover:bg-foreground/90 transition-colors"
              >
                Book This Date
              </a>
            </div>
          </motion.div>
        )}

        {/* Upcoming Available Dates List */}
        <ScrollReveal delay={0.4}>
          <div className="mt-12">
            <h4 className="font-display text-xl text-foreground mb-6">Upcoming Available Dates</h4>
            {availability.length > 0 ? (
              <div className="space-y-3">
                {availability.slice(0, 6).map((date) => {
                  const colors = cityColors[date.city];
                  return (
                    <div
                      key={date.id}
                      className="flex items-center justify-between p-4 border border-border hover:border-foreground/20 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded ${colors?.bg} ${colors?.text} ${colors?.border} border font-body text-sm`}>
                          {date.city}
                        </div>
                        <span className="font-body text-foreground">
                          {format(new Date(date.date), "EEEE, MMMM d")}
                        </span>
                      </div>
                      <a
                        href={`https://wa.me/51952141416?text=Hi%20Fernando%2C%20I%27d%20like%20to%20book%20a%20session%20on%20${format(new Date(date.date), "MMMM%20d")}%20in%20${date.city}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground font-body text-sm tracking-wider uppercase transition-colors"
                      >
                        Book →
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-body text-muted-foreground text-center py-8">
                No available dates posted yet. Check back soon or reach out directly.
              </p>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AvailabilityCalendar;
