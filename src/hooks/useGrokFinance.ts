/**
 * useGrokFinance - Hook for Grok-powered financial analysis and forecasting
 * 
 * Provides:
 * - Revenue forecasting with AI
 * - Expense optimization suggestions
 * - Cash flow predictions
 * - Investment recommendations
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FinanceForecast {
  period: string;
  predictedRevenue: number;
  predictedExpenses: number;
  profitMargin: number;
  confidence: number;
  factors: Array<{ name: string; impact: number; description: string }>;
}

export interface ExpenseOptimization {
  category: string;
  currentSpend: number;
  suggestedSpend: number;
  savingsPotential: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CashFlowPrediction {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
  alerts: string[];
}

export interface FinanceInsight {
  type: 'opportunity' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  impact: number;
  action?: string;
}

interface GrokFinanceResult {
  forecasts?: FinanceForecast[];
  optimizations?: ExpenseOptimization[];
  cashFlow?: CashFlowPrediction[];
  insights?: FinanceInsight[];
  summary?: string;
  raw?: string;
}

export function useGrokFinance() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GrokFinanceResult | null>(null);

  /**
   * Generate revenue forecast using Grok AI
   */
  const generateForecast = useCallback(async (params: {
    historicalData: Array<{ period: string; revenue: number; expenses: number }>;
    periods: number;
    context?: string;
  }): Promise<FinanceForecast[]> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `Analyze this financial data and generate ${params.periods} period forecasts.

Historical Data:
${JSON.stringify(params.historicalData, null, 2)}

${params.context ? `Additional Context: ${params.context}` : ''}

Respond with a JSON array of forecasts:
[{
  "period": "Month/Quarter name",
  "predictedRevenue": number,
  "predictedExpenses": number,
  "profitMargin": percentage,
  "confidence": 0-100,
  "factors": [{"name": "factor name", "impact": number, "description": "explanation"}]
}]

Be specific with numbers based on trends. Include seasonal factors, growth patterns, and risk factors.`;

      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const forecasts = JSON.parse(jsonMatch[0]) as FinanceForecast[];
        setLastResult(prev => ({ ...prev, forecasts }));
        return forecasts;
      }

      // Fallback to generated data
      return generateMockForecasts(params.historicalData, params.periods);
    } catch (err) {
      console.error('[GrokFinance] Forecast error:', err);
      setError('Failed to generate forecast');
      return generateMockForecasts(params.historicalData, params.periods);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Get expense optimization suggestions
   */
  const optimizeExpenses = useCallback(async (params: {
    expenses: Array<{ category: string; amount: number; recurring: boolean }>;
    revenue: number;
    industry?: string;
  }): Promise<ExpenseOptimization[]> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `Analyze these business expenses and suggest optimizations for a tattoo studio.

Current Expenses:
${JSON.stringify(params.expenses, null, 2)}

Monthly Revenue: $${params.revenue}
Industry: ${params.industry || 'Tattoo Studio'}

Respond with a JSON array of optimization suggestions:
[{
  "category": "expense category",
  "currentSpend": number,
  "suggestedSpend": number,
  "savingsPotential": number,
  "recommendation": "specific action to take",
  "priority": "high|medium|low"
}]

Focus on practical, industry-specific advice. Consider artist supplies, rent, marketing, software subscriptions.`;

      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const optimizations = JSON.parse(jsonMatch[0]) as ExpenseOptimization[];
        setLastResult(prev => ({ ...prev, optimizations }));
        return optimizations;
      }

      return [];
    } catch (err) {
      console.error('[GrokFinance] Optimization error:', err);
      setError('Failed to generate optimizations');
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Generate AI-powered financial insights
   */
  const generateInsights = useCallback(async (params: {
    metrics: {
      revenue: number;
      revenueChange: number;
      avgTicket: number;
      ticketChange: number;
      bookings: number;
      conversionRate: number;
    };
    period: 'week' | 'month' | 'quarter';
  }): Promise<FinanceInsight[]> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `Analyze these tattoo studio financial metrics and provide actionable insights.

Metrics for ${params.period}:
- Revenue: $${params.metrics.revenue} (${params.metrics.revenueChange > 0 ? '+' : ''}${params.metrics.revenueChange}% change)
- Average Ticket: $${params.metrics.avgTicket} (${params.metrics.ticketChange > 0 ? '+' : ''}${params.metrics.ticketChange}% change)
- Total Bookings: ${params.metrics.bookings}
- Conversion Rate: ${params.metrics.conversionRate}%

Respond with a JSON array of 3-5 insights:
[{
  "type": "opportunity|warning|success|info",
  "title": "short title",
  "description": "detailed explanation",
  "impact": estimated dollar impact,
  "action": "specific action to take (optional)"
}]

Be specific to tattoo industry. Consider upselling, client retention, pricing strategies.`;

      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const content = data?.content || '';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]) as FinanceInsight[];
        setLastResult(prev => ({ ...prev, insights }));
        return insights;
      }

      return generateMockInsights(params.metrics);
    } catch (err) {
      console.error('[GrokFinance] Insights error:', err);
      setError('Failed to generate insights');
      return generateMockInsights(params.metrics);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Ask Grok a custom finance question
   */
  const askFinanceQuestion = useCallback(async (question: string, context?: string): Promise<string> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `You are a financial advisor for a tattoo studio. Answer this question:

${question}

${context ? `Context: ${context}` : ''}

Be specific, practical, and concise. Use numbers when possible.`;

      const { data, error: fnError } = await supabase.functions.invoke('grok-gateway', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        },
      });

      if (fnError) throw fnError;

      const answer = data?.content || 'Unable to generate answer';
      setLastResult(prev => ({ ...prev, summary: answer }));
      return answer;
    } catch (err) {
      console.error('[GrokFinance] Question error:', err);
      setError('Failed to get answer');
      return 'Error processing your question. Please try again.';
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isAnalyzing,
    error,
    lastResult,
    generateForecast,
    optimizeExpenses,
    generateInsights,
    askFinanceQuestion,
  };
}

