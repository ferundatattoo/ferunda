import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, DollarSign, Calendar, AlertTriangle, Sparkles, TrendingUp, Check,
  Zap, Brain, GitBranch, Shield, Target, Activity
} from 'lucide-react';
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

interface CausalNode {
  factor: string;
  effect: string;
  impact: string;
}

interface QAOAOptimization {
  optimal_path: string;
  iterations: number;
  energy_score: number;
  alternatives_evaluated: number;
}

interface FederatedLearning {
  local_accuracy: number;
  global_accuracy: number;
  privacy_score: number;
  improvement_rate: string;
}

interface MCoTStep {
  step: number;
  description: string;
  confidence: number;
}

interface WhatIfScenario {
  condition: string;
  outcome: string;
  revenue_impact: string;
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
  // God-mode fields
  qaoa_optimization?: QAOAOptimization;
  causal_graph?: CausalNode[];
  federated_learning?: FederatedLearning;
  mcot_reasoning?: MCoTStep[];
  what_if_scenarios?: WhatIfScenario[];
  god_insights?: string[];
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
    ml_data_points,
    qaoa_optimization,
    causal_graph,
    federated_learning,
    mcot_reasoning,
    what_if_scenarios,
    god_insights
  } = estimation;

  const isGodMode = confidence >= 95 || qaoa_optimization || causal_graph;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`border rounded-lg p-4 ${
          isGodMode 
            ? 'bg-gradient-to-r from-purple-500/10 via-primary/10 to-cyan-500/10 border-purple-500/30' 
            : 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isGodMode ? (
              <Zap className="w-4 h-4 text-purple-500" />
            ) : (
              <Clock className="w-4 h-4 text-primary" />
            )}
            <span className="font-medium text-sm">
              {isGodMode ? 'God-Mode Estimation' : 'Estimación de Sesiones'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isGodMode && <Shield className="w-3 h-3 text-green-500" />}
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

        {isGodMode && qaoa_optimization && (
          <div className="mt-3 p-2 bg-purple-500/10 rounded-md">
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <Target className="w-3 h-3" />
              <span>QAOA: {qaoa_optimization.alternatives_evaluated} paths evaluated</span>
            </div>
          </div>
        )}

        {onBookNow && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBookNow}
            className={`w-full mt-3 rounded-md py-2 text-sm font-medium ${
              isGodMode 
                ? 'bg-gradient-to-r from-purple-600 to-primary text-white' 
                : 'bg-primary text-primary-foreground'
            }`}
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
      <div className={`p-4 border-b border-border ${
        isGodMode 
          ? 'bg-gradient-to-r from-purple-500/20 via-primary/20 to-cyan-500/20' 
          : 'bg-gradient-to-r from-primary/20 to-primary/5'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isGodMode ? 'bg-purple-500/20' : 'bg-primary/20'
            }`}>
              {isGodMode ? (
                <Zap className="w-5 h-5 text-purple-500" />
              ) : (
                <Calendar className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {isGodMode ? '⚡ God-Mode Estimation' : 'Estimación de Proyecto'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isGodMode 
                  ? `QAOA + Causal AI • ${confidence}% confidence`
                  : `Basado en ${ml_data_points || 0} trabajos similares • ${confidence}% precisión`
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${isGodMode ? 'text-purple-500' : 'text-primary'}`}>
              {sessions_min === sessions_max ? sessions_min : `${sessions_min}-${sessions_max}`}
            </div>
            <div className="text-xs text-muted-foreground">sesiones</div>
          </div>
        </div>
      </div>

      {/* QAOA Optimization (God-mode) */}
      {qaoa_optimization && (
        <div className="p-4 border-b border-border bg-purple-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">QAOA Optimization</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-background/50 rounded-md p-2">
              <div className="text-sm font-bold text-purple-500">{qaoa_optimization.iterations}</div>
              <div className="text-xs text-muted-foreground">iterations</div>
            </div>
            <div className="bg-background/50 rounded-md p-2">
              <div className="text-sm font-bold text-foreground">{qaoa_optimization.alternatives_evaluated}</div>
              <div className="text-xs text-muted-foreground">paths evaluated</div>
            </div>
            <div className="bg-background/50 rounded-md p-2">
              <div className="text-sm font-bold text-green-500">{qaoa_optimization.energy_score.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">energy score</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">{qaoa_optimization.optimal_path}</p>
        </div>
      )}

      {/* Causal Graph (God-mode) */}
      {causal_graph && causal_graph.length > 0 && (
        <div className="p-4 border-b border-border bg-cyan-500/5">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium text-foreground">Causal Reasoning</span>
          </div>
          <div className="space-y-2">
            {causal_graph.slice(0, 4).map((node, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                <span className="text-foreground font-medium">{node.factor}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-muted-foreground">{node.effect}</span>
                <span className="text-cyan-500 ml-auto">{node.impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Federated Learning (God-mode) */}
      {federated_learning && (
        <div className="p-4 border-b border-border bg-green-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-foreground">Federated Learning</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Local Accuracy</span>
              <span className="text-foreground font-medium">{federated_learning.local_accuracy}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Global Accuracy</span>
              <span className="text-foreground font-medium">{federated_learning.global_accuracy}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Privacy Score</span>
              <span className="text-green-500 font-medium">{federated_learning.privacy_score}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Improvement</span>
              <span className="text-green-500 font-medium">{federated_learning.improvement_rate}</span>
            </div>
          </div>
        </div>
      )}

      {/* MCoT Reasoning Steps (God-mode) */}
      {mcot_reasoning && mcot_reasoning.length > 0 && (
        <div className="p-4 border-b border-border bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">MCoT Reasoning Chain</span>
          </div>
          <div className="space-y-2">
            {mcot_reasoning.slice(0, 5).map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-5 h-5 bg-amber-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-500 font-bold">{step.step}</span>
                </div>
                <div className="flex-1">
                  <span className="text-muted-foreground">{step.description}</span>
                </div>
                <span className="text-amber-500">{step.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 
                    ? isGodMode ? 'bg-purple-500 text-white' : 'bg-primary text-primary-foreground' 
                    : 'bg-muted border-2 border-border'
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

              <div className="flex-1 bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground">Sesión {session.session}</span>
                  <span className={`text-sm font-medium ${isGodMode ? 'text-purple-500' : 'text-primary'}`}>
                    {session.hours}
                  </span>
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
          <span className="text-xs text-muted-foreground">
            {isGodMode ? 'God-Mode Confidence' : 'Precisión de Estimación'}
          </span>
          <span className={`text-xs font-medium ${isGodMode && confidence >= 95 ? 'text-purple-500' : 'text-foreground'}`}>
            {confidence}%
          </span>
        </div>
        <Progress 
          value={confidence} 
          className={`h-2 ${isGodMode ? '[&>div]:bg-purple-500' : ''}`} 
        />
      </div>

      {/* What-If Scenarios (God-mode) */}
      {what_if_scenarios && what_if_scenarios.length > 0 && (
        <div className="p-4 border-t border-border bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-foreground">What-If Scenarios</span>
          </div>
          <div className="space-y-2">
            {what_if_scenarios.map((scenario, i) => (
              <div key={i} className="bg-background/50 rounded-md p-2 text-xs">
                <div className="font-medium text-foreground mb-1">{scenario.condition}</div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{scenario.outcome}</span>
                  <span className="text-blue-500 font-medium">{scenario.revenue_impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* God Insights */}
      {god_insights && god_insights.length > 0 && (
        <div className="p-4 border-t border-border bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-foreground">God-Mode Insights</span>
          </div>
          <div className="space-y-2">
            {god_insights.map((insight, i) => (
              <p key={i} className="text-sm text-muted-foreground">{insight}</p>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights (fallback) */}
      {!god_insights && ai_insights && ai_insights.length > 0 && (
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
            className={`w-full rounded-lg py-3 font-medium flex items-center justify-center gap-2 ${
              isGodMode 
                ? 'bg-gradient-to-r from-purple-600 to-primary text-white' 
                : 'bg-primary text-primary-foreground'
            }`}
          >
            {isGodMode ? <Zap className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            Reservar ahora • Depósito {revenue_forecast.deposit_amount}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default SessionTimeline;