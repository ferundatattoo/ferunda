import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Activity, AlertTriangle, CheckCircle, Clock, 
  Image as ImageIcon, Loader2, MessageCircle, Heart, 
  Award, Calendar, User, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface HealingClientViewProps {
  bookingId: string;
  onBack: () => void;
}

interface HealingEntry {
  id: string;
  day_number: number;
  photo_url: string | null;
  client_notes: string | null;
  ai_health_score: number | null;
  ai_healing_stage: string | null;
  ai_concerns: string[] | null;
  ai_recommendations: string | null;
  requires_attention: boolean | null;
  artist_response: string | null;
  alert_acknowledged_at: string | null;
  created_at: string;
}

interface BookingInfo {
  id: string;
  name: string;
  email: string;
  tattoo_description: string;
  scheduled_date: string | null;
}

interface Certificate {
  id: string;
  certificate_number: string;
  final_health_score: number;
  total_photos: number;
  healing_duration_days: number;
  generated_at: string;
}

const HEALING_STAGES: Record<string, { label: string; color: string }> = {
  fresh: { label: 'Recién hecho', color: 'text-red-500' },
  peeling: { label: 'Pelándose', color: 'text-orange-500' },
  itchy: { label: 'Picazón', color: 'text-yellow-500' },
  healing: { label: 'Sanando', color: 'text-blue-500' },
  healed: { label: 'Curado', color: 'text-green-500' }
};

