import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Heart, Droplets, AlertCircle, CheckCircle, ChevronRight,
  Camera, Sparkles, ThermometerSun, Shield, Calendar, Clock
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface HealingJourneyCardsProps {
  sessionDate: string;
  latestHealthScore?: number;
  latestStage?: string;
  onUploadPhoto?: () => void;
}

interface HealingDay {
  day: number;
  title: string;
  subtitle: string;
  whatsNormal: string[];
  whatsNot: string[];
  oneAction: string;
  icon: any;
  color: string;
}

const HEALING_JOURNEY: HealingDay[] = [
  {
    day: 1,
    title: 'Fresh Ink Day',
    subtitle: 'The beginning of your healing journey',
    whatsNormal: [
      'Redness and slight swelling around the tattoo',
      'Some oozing of plasma and excess ink',
      'Tender to the touch, like a mild sunburn'
    ],
    whatsNot: [
      'Excessive bleeding that doesn\'t stop',
      'Intense heat radiating from the area',
      'Signs of allergic reaction (hives, difficulty breathing)'
    ],
    oneAction: 'Keep the bandage on for 2-4 hours as instructed',
    icon: Sparkles,
    color: 'rose'
  },
  {
    day: 3,
    title: 'Peeling Begins',
    subtitle: 'Your skin is starting to renew itself',
    whatsNormal: [
      'Light peeling similar to a sunburn',
      'Tightness and mild itching',
      'Colors may appear slightly faded or "milky"'
    ],
    whatsNot: [
      'Thick scabbing or raised crusty areas',
      'Pus or yellow/green discharge',
      'Spreading redness beyond the tattoo area'
    ],
    oneAction: 'Apply a thin layer of fragrance-free moisturizer 2-3x daily',
    icon: ThermometerSun,
    color: 'orange'
  },
  {
    day: 7,
    title: 'Peak Peeling',
    subtitle: 'The itchiest part — stay strong!',
    whatsNormal: [
      'Significant peeling and flaking',
      'Intense itching (resist the urge to scratch!)',
      'Tattoo may look patchy as old skin sheds'
    ],
    whatsNot: [
      'Open sores or wounds appearing',
      'Fever or chills',
      'Pain increasing instead of decreasing'
    ],
    oneAction: 'Gently pat with a clean hand if it itches — never scratch or pick',
    icon: Shield,
    color: 'amber'
  },
  {
    day: 14,
    title: 'New Skin Forming',
    subtitle: 'Your tattoo is settling in',
    whatsNormal: [
      'Peeling mostly complete',
      'Skin feels slightly dry or tight',
      'Colors starting to look more vibrant again'
    ],
    whatsNot: [
      'Persistent redness or warmth',
      'Any signs of infection',
      'Ink appearing to "fall out" in chunks'
    ],
    oneAction: 'Continue moisturizing and keep out of direct sunlight',
    icon: Heart,
    color: 'blue'
  },
  {
    day: 30,
    title: 'Fully Healed',
    subtitle: 'Congratulations! Your art is complete',
    whatsNormal: [
      'Skin feels normal to the touch',
      'Colors are vibrant and settled',
      'No more dryness or flaking'
    ],
    whatsNot: [
      'Raised or bumpy texture (may indicate scarring)',
      'Significant color loss',
      'Allergic reactions can still occur, even weeks later'
    ],
    oneAction: 'Always apply sunscreen (SPF 30+) to protect your art from fading',
    icon: CheckCircle,
    color: 'emerald'
  }
];

export default function HealingJourneyCards({
  sessionDate,
  latestHealthScore,
  latestStage,
  onUploadPhoto
}: HealingJourneyCardsProps) {
  const [currentDay, setCurrentDay] = useState(1);
  const [activeCard, setActiveCard] = useState<HealingDay | null>(null);

  useEffect(() => {
    const daysSince = differenceInDays(new Date(), new Date(sessionDate));
    setCurrentDay(Math.max(1, daysSince));
    
    // Find the appropriate card for current day
    const relevantCard = HEALING_JOURNEY.reduce((prev, curr) => {
      if (daysSince >= curr.day) return curr;
      return prev;
    }, HEALING_JOURNEY[0]);
    
    setActiveCard(relevantCard);
  }, [sessionDate]);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
      orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
      amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
      blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    };
    return colors[color] || colors.blue;
  };

  const progressPercent = Math.min((currentDay / 30) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="border-border bg-card/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Day {currentDay} of Healing</p>
                <p className="text-sm text-muted-foreground">
                  {currentDay >= 30 ? 'Fully healed! 🎉' : `${30 - currentDay} days to go`}
                </p>
              </div>
            </div>
            {latestHealthScore && (
              <Badge className={`${latestHealthScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                Health Score: {latestHealthScore}%
              </Badge>
            )}
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          {/* Stage indicators */}
          <div className="flex justify-between mt-3">
            {HEALING_JOURNEY.map((stage, index) => (
              <div 
                key={stage.day}
                className={`text-xs ${currentDay >= stage.day ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Day {stage.day}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Stage Card */}
      {activeCard && (
        <motion.div
          key={activeCard.day}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={`border-2 ${getColorClasses(activeCard.color).border} bg-card/50 overflow-hidden`}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${getColorClasses(activeCard.color).bg} flex items-center justify-center`}>
                    <activeCard.icon className={`w-6 h-6 ${getColorClasses(activeCard.color).text}`} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{activeCard.title}</CardTitle>
                    <CardDescription>{activeCard.subtitle}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={getColorClasses(activeCard.color).text}>
                  Day {activeCard.day}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* What's Normal */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">What's Normal Today</h4>
                </div>
                <ul className="space-y-2">
                  {activeCard.whatsNormal.map((item, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* What's Not Normal */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">Watch Out For</h4>
                </div>
                <ul className="space-y-2">
                  {activeCard.whatsNot.map((item, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* One Action */}
              <motion.div 
                className={`p-4 rounded-lg ${getColorClasses(activeCard.color).bg} border ${getColorClasses(activeCard.color).border}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className={`w-4 h-4 ${getColorClasses(activeCard.color).text}`} />
                  <h4 className="font-medium text-sm">Your One Action Today</h4>
                </div>
                <p className={`text-sm ${getColorClasses(activeCard.color).text}`}>
                  {activeCard.oneAction}
                </p>
              </motion.div>

              {/* Photo Check-in CTA */}
              {onUploadPhoto && (
                <Button 
                  onClick={onUploadPhoto}
                  className="w-full"
                  variant="outline"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Today's Photo Check-in
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timeline Preview */}
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Your Healing Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1">
            {HEALING_JOURNEY.map((stage, index) => {
              const isActive = currentDay >= stage.day;
              const isCurrent = activeCard?.day === stage.day;
              const colors = getColorClasses(stage.color);
              
              return (
                <motion.button
                  key={stage.day}
                  onClick={() => setActiveCard(stage)}
                  className={`
                    flex-1 py-2 px-1 rounded transition-all duration-200
                    ${isCurrent ? `${colors.bg} ${colors.border} border-2` : isActive ? 'bg-muted' : 'bg-muted/30'}
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="text-center">
                    <p className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      Day {stage.day}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {stage.title.split(' ')[0]}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Medical Disclaimer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-muted-foreground text-center px-4"
      >
        ⚠️ If you experience excessive redness, heat, pus, or fever, please contact your artist or a medical professional immediately.
      </motion.p>
    </div>
  );
}
