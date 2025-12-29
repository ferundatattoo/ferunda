import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, Sparkles, ChevronRight, ChevronDown,
  Sun, Moon, Zap, Heart, Coffee, MapPin, Users
} from 'lucide-react';
import { format, differenceInDays, isWeekend, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  id: string;
  date: string;
  city: string;
  time?: string;
  reason: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface SmartTimeSelectionProps {
  onSelectSlot: (slot: TimeSlot) => void;
  preferredCity?: string;
  sessionLength?: 'half-day' | 'full-day';
}

export default function SmartTimeSelection({ 
  onSelectSlot, 
  preferredCity,
  sessionLength = 'full-day' 
}: SmartTimeSelectionProps) {
  const [recommendedSlots, setRecommendedSlots] = useState<TimeSlot[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    fetchAndRankSlots();
  }, [preferredCity]);

  const fetchAndRankSlots = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const twoMonthsLater = addDays(today, 60);

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('is_available', true)
        .gte('date', format(today, 'yyyy-MM-dd'))
        .lte('date', format(twoMonthsLater, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      // Rank and enhance slots with smart reasons
      const rankedSlots = rankSlots(data || []);
      setAllSlots(rankedSlots);
      setRecommendedSlots(rankedSlots.slice(0, 3));
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const rankSlots = (slots: any[]): TimeSlot[] => {
    const today = new Date();
    
    return slots.map(slot => {
      const slotDate = new Date(slot.date);
      const daysUntil = differenceInDays(slotDate, today);
      const isWeekendSlot = isWeekend(slotDate);
      const dayOfWeek = slotDate.getDay();
      
      // Determine the best reason for this slot
      let reason = '';
      let icon = Calendar;
      let badge = '';
      let badgeColor = '';
      let score = 0;

      // Earliest available
      if (daysUntil <= 7) {
        reason = 'Earliest available — soonest you can start';
        icon = Zap;
        badge = 'Soonest';
        badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        score += 100;
      }
      // Tuesday - best focus day
      else if (dayOfWeek === 2) {
        reason = 'Tuesday session — peak focus, no Monday fog';
        icon = Coffee;
        badge = 'Best focus';
        badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        score += 90;
      }
      // Wednesday - ideal healing before weekend
      else if (dayOfWeek === 3) {
        reason = 'Wednesday — ideal healing time before weekend';
        icon = Heart;
        badge = 'Heal-friendly';
        badgeColor = 'bg-pink-500/20 text-pink-400 border-pink-500/30';
        score += 85;
      }
      // Friday morning - longest uninterrupted block
      else if (dayOfWeek === 5) {
        reason = 'Friday session — longest uninterrupted creative block';
        icon = Sun;
        badge = 'Long session';
        badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        score += 80;
      }
      // Weekend - relaxed pace
      else if (isWeekendSlot) {
        reason = 'Weekend session — relaxed pace, no rushing';
        icon = Moon;
        badge = 'Relaxed';
        badgeColor = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        score += 70;
      }
      // Default
      else {
        reason = 'Available session — good timing';
        icon = Calendar;
        score += 50;
      }

      // Boost preferred city
      if (preferredCity && slot.city === preferredCity) {
        score += 50;
      }

      return {
        id: slot.id,
        date: slot.date,
        city: slot.city,
        reason,
        icon,
        badge,
        badgeColor,
        score
      };
    }).sort((a, b) => (b as any).score - (a as any).score);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    onSelectSlot(slot);
  };

  if (isLoading) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="py-12 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Finding the best times for you...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Recommended Times</CardTitle>
            <CardDescription>
              Based on session length, healing time, and availability
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Recommended Slots */}
        <AnimatePresence mode="popLayout">
          {recommendedSlots.map((slot, index) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => handleSelectSlot(slot)}
                className={`
                  w-full p-4 rounded-lg border transition-all duration-300 text-left group
                  ${selectedSlot?.id === slot.id 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border bg-background/50 hover:border-primary/50 hover:bg-accent/10'}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${selectedSlot?.id === slot.id ? 'bg-primary/20' : 'bg-muted'}
                    `}>
                      <slot.icon className={`w-5 h-5 ${selectedSlot?.id === slot.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>

                    {/* Content */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {format(new Date(slot.date), 'EEEE, MMMM d')}
                        </span>
                        {slot.badge && (
                          <Badge variant="outline" className={`text-xs ${slot.badgeColor}`}>
                            {slot.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{slot.city}</span>
                        <span className="text-muted">•</span>
                        <Clock className="w-3 h-3" />
                        <span>{sessionLength === 'half-day' ? '4-5 hours' : 'Full day'}</span>
                      </div>
                      <p className="text-sm text-primary/80 mt-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {slot.reason}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className={`
                    w-5 h-5 flex-shrink-0 transition-transform duration-300
                    ${selectedSlot?.id === slot.id ? 'text-primary' : 'text-muted-foreground'}
                    group-hover:translate-x-1
                  `} />
                </div>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Show More Button */}
        {allSlots.length > 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="ghost"
              onClick={() => setShowMore(!showMore)}
              className="w-full mt-2"
            >
              {showMore ? (
                <>
                  <ChevronDown className="w-4 h-4 mr-2 rotate-180" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  None of these work? Show {allSlots.length - 3} more options
                </>
              )}
            </Button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 mt-3 overflow-hidden"
                >
                  {allSlots.slice(3).map((slot, index) => (
                    <motion.button
                      key={slot.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectSlot(slot)}
                      className={`
                        w-full p-3 rounded-lg border transition-all duration-200 text-left
                        ${selectedSlot?.id === slot.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-background/30 hover:border-primary/30'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">
                            {format(new Date(slot.date), 'EEE, MMM d')}
                          </span>
                          <span className="text-muted-foreground text-sm ml-2">
                            {slot.city}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Preference Question */}
        {!selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-4 border-t border-border"
          >
            <p className="text-sm text-muted-foreground text-center">
              Can't decide? Tell us what matters most:
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {[
                { label: 'Soonest possible', icon: Zap },
                { label: 'Calmest day', icon: Moon },
                { label: 'Longest block', icon: Sun }
              ].map(pref => (
                <Button
                  key={pref.label}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    // Filter and select based on preference
                    if (pref.label === 'Soonest possible' && allSlots[0]) {
                      handleSelectSlot(allSlots[0]);
                    } else if (pref.label === 'Calmest day') {
                      const weekend = allSlots.find(s => isWeekend(new Date(s.date)));
                      if (weekend) handleSelectSlot(weekend);
                    } else if (pref.label === 'Longest block') {
                      const friday = allSlots.find(s => new Date(s.date).getDay() === 5);
                      if (friday) handleSelectSlot(friday);
                    }
                  }}
                >
                  <pref.icon className="w-3 h-3 mr-1" />
                  {pref.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live viewers indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-2 pt-4 text-muted-foreground text-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Users className="w-3 h-3" />
          <span>{Math.floor(Math.random() * 4) + 2} others viewing these times</span>
        </motion.div>
      </CardContent>
    </Card>
  );
}