export default function HealingClientView({ bookingId, onBack }: HealingClientViewProps) {
  const [entries, setEntries] = useState<HealingEntry[]>([]);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HealingEntry | null>(null);
  const [artistResponse, setArtistResponse] = useState("");
  const [responding, setResponding] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);

  useEffect(() => {
    fetchData();
  }, [bookingId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch booking info
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, name, email, tattoo_description, scheduled_date')
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;
      setBooking(bookingData);

      // Fetch healing entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('healing_progress')
        .select('*')
        .eq('booking_id', bookingId)
        .order('day_number', { ascending: true });

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);

      // Fetch certificate if exists
      const { data: certData } = await supabase
        .from('healing_certificates')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (certData) {
        setCertificate(certData as Certificate);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async () => {
    if (!selectedEntry || !artistResponse.trim()) return;

    setResponding(true);
    try {
      const { error } = await supabase
        .from('healing_progress')
        .update({
          artist_response: artistResponse,
          alert_acknowledged_at: new Date().toISOString()
        })
        .eq('id', selectedEntry.id);

      if (error) throw error;

      setEntries(prev => prev.map(e => 
        e.id === selectedEntry.id 
          ? { ...e, artist_response: artistResponse, alert_acknowledged_at: new Date().toISOString() }
          : e
      ));
      setSelectedEntry(prev => prev ? { ...prev, artist_response: artistResponse } : null);
      setArtistResponse("");
      toast.success('Respuesta enviada');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar respuesta');
    } finally {
      setResponding(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setGeneratingCert(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-healing-certificate', {
        body: { booking_id: bookingId }
      });

      if (error) throw error;
      toast.success('Certificado generado');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar certificado');
    } finally {
      setGeneratingCert(false);
    }
  };

  const averageScore = entries.length > 0
    ? entries.reduce((acc, e) => acc + (e.ai_health_score || 0), 0) / entries.filter(e => e.ai_health_score).length
    : 0;

  const daysSinceFirst = entries.length > 0
    ? Math.ceil((Date.now() - new Date(entries[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const needsAttention = entries.filter(e => e.requires_attention && !e.alert_acknowledged_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl text-foreground">{booking?.name}</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {booking?.email} • {booking?.tattoo_description}
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Alert Banner */}
      {needsAttention > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-body text-destructive font-medium">
              {needsAttention} entrada{needsAttention > 1 ? "s" : ""} requiere{needsAttention === 1 ? "" : "n"} atención
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{averageScore ? averageScore.toFixed(0) : '--'}%</p>
            <p className="text-xs text-muted-foreground">Score Promedio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{daysSinceFirst}</p>
            <p className="text-xs text-muted-foreground">Días</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{needsAttention}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-lg font-bold">{certificate ? 'Sí' : 'No'}</p>
            <p className="text-xs text-muted-foreground">Certificado</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progreso de Curación</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={Math.min((daysSinceFirst / 30) * 100, 100)} className="h-3 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Día {daysSinceFirst}</span>
            <span>Meta: 30 días</span>
          </div>
          {!certificate && daysSinceFirst >= 30 && averageScore >= 80 && (
            <Button 
              className="mt-4 w-full" 
              onClick={handleGenerateCertificate}
              disabled={generatingCert}
            >
              {generatingCert ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando...</>
              ) : (
                <><Award className="w-4 h-4 mr-2" />Generar Certificado</>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Certificate */}
      {certificate && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-6 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="font-display text-xl mb-2">Certificado de Curación</h3>
            <p className="text-muted-foreground mb-4">#{certificate.certificate_number}</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-bold text-lg">{certificate.final_health_score}%</p>
                <p className="text-muted-foreground">Score Final</p>
              </div>
              <div>
                <p className="font-bold text-lg">{certificate.total_photos}</p>
                <p className="text-muted-foreground">Fotos</p>
              </div>
              <div>
                <p className="font-bold text-lg">{certificate.healing_duration_days}</p>
                <p className="text-muted-foreground">Días</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Sin check-ins aún</p>
              </div>
            ) : (
              entries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setArtistResponse(entry.artist_response || "");
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id
                      ? 'border-primary bg-primary/5'
                      : entry.requires_attention && !entry.alert_acknowledged_at
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {entry.photo_url && (
                      <img src={entry.photo_url} alt="" className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Día {entry.day_number}</Badge>
                        {entry.ai_health_score && (
                          <span className={`font-bold ${
                            entry.ai_health_score >= 80 ? 'text-green-500' :
                            entry.ai_health_score >= 60 ? 'text-yellow-500' : 'text-red-500'
                          }`}>
                            {entry.ai_health_score}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    {entry.requires_attention && !entry.alert_acknowledged_at && (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    {entry.artist_response && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedEntry ? `Detalle - Día ${selectedEntry.day_number}` : 'Selecciona una entrada'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEntry ? (
              <div className="space-y-4">
                {selectedEntry.photo_url && (
                  <img 
                    src={selectedEntry.photo_url} 
                    alt="" 
                    className="w-full rounded-lg max-h-64 object-cover"
                  />
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="font-bold text-2xl">{selectedEntry.ai_health_score || '--'}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Etapa</p>
                    <p className="font-medium">
                      {selectedEntry.ai_healing_stage 
                        ? HEALING_STAGES[selectedEntry.ai_healing_stage]?.label || selectedEntry.ai_healing_stage
                        : '--'}
                    </p>
                  </div>
                </div>

                {selectedEntry.client_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notas del cliente</p>
                    <p className="bg-muted p-2 rounded text-sm">"{selectedEntry.client_notes}"</p>
                  </div>
                )}

                {selectedEntry.ai_concerns && selectedEntry.ai_concerns.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Preocupaciones</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedEntry.ai_concerns.map((c, i) => (
                        <Badge key={i} variant="destructive">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEntry.ai_recommendations && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Recomendaciones</p>
                    <p className="bg-primary/5 p-2 rounded text-sm">{selectedEntry.ai_recommendations}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Tu respuesta</p>
                  <Textarea
                    placeholder="Escribe tu respuesta al cliente..."
                    value={artistResponse}
                    onChange={(e) => setArtistResponse(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    className="mt-2 w-full"
                    onClick={handleResponse}
                    disabled={responding || !artistResponse.trim()}
                  >
                    {responding ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                    ) : (
                      <><MessageCircle className="w-4 h-4 mr-2" />Enviar Respuesta</>
                    )}
                  </Button>
                </div>

                {selectedEntry.artist_response && (
                  <div className="bg-green-500/10 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Respuesta anterior</p>
                    <p className="text-sm">{selectedEntry.artist_response}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Haz click en una entrada para ver detalles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}