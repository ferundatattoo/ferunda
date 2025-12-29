import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Circle, Clock, Calendar, AlertCircle } from 'lucide-react';

interface PortalPreparationTabProps {
  booking: any;
}

const PREPARATION_ITEMS = [
  {
    id: 'id',
    text: 'Bring valid ID',
    description: 'Government-issued photo identification is required.',
    category: 'essentials'
  },
  {
    id: 'eat',
    text: 'Eat beforehand',
    description: 'Have a full meal 1-2 hours before your session.',
    category: 'essentials'
  },
  {
    id: 'clothing',
    text: 'Wear appropriate clothing',
    description: 'Ensure easy access to the tattoo area. Dark, comfortable clothes recommended.',
    category: 'essentials'
  },
  {
    id: 'hydrate',
    text: 'Stay hydrated',
    description: 'Drink plenty of water in the days leading up to your session.',
    category: 'before'
  },
  {
    id: 'sleep',
    text: 'Get adequate rest',
    description: 'A full night\'s sleep helps your body handle the session better.',
    category: 'before'
  },
  {
    id: 'alcohol',
    text: 'Avoid alcohol 24 hours prior',
    description: 'Alcohol thins blood and can affect the healing process.',
    category: 'avoid'
  },
  {
    id: 'caffeine',
    text: 'Limit caffeine on session day',
    description: 'Excess caffeine can increase sensitivity.',
    category: 'avoid'
  },
  {
    id: 'sunburn',
    text: 'No sunburn on tattoo area',
    description: 'Protect the area from sun exposure for at least 2 weeks before.',
    category: 'avoid'
  }
];

export default function PortalPreparationTab({ booking }: PortalPreparationTabProps) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const essentials = PREPARATION_ITEMS.filter(i => i.category === 'essentials');
  const before = PREPARATION_ITEMS.filter(i => i.category === 'before');
  const avoid = PREPARATION_ITEMS.filter(i => i.category === 'avoid');

  // Calculate days until appointment
  const daysUntil = booking?.scheduled_date 
    ? Math.ceil((new Date(booking.scheduled_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl text-foreground mb-2">Preparation</h2>
        <div className="w-16 h-px bg-border mx-auto mb-4" />
        {daysUntil !== null && daysUntil > 0 && (
          <p className="text-muted-foreground font-body">
            {daysUntil} {daysUntil === 1 ? 'day' : 'days'} until your session
          </p>
        )}
      </div>

      {/* Appointment Card */}
      {booking?.scheduled_date && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-muted/30 rounded-lg border border-border/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-display text-xl text-foreground">
                {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-muted-foreground font-body">
                {booking.scheduled_time || '1:00 PM'} • {booking.requested_city || 'Studio'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Essentials Section */}
      <section>
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
          Essentials
        </h3>
        <div className="space-y-1">
          {essentials.map((item, index) => (
            <ChecklistItem
              key={item.id}
              item={item}
              isChecked={checkedItems.includes(item.id)}
              onToggle={() => toggleItem(item.id)}
              delay={index * 0.05}
            />
          ))}
        </div>
      </section>

      {/* Before Your Session */}
      <section>
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
          Days Before
        </h3>
        <div className="space-y-1">
          {before.map((item, index) => (
            <ChecklistItem
              key={item.id}
              item={item}
              isChecked={checkedItems.includes(item.id)}
              onToggle={() => toggleItem(item.id)}
              delay={index * 0.05}
            />
          ))}
        </div>
      </section>

      {/* Things to Avoid */}
      <section>
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Avoid
        </h3>
        <div className="space-y-1">
          {avoid.map((item, index) => (
            <ChecklistItem
              key={item.id}
              item={item}
              isChecked={checkedItems.includes(item.id)}
              onToggle={() => toggleItem(item.id)}
              delay={index * 0.05}
              variant="warning"
            />
          ))}
        </div>
      </section>

      {/* Progress */}
      <div className="pt-8 border-t border-border/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {checkedItems.length} of {PREPARATION_ITEMS.length} completed
          </span>
          <span className="text-muted-foreground">
            {Math.round((checkedItems.length / PREPARATION_ITEMS.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface ChecklistItemProps {
  item: { id: string; text: string; description: string };
  isChecked: boolean;
  onToggle: () => void;
  delay: number;
  variant?: 'default' | 'warning';
}

function ChecklistItem({ item, isChecked, onToggle, delay, variant = 'default' }: ChecklistItemProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onToggle}
      className={`w-full flex items-start gap-4 p-4 -mx-4 hover:bg-muted/30 transition-colors text-left ${
        isChecked ? 'opacity-60' : ''
      }`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
        isChecked 
          ? 'bg-primary border-primary' 
          : variant === 'warning' 
            ? 'border-orange-500/50' 
            : 'border-border'
      }`}>
        {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
      <div>
        <p className={`font-body text-foreground ${isChecked ? 'line-through' : ''}`}>
          {item.text}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {item.description}
        </p>
      </div>
    </motion.button>
  );
}
