import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import GrokChatPanel from './GrokChatPanel';
import { eventBus } from '@/lib/eventBus';

interface GrokFloatingAssistantProps {
  className?: string;
  defaultOpen?: boolean;
}

export function GrokFloatingAssistant({ className, defaultOpen = false }: GrokFloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasNotification, setHasNotification] = useState(false);
  const [context, setContext] = useState<Record<string, any>>({});
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Listen for events that might need Grok's attention
  useEffect(() => {
    const unsubscribers = [
      eventBus.on('message:received', ({ conversationId, channel, content }) => {
        if (!isOpen) {
          setHasNotification(true);
          setPulseAnimation(true);
          setTimeout(() => setPulseAnimation(false), 3000);
        }
        setContext((prev) => ({
          ...prev,
          lastMessage: { conversationId, channel, content },
        }));
      }),
      eventBus.on('escalation:created', ({ requestId, reason }) => {
        if (!isOpen) {
          setHasNotification(true);
          setPulseAnimation(true);
        }
        setContext((prev) => ({
          ...prev,
          lastEscalation: { requestId, reason },
        }));
      }),
      eventBus.on('booking:created', ({ bookingId, clientEmail }) => {
        setContext((prev) => ({
          ...prev,
          lastBooking: { bookingId, clientEmail },
        }));
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasNotification(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed bottom-6 right-6 z-40",
              className
            )}
          >
            <Button
              onClick={handleOpen}
              className={cn(
                "w-14 h-14 rounded-full shadow-lg",
                "bg-gradient-to-br from-gold to-gold/80 hover:from-gold/90 hover:to-gold/70",
                "border border-gold/20",
                pulseAnimation && "animate-pulse"
              )}
            >
              <div className="relative">
                <Brain className="w-6 h-6 text-background" />
                
                {/* Notification Dot */}
                {hasNotification && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background"
                  />
                )}
                
                {/* Sparkle Effect */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-4 h-4 text-gold/50" />
                </motion.div>
              </div>
            </Button>

            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
              <div className="bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-gold" />
                  <span className="text-sm font-medium">Grok AI</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tu asistente inteligente
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <GrokChatPanel
        isOpen={isOpen}
        onClose={handleClose}
        initialContext={context}
      />
    </>
  );
}

export default GrokFloatingAssistant;
