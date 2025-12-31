import React from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Calendar, AlertTriangle, Sparkles, TrendingUp, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionBreakdown {
  session: number;
  description: string;
  hours: string;
}

interface RiskFactor {
  name: string;
  impact: string;
}

interface RevenueForcast {
  estimated_range: string;
  min: number;
  max: number;
  deposit_amount: string;
  hourly_rate: number;
}

interface SessionEstimation {
  total_hours_range: string;
  total_hours_min: number;
  total_hours_max: number;
  sessions_estimate: string;
  sessions_min: number;
  sessions_max: number;
  session_length: string;
  breakdowns: Array<{ factor: string; multiplier: number; added_hours?: string }>;
  session_breakdown: SessionBreakdown[];
  confidence: number;
  ml_data_points?: number;
  ml_historical_accuracy?: string;
  revenue_forecast: RevenueForcast;
  recommendations: string[];
  risk_factors: RiskFactor[];
  ai_insights: string[];
}

interface SessionTimelineProps {
  estimation: SessionEstimation;
  compact?: boolean;
  onBookNow?: () => void;
}

const SessionTimeline: React.FC<SessionTimelineProps> = ({ estimation, compact = false, onBookNow }) => {
  const {
    sessions_min,
    sessions_max,
    session_breakdown,
    total_hours_range,
    session_length,
    confidence,
    revenue_forecast,
    recommendations,
    risk_factors,
    ai_insights,
    ml_data_points
  } = estimation;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Estimación de Sesiones</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" />
            <span>{confidence}% precisión</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-background/50 rounded-md p-2">
            <div className="text-lg font-bold text-primary">
              {sessions_min === sessions_max ? sessions_min : `${sessions_min}-${sessions_max}`}
            </div>
            <div className="text-xs text-muted-foreground">sesiones</div>
          </div>
          <div className="bg-background/50 rounded-md p-2">
            <div className="text-lg font-bold text-foreground">{total_hours_range}h</div>
            <div className="text-xs text-muted-foreground">total</div>
          </div>
          <div className="bg-background/50 rounded-md p-2">
            <div className="text-lg font-bold text-green-500">{revenue_forecast.estimated_range}</div>
            <div className="text-xs text-muted-foreground">inversión</div>
          </div>
        </div>

        {onBookNow && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBookNow}
            className="w-full mt-3 bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium"
          >
            Reservar ahora
          </motion.button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Estimación de Proyecto</h3>
              <p className="text-xs text-muted-foreground">
                Basado en {ml_data_points || 0} trabajos similares • {confidence}% precisión
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {sessions_min === sessions_max ? sessions_min : `${sessions_min}-${sessions_max}`}
            </div>
            <div className="text-xs text-muted-foreground">sesiones</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="relative">
          {session_breakdown.map((session, index) => (
            <motion.div
              key={session.session}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4 mb-4 last:mb-0"
            >
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted border-2 border-border'
                }`}>
                  {index === 0 ? (
                    <span className="text-sm font-bold">1</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{session.session}</span>
                  )}
                </div>
                {index < session_breakdown.length - 1 && (
                  <div className="w-0.5 h-full bg-border flex-1 my-1" />
                )}
              </div>

              {/* Session content */}
              <div className="flex-1 bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">Sesión {session.session}</span>
                  <span className="text-sm text-primary font-medium">{session.hours}</span>
                </div>
                <p className="text-sm text-muted-foreground">{session.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Tiempo Total</span>
          </div>
          <div className="text-xl font-bold text-foreground">{total_hours_range} horas</div>
          <div className="text-xs text-muted-foreground">{session_length}</div>
        </div>
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Inversión</span>
          </div>
          <div className="text-xl font-bold text-green-500">{revenue_forecast.estimated_range}</div>
          <div className="text-xs text-muted-foreground">Depósito: {revenue_forecast.deposit_amount}</div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Precisión de Estimación</span>
          <span className="text-xs font-medium text-foreground">{confidence}%</span>
        </div>
        <Progress value={confidence} className="h-2" />
      </div>

      {/* Risk Factors */}
      {risk_factors.length > 0 && (
        <div className="p-4 border-t border-border bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-foreground">Factores de Riesgo</span>
          </div>
          <div className="space-y-2">
            {risk_factors.map((risk, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{risk.name}:</span>
                  <span className="text-muted-foreground ml-1">{risk.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 border-t border-border bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Recomendaciones</span>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {ai_insights && ai_insights.length > 0 && (
        <div className="p-4 border-t border-border bg-purple-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">Insights AI</span>
          </div>
          <div className="space-y-2">
            {ai_insights.map((insight, i) => (
              <p key={i} className="text-sm text-muted-foreground">{insight}</p>
            ))}
          </div>
        </div>
      )}

      {/* Book Button */}
      {onBookNow && (
        <div className="p-4 border-t border-border">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBookNow}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-medium flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Reservar ahora • Depósito {revenue_forecast.deposit_amount}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default SessionTimeline;
