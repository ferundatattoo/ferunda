import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Package,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface BookingCostEstimate {
  id: string;
  booking_id: string;
  cogs_estimate: number;
  labor_estimate: number;
  margin_estimate: number;
  margin_percentage: number;
  breakdown: {
    consumables?: number;
    labor_share?: number;
    revenue?: number;
  };
}

interface ProfitOptimizerWidgetProps {
  bookingId?: string;
  compact?: boolean;
}

export function ProfitOptimizerWidget({ bookingId, compact = false }: ProfitOptimizerWidgetProps) {
  // Fetch cost estimate for specific booking
  const { data: estimate } = useQuery({
    queryKey: ['booking-cost-estimate', bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from('booking_cost_estimates')
        .select('*')
        .eq('booking_id', bookingId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as BookingCostEstimate | null;
    },
    enabled: !!bookingId
  });

  // Fetch kit profiles for alerts
  const { data: kitAlerts } = useQuery({
    queryKey: ['kit-alerts'],
    queryFn: async () => {
      // In real implementation, this would check inventory levels
      return [
        { style: 'Color', alert: 'High usage predicted next week' },
      ];
    }
  });

  // Fetch aggregate margin stats
  const { data: marginStats } = useQuery({
    queryKey: ['margin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_cost_estimates')
        .select('margin_percentage, margin_estimate')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { avgMargin: 0, totalProfit: 0, count: 0 };
      }
      
      const avgMargin = data.reduce((sum, e) => sum + (e.margin_percentage || 0), 0) / data.length;
      const totalProfit = data.reduce((sum, e) => sum + (e.margin_estimate || 0), 0);
      
      return { avgMargin, totalProfit, count: data.length };
    }
  });

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-500';
    if (margin >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (compact && estimate) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Est. Margin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${getMarginColor(estimate.margin_percentage)}`}>
            {estimate.margin_percentage?.toFixed(0)}%
          </span>
          <span className="text-sm text-muted-foreground">
            (${estimate.margin_estimate?.toFixed(0)})
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Profit Optimizer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregate Stats */}
        {marginStats && marginStats.count > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Margin</p>
              <p className={`text-xl font-bold ${getMarginColor(marginStats.avgMargin)}`}>
                {marginStats.avgMargin.toFixed(1)}%
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Est. Profit (Recent)</p>
              <p className="text-xl font-bold text-green-500">
                ${marginStats.totalProfit.toFixed(0)}
              </p>
            </div>
          </div>
        )}

        {/* Single Booking Estimate */}
        {estimate && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium">This Booking</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">${estimate.breakdown?.revenue?.toFixed(0) || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">COGS</span>
                <span className="text-red-500">-${estimate.cogs_estimate?.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor Share</span>
                <span className="text-orange-500">-${estimate.labor_estimate?.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-2 border-t">
                <span>Net Margin</span>
                <span className={getMarginColor(estimate.margin_percentage)}>
                  ${estimate.margin_estimate?.toFixed(0)} ({estimate.margin_percentage?.toFixed(0)}%)
                </span>
              </div>
            </div>

            {/* Margin Health Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Margin Health</span>
                <span>{estimate.margin_percentage?.toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min(estimate.margin_percentage, 100)} 
                className="h-2"
              />
            </div>
          </div>
        )}

        {/* Supply Alerts */}
        {kitAlerts && kitAlerts.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Supply Alerts
            </h4>
            {kitAlerts.map((alert, i) => (
              <div 
                key={i}
                className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded-lg"
              >
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{alert.style} Work</p>
                  <p className="text-xs text-muted-foreground">{alert.alert}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium">Margin Tips</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Avoid low-margin bookings on premium slots</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span>Color work costs 40% more in consumables</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}