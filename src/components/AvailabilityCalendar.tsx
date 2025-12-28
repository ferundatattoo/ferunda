import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Clock, Sparkles, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isBefore, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "./ScrollReveal";

interface AvailabilityDate {
  id: string;
  date: string;
  city: string;
  is_available: boolean;
  notes: string | null;
}

const cityColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  "Austin": { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50", glow: "shadow-emerald-500/20" },
  "Los Angeles": { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/50", glow: "shadow-amber-500/20" },
  "Houston": { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/50", glow: "shadow-sky-500/20" },
};

const AvailabilityCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<AvailabilityDate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth]);

  const fetchAvailability = async () => {
    setIsLoading(true);
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
    setIsLoading(false);
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

  // Urgency calculations
  const upcomingDates = availability.filter(d => !isBefore(new Date(d.date), new Date()));
  const spotsThisMonth = upcomingDates.filter(d => {
    const date = new Date(d.date);
    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
  }).length;

  const getUrgencyLabel = (date: AvailabilityDate) => {
    const daysUntil = differenceInDays(new Date(date.date), new Date());
    if (daysUntil <= 7) return { text: "This week", urgent: true };
    if (daysUntil <= 14) return { text: "Limited", urgent: true };
    return null;
  };

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden" id="availability">
      {/* Luxury background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Limited Availability
              </span>
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-light text-foreground mb-4">
              Book Your Session
            </h2>
            <p className="font-body text-muted-foreground max-w-xl mx-auto mb-8">
              I take only one client per day to ensure your piece receives my complete, undivided attention.
            </p>
            
            {/* Urgency Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 rounded-sm"
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="font-body text-sm text-amber-300">
                {spotsThisMonth > 0 
                  ? `Only ${spotsThisMonth} spot${spotsThisMonth > 1 ? 's' : ''} remaining this month`
                  : "Check next month for availability"
                }
              </span>
            </motion.div>
          </div>
        </ScrollReveal>

        {/* City Legend with availability count */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {Object.entries(cityColors).map(([city, colors]) => {
              const cityCount = upcomingDates.filter(d => d.city === city).length;
              return (
                <div key={city} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border shadow-lg ${colors.glow}`} />
                  <span className="font-body text-sm text-muted-foreground">{city}</span>
                  <span className={`text-xs ${colors.text}`}>({cityCount})</span>
                </div>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Calendar Navigation */}
        <ScrollReveal delay={0.2}>
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-3 hover:bg-accent/10 transition-colors rounded-lg border border-transparent hover:border-border"
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
              className="p-3 hover:bg-accent/10 transition-colors rounded-lg border border-transparent hover:border-border"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </ScrollReveal>

        {/* Calendar Grid */}
        <ScrollReveal delay={0.3}>
          <div className="border border-border rounded-lg overflow-hidden bg-card/50 backdrop-blur-sm">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-accent/5 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-3 text-center font-body text-xs tracking-wider text-muted-foreground uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square border-t border-r border-border bg-background/30" />
              ))}
              {days.map((day) => {
                const availableDate = getAvailabilityForDate(day);
                const isPast = isBefore(day, new Date()) && !isToday(day);
                const colors = availableDate ? cityColors[availableDate.city] : null;
                const urgency = availableDate ? getUrgencyLabel(availableDate) : null;

                return (
                  <motion.button
                    key={day.toISOString()}
                    onClick={() => availableDate && setSelectedDate(availableDate)}
                    disabled={!availableDate || isPast}
                    className={`
                      aspect-square border-t border-r border-border p-2 relative
                      transition-all duration-300 group
                      ${isPast ? "opacity-30 bg-background/30" : "bg-background/50"}
                      ${availableDate && !isPast ? "cursor-pointer hover:bg-accent/20 hover:shadow-inner" : "cursor-default"}
                      ${isToday(day) ? "bg-foreground/5 ring-1 ring-inset ring-foreground/20" : ""}
                      ${selectedDate?.date === format(day, "yyyy-MM-dd") ? "bg-accent/30 ring-1 ring-foreground/30" : ""}
                    `}
                    whileHover={availableDate && !isPast ? { scale: 1.02 } : {}}
                    whileTap={availableDate && !isPast ? { scale: 0.98 } : {}}
                  >
                    <span className={`
                      font-body text-sm
                      ${isToday(day) ? "text-foreground font-medium" : "text-muted-foreground"}
                      ${availableDate && !isPast ? "group-hover:text-foreground transition-colors" : ""}
                    `}>
                      {format(day, "d")}
                    </span>
                    {availableDate && colors && !isPast && (
                      <>
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`
                            absolute bottom-1.5 left-1/2 -translate-x-1/2
                            px-1.5 py-0.5 rounded text-[9px] font-body whitespace-nowrap
                            ${colors.bg} ${colors.text} ${colors.border} border
                            shadow-lg ${colors.glow}
                          `}
                        >
                          {availableDate.city.split(" ")[0]}
                        </motion.div>
                        {urgency?.urgent && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"
                          />
                        )}
                      </>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* Selected Date Info */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mt-8 overflow-hidden"
            >
              <div className={`p-6 border rounded-lg bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm ${cityColors[selectedDate.city]?.border || "border-border"}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-display text-lg text-foreground">
                        {format(new Date(selectedDate.date), "EEEE, MMMM d, yyyy")}
                      </span>
                      {getUrgencyLabel(selectedDate)?.urgent && (
                        <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                          {getUrgencyLabel(selectedDate)?.text}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className={`font-body ${cityColors[selectedDate.city]?.text || "text-foreground"}`}>
                        {selectedDate.city}
                      </span>
                    </div>
                    {selectedDate.notes && (
                      <p className="mt-2 font-body text-sm text-muted-foreground italic">
                        {selectedDate.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="font-body text-xs">Full day session • $500 deposit to secure</span>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/51952141416?text=Hi%20Fernando%2C%20I%27d%20like%20to%20book%20a%20session%20on%20${format(new Date(selectedDate.date), "MMMM%20d")}%20in%20${selectedDate.city}.%20Please%20let%20me%20know%20how%20to%20proceed%20with%20the%20deposit.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative px-6 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase overflow-hidden transition-all hover:shadow-lg hover:shadow-foreground/20"
                  >
                    <span className="relative z-10">Secure This Date</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming Available Dates List */}
        <ScrollReveal delay={0.4}>
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-display text-xl text-foreground">Next Available Sessions</h4>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4" />
                <span className="font-body text-xs uppercase tracking-wider">Book now to secure your spot</span>
              </div>
            </div>
            {upcomingDates.length > 0 ? (
              <div className="space-y-3">
                {upcomingDates.slice(0, 5).map((date, index) => {
                  const colors = cityColors[date.city];
                  const urgency = getUrgencyLabel(date);
                  return (
                    <motion.div
                      key={date.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`group flex items-center justify-between p-4 border ${colors?.border || "border-border"} bg-card/30 backdrop-blur-sm hover:bg-card/60 transition-all duration-300 hover:shadow-lg ${colors?.glow || ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-background/50 border border-border">
                          <span className="font-display text-lg text-foreground leading-none">
                            {format(new Date(date.date), "d")}
                          </span>
                          <span className="font-body text-[10px] text-muted-foreground uppercase">
                            {format(new Date(date.date), "MMM")}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-body border ${colors?.bg} ${colors?.text} ${colors?.border}`}>
                              {date.city}
                            </span>
                            {urgency?.urgent && (
                              <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider animate-pulse">
                                {urgency.text}
                              </span>
                            )}
                          </div>
                          <span className="font-body text-sm text-muted-foreground">
                            {format(new Date(date.date), "EEEE")}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`https://wa.me/51952141416?text=Hi%20Fernando%2C%20I%27d%20like%20to%20book%20a%20session%20on%20${format(new Date(date.date), "MMMM%20d")}%20in%20${date.city}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-foreground/20 text-foreground/70 font-body text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-all duration-300"
                      >
                        Book Now
                      </a>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-body text-muted-foreground">
                  No available dates posted yet.
                </p>
                <a
                  href="https://wa.me/51952141416?text=Hi%20Fernando%2C%20I%27m%20interested%20in%20booking%20a%20session.%20When%20is%20your%20next%20availability?"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-4 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
                >
                  Ask About Availability
                </a>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Luxury/Exclusivity Message */}
        <ScrollReveal delay={0.5}>
          <div className="mt-16 text-center">
            <div className="inline-block p-8 border border-border/50 bg-gradient-to-b from-card/30 to-transparent">
              <Sparkles className="w-6 h-6 text-muted-foreground mx-auto mb-4" />
              <p className="font-display text-lg text-foreground mb-2">One Client. One Day. One Masterpiece.</p>
              <p className="font-body text-sm text-muted-foreground max-w-md">
                Each session is an intimate experience. I dedicate my full creative energy to your piece, 
                ensuring every detail reflects your story with the precision it deserves.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AvailabilityCalendar;
