import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  Brain,
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Target,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Play,
  Pause,
  Settings,
  ChevronRight,
  Sun,
  Moon,
  Coffee
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface ScheduleSuggestion {
  id: string;
  booking_id: string;
  client_name: string;
  suggested_date: string;
  suggested_time: string;
  confidence_score: number;
  reasoning: string;
  conflicts: string[];
  revenue_impact: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface DayAnalysis {
  date: string;
  optimal_slots: string[];
  booked_slots: string[];
  revenue_potential: number;
  utilization: number;
  recommendations: string[];
}

interface WeeklyInsights {
  total_bookings: number;
  revenue_forecast: number;
  utilization_rate: number;
  optimization_opportunities: number;
  best_day: string;
  worst_day: string;
}

const TIME_SLOTS = [
  { time: '09:00', label: 'Mañana temprano', icon: Sun },
  { time: '11:00', label: 'Media mañana', icon: Coffee },
  { time: '14:00', label: 'Tarde temprano', icon: Sun },
  { time: '16:00', label: 'Media tarde', icon: Coffee },
  { time: '18:00', label: 'Tarde', icon: Moon },
];

const SmartSchedulingAI = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [dayAnalysis, setDayAnalysis] = useState<DayAnalysis | null>(null);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false);

  useEffect(() => {
    fetchSchedulingData();
  }, [selectedDate]);

  const fetchSchedulingData = async () => {
    setLoading(true);
    try {
      // Fetch AI scheduling suggestions
      const { data: suggestionsData } = await supabase
        .from('ai_scheduling_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('confidence_score', { ascending: false })
        .limit(10);

      // Transform data to match our interface
      const transformedSuggestions: ScheduleSuggestion[] = (suggestionsData || []).map(s => ({
        id: s.id,
        booking_id: s.booking_id || '',
        client_name: 'Cliente',
        suggested_date: s.suggested_date,
        suggested_time: s.suggested_time || '10:00',
        confidence_score: s.confidence_score || 0.85,
        reasoning: s.reasoning || 'Horario óptimo basado en preferencias',
        conflicts: s.conflicts || [],
        revenue_impact: 250,
        status: (s.status as 'pending' | 'accepted' | 'rejected') || 'pending'
      }));

      setSuggestions(transformedSuggestions);

      // Generate day analysis
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setDayAnalysis({
        date: dateStr,
        optimal_slots: ['10:00', '14:00', '16:00'],
        booked_slots: ['09:00', '11:00'],
        revenue_potential: 850,
        utilization: 65,
        recommendations: [
          'Considera ofrecer descuento para el slot de 18:00',
          'Alto potencial para sesiones largas los martes',
          'Clientes premium prefieren horarios de tarde'
        ]
      });

      // Generate weekly insights
      setWeeklyInsights({
        total_bookings: 12,
        revenue_forecast: 4500,
        utilization_rate: 72,
        optimization_opportunities: 5,
        best_day: 'Viernes',
        worst_day: 'Lunes'
      });

    } catch (error) {
      console.error('Error fetching scheduling data:', error);
      toast.error('Error al cargar datos de programación');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeWeek = async () => {
    setOptimizing(true);
    try {
      // Simulate AI optimization
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Semana optimizada con IA');
      await fetchSchedulingData();
    } catch (error) {
      toast.error('Error en optimización');
    } finally {
      setOptimizing(false);
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_scheduling_suggestions')
        .update({ status: 'accepted' })
        .eq('id', suggestionId);

      if (error) throw error;

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      toast.success('Sugerencia aceptada');
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      toast.error('Error al aceptar');
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_scheduling_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId);

      if (error) throw error;

      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      toast.info('Sugerencia rechazada');
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'text-emerald-500';
    if (score >= 0.7) return 'text-green-500';
    if (score >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 })
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground">Analizando calendario con IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <Brain className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart Scheduling AI</h1>
            <p className="text-muted-foreground">Optimización inteligente de tu agenda</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoScheduleEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoScheduleEnabled(!autoScheduleEnabled)}
          >
            {autoScheduleEnabled ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Auto-Schedule
          </Button>
          <Button onClick={handleOptimizeWeek} disabled={optimizing}>
            {optimizing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Optimizar Semana
          </Button>
        </div>
      </div>

      {/* Weekly Insights */}
      {weeklyInsights && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Reservas</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{weeklyInsights.total_bookings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Proyección</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">${weeklyInsights.revenue_forecast}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Utilización</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{weeklyInsights.utilization_rate}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">Oportunidades</span>
              </div>
              <p className="text-2xl font-bold text-foreground mt-1">{weeklyInsights.optimization_opportunities}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Mejor Día</span>
              </div>
              <p className="text-lg font-bold text-foreground mt-1">{weeklyInsights.best_day}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">A Mejorar</span>
              </div>
              <p className="text-lg font-bold text-foreground mt-1">{weeklyInsights.worst_day}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar & Day View */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Vista Semanal Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Week Strip */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {weekDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <motion.div
                    key={day.toISOString()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : isToday 
                            ? 'border-blue-500/50' 
                            : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedDate(day)}
                    >
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                          {format(day, 'EEE', { locale: es })}
                        </p>
                        <p className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {format(day, 'd')}
                        </p>
                        <div className="flex justify-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Time Slots */}
            {dayAnalysis && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <Badge variant="outline">
                    {dayAnalysis.utilization}% utilizado
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TIME_SLOTS.map((slot) => {
                    const isBooked = dayAnalysis.booked_slots.includes(slot.time);
                    const isOptimal = dayAnalysis.optimal_slots.includes(slot.time);
                    const SlotIcon = slot.icon;

                    return (
                      <Card
                        key={slot.time}
                        className={`transition-all ${
                          isBooked 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : isOptimal 
                              ? 'bg-blue-500/5 border-blue-500/20 border-dashed' 
                              : 'bg-muted/30'
                        }`}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              isBooked ? 'bg-emerald-500/20' : 'bg-muted'
                            }`}>
                              <SlotIcon className={`h-4 w-4 ${
                                isBooked ? 'text-emerald-500' : 'text-muted-foreground'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{slot.time}</p>
                              <p className="text-xs text-muted-foreground">{slot.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isBooked ? (
                              <Badge variant="default" className="bg-emerald-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reservado
                              </Badge>
                            ) : isOptimal ? (
                              <Badge variant="outline" className="border-blue-500 text-blue-500">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Óptimo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Disponible</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* AI Recommendations */}
                <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border-violet-500/20 mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-4 w-4 text-violet-500" />
                      <span className="font-medium text-foreground">Recomendaciones AI</span>
                    </div>
                    <ul className="space-y-2">
                      {dayAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Sugerencias AI
              {suggestions.length > 0 && (
                <Badge variant="secondary">{suggestions.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                <AnimatePresence>
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:border-primary/50 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-foreground">{suggestion.client_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(suggestion.suggested_date), "d MMM", { locale: es })} • {suggestion.suggested_time}
                              </p>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={getConfidenceColor(suggestion.confidence_score)}
                            >
                              {Math.round(suggestion.confidence_score * 100)}%
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mb-3">
                            {suggestion.reasoning}
                          </p>

                          {suggestion.conflicts.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-500 mb-2">
                              <AlertTriangle className="h-3 w-3" />
                              {suggestion.conflicts.length} conflictos
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-emerald-500">
                              +${suggestion.revenue_impact}
                            </span>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRejectSuggestion(suggestion.id)}
                              >
                                Rechazar
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleAcceptSuggestion(suggestion.id)}
                              >
                                Aceptar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {suggestions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                    <p className="font-medium text-foreground">¡Todo optimizado!</p>
                    <p className="text-sm">No hay sugerencias pendientes</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SmartSchedulingAI;
