import { motion } from 'framer-motion';
import { 
  Calendar, Clock, MapPin, CreditCard, MessageSquare, 
  RefreshCw, Loader2, Check, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';

interface PortalSessionTabProps {
  booking: any;
  payments: any[];
  onRequestReschedule: (reason: string) => Promise<any>;
  canReschedule: boolean;
}

export default function PortalSessionTab({ 
  booking, 
  payments,
  onRequestReschedule,
  canReschedule
}: PortalSessionTabProps) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReschedule = async () => {
    if (rescheduleReason.trim().length < 10) {
      toast.error('Please provide a reason (minimum 10 characters)');
      return;
    }
    
    setIsSubmitting(true);
    const result = await onRequestReschedule(rescheduleReason);
    setIsSubmitting(false);
    
    if (result.success) {
      toast.success('Reschedule request sent');
      setRescheduleReason('');
      setShowReschedule(false);
    } else {
      toast.error(result.error || 'Could not send request');
    }
  };

  // Calculate deposit status
  const depositRequired = booking?.deposit_amount || 500;
  const totalPaid = booking?.total_paid || 0;
  const depositPaid = booking?.deposit_paid || totalPaid >= depositRequired;
  const sessionRate = booking?.session_rate || 2500;
  const remaining = sessionRate - totalPaid;

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl text-foreground mb-2">Session</h2>
        <div className="w-16 h-px bg-border mx-auto" />
      </div>

      {/* Appointment Details */}
      {booking?.scheduled_date ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-primary" />
          </div>
          
          <p className="font-display text-3xl text-foreground mb-2">
            {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          
          <p className="text-xl text-muted-foreground font-body mb-4">
            {booking.scheduled_time || '1:00 PM'}
          </p>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="font-body">{booking.requested_city || 'Location to be confirmed'}</span>
          </div>
          
          <Badge className="mt-4" variant="outline">
            {booking.pipeline_stage === 'scheduled' ? 'Confirmed' : booking.pipeline_stage}
          </Badge>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="font-display text-xl text-foreground mb-2">Pending scheduling</p>
          <p className="text-muted-foreground font-body">
            I'll reach out soon to confirm your date and time.
          </p>
        </motion.div>
      )}

      {/* Divider */}
      <div className="w-full h-px bg-border" />

      {/* Payment Summary */}
      <section>
        <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
          Payment
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground font-body">Deposit</span>
            <div className="flex items-center gap-2">
              <span className="font-body">${depositRequired}</span>
              {depositPaid && <Check className="w-4 h-4 text-primary" />}
            </div>
          </div>
          
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <span className="text-muted-foreground font-body">Paid to date</span>
            <span className="font-body text-primary">${totalPaid}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-t border-border/50">
            <span className="text-muted-foreground font-body">Estimated total</span>
            <span className="font-body">${sessionRate}</span>
          </div>
          
          <div className="flex items-center justify-between py-3 border-t border-border">
            <span className="font-medium text-foreground">Balance remaining</span>
            <span className="font-display text-xl text-foreground">${remaining}</span>
          </div>
        </div>
      </section>

      {/* Payment History */}
      {payments.length > 0 && (
        <section>
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
            Payment History
          </h3>
          
          <div className="space-y-2">
            {payments.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    payment.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {payment.status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-body text-foreground capitalize">{payment.payment_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <span className="font-body text-foreground">${payment.amount}</span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Reschedule */}
      {canReschedule && booking?.scheduled_date && (
        <section className="pt-4 border-t border-border">
          {!showReschedule ? (
            <button
              onClick={() => setShowReschedule(true)}
              className="w-full flex items-center justify-between py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4" />
                <span className="font-body">Request date change</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Reschedule requests must be made at least 48 hours before your session.
              </p>
              
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Please explain why you need to reschedule..."
                rows={3}
                className="resize-none bg-background"
                maxLength={500}
              />
              
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowReschedule(false)}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleReschedule}
                  disabled={rescheduleReason.length < 10 || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}
                </Button>
              </div>
            </motion.div>
          )}
        </section>
      )}
    </div>
  );
}
