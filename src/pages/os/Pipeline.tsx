import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, Users, Calendar, DollarSign, Clock, 
  ArrowRight, MoreVertical, Plus, Filter, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  name: string | null;
  email: string | null;
  status: string | null;
  deposit_paid: boolean | null;
  deposit_amount: number | null;
  created_at: string;
  preferred_date: string | null;
}

const pipelineStages = [
  { id: 'new', label: 'Nuevos', color: 'bg-blue-500', statuses: ['pending'] },
  { id: 'contacted', label: 'Contactados', color: 'bg-purple-500', statuses: ['contacted'] },
  { id: 'deposit', label: 'Depósito Pendiente', color: 'bg-warning', statuses: ['waiting_deposit'] },
  { id: 'confirmed', label: 'Confirmados', color: 'bg-success', statuses: ['confirmed'] },
  { id: 'completed', label: 'Completados', color: 'bg-slate-400', statuses: ['completed'] },
];

const OSPipeline = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, name, email, status, deposit_paid, deposit_amount, created_at, preferred_date')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBookingsForStage = (stage: typeof pipelineStages[0]) => {
    return bookings.filter(b => {
      if (stage.id === 'new') return b.status === 'pending' && !b.deposit_paid;
      if (stage.id === 'deposit') return b.status === 'pending' || (b.status === 'confirmed' && !b.deposit_paid);
      if (stage.id === 'confirmed') return b.status === 'confirmed' && b.deposit_paid;
      if (stage.id === 'completed') return b.status === 'completed';
      return stage.statuses.includes(b.status || '');
    });
  };

  const totalValue = bookings
    .filter(b => b.deposit_paid)
    .reduce((sum, b) => sum + (b.deposit_amount || 0), 0);

  const pendingValue = bookings
    .filter(b => !b.deposit_paid && b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.deposit_amount || 150), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona el flujo de bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="bg-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">€{totalValue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Confirmado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">€{pendingValue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pendiente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-ai/10">
                  <Zap className="w-5 h-5 text-ai" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {bookings.length > 0 
                      ? Math.round((bookings.filter(b => b.deposit_paid).length / bookings.length) * 100) 
                      : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Conversión</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto">
        {pipelineStages.map((stage, stageIndex) => {
          const stageBookings = getBookingsForStage(stage);
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stageIndex * 0.1 }}
            >
              <Card className="backdrop-blur-sm bg-white/40 border-white/20 min-h-[400px]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                      <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">{stageBookings.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : stageBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-xs">Sin leads</p>
                    </div>
                  ) : (
                    stageBookings.slice(0, 5).map((booking, index) => (
                      <motion.div
                        key={booking.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-3 rounded-xl bg-white/80 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm truncate">{booking.name || 'Sin nombre'}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-2">{booking.email || 'Sin email'}</p>
                        <div className="flex items-center justify-between">
                          {booking.deposit_amount && (
                            <Badge variant="outline" className="text-xs">
                              €{booking.deposit_amount}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(booking.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {booking.deposit_paid && (
                          <Badge className="mt-2 w-full justify-center bg-success/10 text-success border-success/20 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Pagado
                          </Badge>
                        )}
                      </motion.div>
                    ))
                  )}
                  {stageBookings.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      +{stageBookings.length - 5} más
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* AI Suggestions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="backdrop-blur-sm bg-gradient-to-r from-ai/5 to-primary/5 border-ai/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-ai to-primary">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">AI Pipeline Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <span>{bookings.filter(b => !b.deposit_paid && b.status === 'pending').length} leads sin seguimiento &gt;24h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-success" />
                    <span>€{pendingValue.toLocaleString()} en pipeline por cerrar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Mejor día para follow-up: Martes</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default OSPipeline;