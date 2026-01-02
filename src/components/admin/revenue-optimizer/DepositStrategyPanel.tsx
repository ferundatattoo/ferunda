import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Star,
  Clock,
  CheckCircle,
  Info,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DepositOption {
  label: string;
  amount: number;
  benefit: string | null;
  note?: string;
}

interface DepositRecommendation {
  suggested_amount: number;
  safe_level: string;
  options: DepositOption[];
  reason: {
    base_percentage: number;
    confidence_multiplier: number;
    signals: string[];
  };
}

interface DepositStrategyPanelProps {
  bookingId?: string;
  conversationId?: string;
  estimatedPrice?: number;
  clientSignals?: Record<string, unknown>;
  onSendDeposit?: (amount: number, option: string) => void;
}

export function DepositStrategyPanel({
  bookingId,
  conversationId,
  estimatedPrice = 500,
  clientSignals = {},
  onSendDeposit
}: DepositStrategyPanelProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<DepositRecommendation | null>(null);

  // Get deposit recommendation
  const getRecommendation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('revenue-intelligence', {
        body: {
          action: 'recommend_deposit',
          workspace_id: 'default',
          params: {
            booking_id: bookingId,
            conversation_id: conversationId,
            client_signals: {
              ...clientSignals,
              estimated_price: estimatedPrice
            }
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setRecommendation(data.recommendation as DepositRecommendation);
    },
    onError: () => {
      toast.error('Failed to get recommendation');
    }
  });

  const getSafeLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'normal': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'elevated': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSendDeposit = () => {
    if (selectedOption !== null && recommendation) {
      const option = recommendation.options[selectedOption];
      onSendDeposit?.(option.amount, option.label);
      toast.success(`Deposit draft created: $${option.amount}`);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Deposit Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recommendation ? (
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => getRecommendation.mutate()}
            disabled={getRecommendation.isPending}
          >
            {getRecommendation.isPending ? 'Analyzing...' : 'Get Recommendation'}
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Risk Level Badge */}
            <div className="flex items-center justify-between">
              <Badge className={getSafeLevelColor(recommendation.safe_level)}>
                {recommendation.safe_level === 'low' && <CheckCircle className="h-3 w-3 mr-1" />}
                {recommendation.safe_level} risk client
              </Badge>
              <span className="text-sm text-muted-foreground">
                Est. ${estimatedPrice}
              </span>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {recommendation.options.map((option, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedOption(index)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedOption === index 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {option.label === 'Premium' && <Star className="h-4 w-4 text-yellow-500" />}
                      {option.label === 'Standard' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {option.label === 'Minimum' && <Clock className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="font-bold">${option.amount}</span>
                  </div>
                  {option.benefit && (
                    <p className="text-xs text-green-600 mt-1 ml-6">
                      ✓ {option.benefit}
                    </p>
                  )}
                  {option.note && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      {option.note}
                    </p>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Why Section */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Why this recommendation?</p>
                  <ul className="space-y-0.5">
                    <li>• Base: {recommendation.reason.base_percentage}% of estimated</li>
                    <li>• Confidence: {(recommendation.reason.confidence_multiplier * 100 - 100).toFixed(0)}% adjustment</li>
                    {recommendation.reason.signals.length > 0 && (
                      <li>• Signals: {recommendation.reason.signals.join(', ')}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setRecommendation(null)}
              >
                Reset
              </Button>
              <Button 
                className="flex-1"
                disabled={selectedOption === null}
                onClick={handleSendDeposit}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Draft
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}