import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Clock, Car, Coffee, Droplets, Sun, 
  CheckCircle, ChevronRight, Shirt, CreditCard, Headphones
} from 'lucide-react';
import { format, differenceInHours, differenceInMinutes, isToday } from 'date-fns';

interface DayOfExperienceProps {
  scheduledDate: string;
  scheduledTime?: string;
  city: string;
  studioAddress?: string;
  placement?: string;
  sessionLength?: string;
  clientName?: string;
}

const PREP_CHECKLIST = [
  { id: 'hydrate', label: 'Stay hydrated today', icon: Droplets, tip: 'Drink plenty of water' },
  { id: 'meal', label: 'Eat a full meal 90min before', icon: Coffee, tip: 'Avoid alcohol' },
  { id: 'clothes', label: 'Wear comfortable clothes', icon: Shirt, tip: 'Easy access to placement area' },
  { id: 'id', label: 'Bring valid ID', icon: CreditCard, tip: 'Government issued' },
  { id: 'music', label: 'Headphones ready', icon: Headphones, tip: 'Optional but recommended' },
];

export default function DayOfExperience({
  scheduledDate,
  scheduledTime = '11:00 AM',
  city,
  studioAddress,
  placement,
  sessionLength = 'Full day',
  clientName
}: DayOfExperienceProps) {
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isSessionDay, setIsSessionDay] = useState(false);

  useEffect(() => {
    const checkIfToday = () => {
      const appointmentDate = new Date(scheduledDate);
      setIsSessionDay(isToday(appointmentDate));
    };
    checkIfToday();
  }, [scheduledDate]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const [time, period] = scheduledTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      const adjustedHours = period === 'PM' && hours !== 12 ? hours + 12 : hours;
      
      const appointmentDateTime = new Date(scheduledDate);
      appointmentDateTime.setHours(adjustedHours, minutes, 0, 0);
      
      const diff = appointmentDateTime.getTime() - now.getTime();
      
      if (diff > 0) {
        const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
        const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
        
        setCountdown({ hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft });
      } else {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduledDate, scheduledTime]);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Get placement-specific prep advice
  const getPlacementAdvice = () => {
    const advice: Record<string, string> = {
      'arm': 'Wear short sleeves or a loose tank top',
      'forearm': 'Wear short sleeves or roll-up sleeves',
      'leg': 'Wear shorts or loose pants that can roll up',
      'back': 'Wear a button-up shirt or loose top',
      'chest': 'Wear a button-up or low-cut shirt',
      'ribs': 'Wear a loose tank or bra for easy access',
      'shoulder': 'Wear a tank top or off-shoulder top',
    };
    
    const key = Object.keys(advice).find(k => 
      placement?.toLowerCase().includes(k)
    );
    return key ? advice[key] : 'Wear comfortable, loose clothing';
  };

  const allChecked = checkedItems.length === PREP_CHECKLIST.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header - Today's Session Banner */}
      <motion.div
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/30"
        initial={{ y: -20 }}
        animate={{ y: 0 }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="w-5 h-5 text-amber-400" />
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Today's Session
            </Badge>
          </div>

          <h2 className="text-2xl md:text-3xl font-display text-foreground mb-2">
            {clientName ? `${clientName}, you're all set` : 'Your session is today'}
          </h2>

          {/* Countdown */}
          <div className="flex items-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-display text-primary">
                {countdown.hours.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Hours</div>
            </div>
            <span className="text-2xl text-primary/50">:</span>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-display text-primary">
                {countdown.minutes.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Minutes</div>
            </div>
            <span className="text-2xl text-primary/50">:</span>
            <div className="text-center">
              <motion.div 
                className="text-4xl md:text-5xl font-display text-primary"
                key={countdown.seconds}
                initial={{ opacity: 0.5, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {countdown.seconds.toString().padStart(2, '0')}
              </motion.div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Seconds</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Arrival Info */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Arrival Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{scheduledTime}</p>
                <p className="text-sm text-muted-foreground">
                  Arrive 10-15 minutes early
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{city}</p>
                {studioAddress && (
                  <p className="text-sm text-muted-foreground">{studioAddress}</p>
                )}
              </div>
            </div>
          </div>

          {/* Parking/Directions */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Car className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">Street parking available nearby</p>
            </div>
            <button className="text-sm text-primary flex items-center gap-1 hover:underline">
              Get directions <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Prep Checklist */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Pre-Session Checklist</CardTitle>
            {allChecked && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                All set!
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PREP_CHECKLIST.map((item, index) => {
              const isChecked = checkedItems.includes(item.id);
              const Icon = item.icon;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200
                    ${isChecked 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-background/50 border-border hover:border-primary/30'}
                  `}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isChecked 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-muted-foreground'}
                  `}>
                    {isChecked && <CheckCircle className="w-4 h-4 text-background" />}
                  </div>
                  
                  <Icon className={`w-5 h-5 ${isChecked ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                  
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.tip}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Placement-specific advice */}
          {placement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <Shirt className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">For your {placement} tattoo:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getPlacementAdvice()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Calm Reminder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center p-6 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-blue-500/10 rounded-xl border border-border"
      >
        <p className="text-lg font-display text-foreground">
          {allChecked ? (
            "You're ready. Take a deep breath and enjoy the experience ✨"
          ) : (
            "Hydrated, fed, and ready — you're all set 🎨"
          )}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Any questions? Reach out in the Messages tab
        </p>
      </motion.div>
    </motion.div>
  );
}
