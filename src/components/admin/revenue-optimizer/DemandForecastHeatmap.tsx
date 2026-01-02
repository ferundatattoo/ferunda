import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  RefreshCw,
  Calendar,
  Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ForecastData {
  predicted_bookings: number;
  confidence: number;
}

export function DemandForecastHeatmap() {
  const queryClient = useQueryClient();

  // Fetch latest forecast
  const { data: forecast, isLoading } = useQuery({
    queryKey: ['demand-forecast-heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_forecasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch premium slots
  const { data: premiumSlots } = useQuery({
    queryKey: ['premium-slots-heatmap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_slots')
        .select('*')
        .eq('applied', false)
        .order('slot_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Generate forecast mutation
  const generateForecast = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('revenue-intelligence', {
        body: {
          action: 'forecast_demand',
          workspace_id: 'default',
          params: { horizon_days: 14 }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Forecast generated');
      queryClient.invalidateQueries({ queryKey: ['demand-forecast-heatmap'] });
    }
  });

  // Identify premium slots mutation
  const identifyPremium = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('revenue-intelligence', {
        body: {
          action: 'identify_premium_slots',
          workspace_id: 'default',
          params: {}
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Found ${data.count} premium slots`);
      queryClient.invalidateQueries({ queryKey: ['premium-slots-heatmap'] });
    }
  });

  const forecastData = useMemo(() => {
    if (!forecast?.forecast_json) return [];
    const json = forecast.forecast_json as unknown as Record<string, ForecastData>;
    return Object.entries(json).map(([date, data]) => ({
      date,
      ...data
    }));
  }, [forecast]);

  const getIntensityColor = (bookings: number) => {
    const intensity = Math.min(bookings / 4, 1);
    if (intensity < 0.25) return 'bg-green-500/20';
    if (intensity < 0.5) return 'bg-yellow-500/30';
    if (intensity < 0.75) return 'bg-orange-500/40';
    return 'bg-red-500/50';
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const premiumDates = new Set(premiumSlots?.map(s => s.slot_date));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Demand Forecast
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => identifyPremium.mutate()}
              disabled={identifyPremium.isPending}
            >
              <Flame className="h-4 w-4 mr-1" />
              Find Premium
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateForecast.mutate()}
              disabled={generateForecast.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${generateForecast.isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            Loading forecast...
          </div>
        ) : forecastData.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
            <p>No forecast data available</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => generateForecast.mutate()}
            >
              Generate forecast
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {day}
                </div>
              ))}
              
              {/* Calendar cells */}
              {forecastData.slice(0, 14).map(({ date, predicted_bookings }) => {
                const dateObj = new Date(date);
                const isPremium = premiumDates.has(date);
                
                return (
                  <div
                    key={date}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center relative
                      ${getIntensityColor(predicted_bookings)}
                      ${isPremium ? 'ring-2 ring-orange-500' : ''}
                    `}
                  >
                    <span className="text-sm font-medium">{dateObj.getDate()}</span>
                    <span className="text-xs text-muted-foreground">
                      {predicted_bookings.toFixed(1)}
                    </span>
                    {isPremium && (
                      <Flame className="absolute -top-1 -right-1 h-3 w-3 text-orange-500" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500/20"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500/30"></div>
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500/40"></div>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500/50"></div>
                  <span>Peak</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="h-3 w-3" />
                <span>Premium slot</span>
              </div>
            </div>

            {/* Premium Slots Summary */}
            {premiumSlots && premiumSlots.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Premium Slots Identified
                </h4>
                <div className="flex flex-wrap gap-2">
                  {premiumSlots.slice(0, 5).map((slot) => (
                    <Badge 
                      key={slot.id} 
                      variant="outline"
                      className="border-orange-500/30"
                    >
                      {new Date(slot.slot_date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                      <span className="ml-1 text-orange-500">
                        +{((Number((slot.suggested_policy as Record<string, unknown>)?.deposit_multiplier) || 1) * 100 - 100).toFixed(0)}%
                      </span>
                    </Badge>
                  ))}
                  {premiumSlots.length > 5 && (
                    <Badge variant="secondary">
                      +{premiumSlots.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Confidence Indicator */}
            {forecast?.confidence && (
              <div className="text-xs text-muted-foreground text-right">
                Model confidence: {(forecast.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}