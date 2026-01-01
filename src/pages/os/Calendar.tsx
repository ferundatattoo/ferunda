import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { 
  Calendar, Clock, Users, MapPin, Plus, 
  ChevronLeft, ChevronRight, RefreshCw, Filter,
  CheckCircle2, AlertCircle, Video, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  id: string;
  start_at: string | null;
  end_at: string | null;
  state: string;
  artist_notes: string | null;
  duration_minutes: number | null;
}

const OSCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'day'>('week');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, state, artist_notes, duration_minutes')
        .order('start_at', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      apt.start_at && isSameDay(new Date(apt.start_at), date)
    );
  };

  const todayAppointments = getAppointmentsForDate(selectedDate);

  const stats = {
    today: getAppointmentsForDate(new Date()).length,
    week: appointments.filter(apt => {
      if (!apt.start_at) return false;
      const aptDate = new Date(apt.start_at);
      return aptDate >= weekStart && aptDate <= addDays(weekStart, 6);
    }).length,
    confirmed: appointments.filter(apt => apt.state === 'confirmed').length,
  };

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 9); // 9am to 8pm

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-ai/20">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tus citas y disponibilidad
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAppointments} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Sync
          </Button>
          <Button size="sm" className="bg-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.today}</p>
                  <p className="text-sm text-muted-foreground">Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-ai/10">
                  <Clock className="w-5 h-5 text-ai" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.week}</p>
                  <p className="text-sm text-muted-foreground">Esta semana</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                  <p className="text-sm text-muted-foreground">Confirmadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mini Calendar */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
          <CardContent className="p-4">
            <CalendarUI
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md"
              locale={es}
            />
            
            {/* Today's appointments */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <h3 className="font-medium text-sm mb-3">
                {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </h3>
              {todayAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin citas programadas
                </p>
              ) : (
                <div className="space-y-2">
                  {todayAppointments.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        apt.state === 'confirmed' ? 'bg-success' : 'bg-warning'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {apt.start_at ? format(new Date(apt.start_at), 'HH:mm') : '--:--'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {apt.duration_minutes || 60} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Week View */}
        <Card className="lg:col-span-3 bg-card/50 backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg">
                  {format(weekStart, "d MMM", { locale: es })} - {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Hoy
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week header */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                const dayAppointments = getAppointmentsForDate(day);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "p-3 rounded-xl text-center cursor-pointer transition-all",
                      isToday ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted",
                      isSameDay(day, selectedDate) && !isToday && "ring-2 ring-primary/20"
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <p className="text-xs font-medium mb-1">
                      {format(day, 'EEE', { locale: es })}
                    </p>
                    <p className="text-lg font-bold">
                      {format(day, 'd')}
                    </p>
                    {dayAppointments.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "mt-1 text-xs",
                          isToday ? "bg-white/20 text-white" : ""
                        )}
                      >
                        {dayAppointments.length}
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {timeSlots.map((hour) => {
                const slotAppointments = todayAppointments.filter(apt => {
                  if (!apt.start_at) return false;
                  return new Date(apt.start_at).getHours() === hour;
                });
                
                return (
                  <div key={hour} className="flex gap-4">
                    <div className="w-16 text-sm text-muted-foreground py-2">
                      {hour}:00
                    </div>
                    <div className="flex-1 min-h-[60px] rounded-lg border border-dashed border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all p-2">
                      {slotAppointments.map((apt) => (
                        <motion.div
                          key={apt.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                apt.state === 'confirmed' ? 'bg-success' : 'bg-warning'
                              )} />
                              <span className="text-sm font-medium">
                                Sesión {apt.duration_minutes || 60}min
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {apt.state === 'confirmed' ? 'Confirmado' : apt.state}
                            </Badge>
                          </div>
                          {apt.artist_notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {apt.artist_notes}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="bg-card/50 backdrop-blur-xl border-ai/30 shadow-lg bg-gradient-to-r from-ai/5 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-ai to-primary">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">AI Calendar Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Mejor horario para nuevas citas: 14:00-17:00</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-success" />
                    <span>Capacidad disponible: 65% esta semana</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <span>2 huecos sin ocupar mañana</span>
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

export default OSCalendar;