// Helper functions for mock data
function generateMockForecasts(
  historical: Array<{ period: string; revenue: number; expenses: number }>,
  periods: number
): FinanceForecast[] {
  const avgRevenue = historical.reduce((s, h) => s + h.revenue, 0) / historical.length || 5000;
  const avgExpenses = historical.reduce((s, h) => s + h.expenses, 0) / historical.length || 2000;
  
  return Array.from({ length: periods }, (_, i) => {
    const growth = 1 + (0.05 + Math.random() * 0.1);
    const revenue = Math.round(avgRevenue * growth * (1 + i * 0.05));
    const expenses = Math.round(avgExpenses * (1 + i * 0.02));
    
    return {
      period: `Period ${i + 1}`,
      predictedRevenue: revenue,
      predictedExpenses: expenses,
      profitMargin: Math.round(((revenue - expenses) / revenue) * 100),
      confidence: 85 - i * 5,
      factors: [
        { name: 'Seasonal Trend', impact: 15, description: 'Historical pattern influence' },
        { name: 'Market Growth', impact: 8, description: 'Industry expansion' },
      ],
    };
  });
}

function generateMockInsights(metrics: {
  revenue: number;
  revenueChange: number;
  avgTicket: number;
  bookings: number;
}): FinanceInsight[] {
  const insights: FinanceInsight[] = [];
  
  if (metrics.revenueChange > 10) {
    insights.push({
      type: 'success',
      title: 'Strong Revenue Growth',
      description: `Revenue is up ${metrics.revenueChange}% - momentum is building`,
      impact: metrics.revenue * 0.15,
    });
  }
  
  if (metrics.avgTicket < 200) {
    insights.push({
      type: 'opportunity',
      title: 'Upselling Potential',
      description: 'Average ticket is below industry average. Consider premium packages.',
      impact: metrics.bookings * 50,
      action: 'Create premium service bundles',
    });
  }
  
  insights.push({
    type: 'info',
    title: 'Booking Optimization',
    description: 'Analyze peak booking times to maximize artist utilization.',
    impact: metrics.revenue * 0.1,
    action: 'Review scheduling patterns',
  });
  
  return insights;
}

export default useGrokFinance;
