import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, Camera, Upload, Activity, AlertTriangle, CheckCircle, 
  Loader2, Calendar, Clock, Award, ChevronRight, Sparkles,
  ThermometerSun, Shield, Download
} from 'lucide-react';

interface HealingEntry {
  id: string;
  day_number: number;
  photo_url: string | null;
  client_notes: string | null;
  ai_health_score: number | null;
  ai_healing_stage: string | null;
  ai_concerns: string[] | null;
  ai_recommendations: string | null;
  ai_confidence: number | null;
  requires_attention: boolean | null;
  artist_response: string | null;
  created_at: string;
}

interface HealingCertificate {
  id: string;
  certificate_number: string;
  final_health_score: number;
  total_photos: number;
  healing_duration_days: number;
  generated_at: string;
  download_url: string | null;
  certificate_data: any;
}

interface HealingGuardianTabProps {
  bookingId: string;
  healingEntries: HealingEntry[];
  certificate: HealingCertificate | null;
  isLoading: boolean;
  onUploadPhoto: (file: File, dayNumber: number, notes: string) => Promise<{ success: boolean; error?: string }>;
  onAnalyzePhoto: (entryId: string) => Promise<{ success: boolean; error?: string }>;
  onRequestCertificate: () => Promise<{ success: boolean; error?: string }>;
  onRefresh: () => void;
}

const HEALING_STAGES = {
  fresh: { label: 'Recién hecho', color: 'text-red-500', bg: 'bg-red-500/10' },
  peeling: { label: 'Pelándose', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  itchy: { label: 'Picazón', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  healing: { label: 'Sanando', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  healed: { label: 'Curado', color: 'text-green-500', bg: 'bg-green-500/10' }
};

const SIMULATED_RESPONSES = [
  { 
    score: 95, 
    stage: 'healing',
    message: "¡Todo bien! Tu tatuaje está curando perfectamente. Continúa con los cuidados habituales.",
    concerns: [],
    recommendations: "Mantén la piel hidratada con crema sin fragancia. Evita la exposición directa al sol."
  },
  { 
    score: 85, 
    stage: 'peeling',
    message: "Curación normal. El pelado es parte del proceso natural.",
    concerns: [],
    recommendations: "No arranques la piel que se pela. Deja que caiga naturalmente. Sigue hidratando."
  },
  { 
    score: 70, 
    stage: 'itchy',
    message: "Posible irritación menor. Monitorea los próximos días.",
    concerns: ["Ligera irritación detectada"],
    recommendations: "Aplica crema hidratante específica para tatuajes. Si la irritación persiste más de 48h, consulta."
  },
  { 
    score: 50, 
    stage: 'fresh',
    message: "Requiere atención. Se detectó posible inflamación.",
    concerns: ["Inflamación detectada", "Posible infección temprana"],
    recommendations: "Limpia suavemente con jabón antibacterial. Si ves pus, enrojecimiento excesivo o fiebre, consulta a un médico."
  }
];

export default function HealingGuardianTab({
  bookingId,
  healingEntries,
  certificate,
  isLoading,
  onUploadPhoto,
  onAnalyzePhoto,
  onRequestCertificate,
  onRefresh
}: HealingGuardianTabProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dayNumber, setDayNumber] = useState(healingEntries.length + 1);
  const [clientNotes, setClientNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isRequestingCert, setIsRequestingCert] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate healing progress
  const latestEntry = healingEntries[healingEntries.length - 1];
  const averageScore = healingEntries.length > 0 
    ? healingEntries.reduce((acc, e) => acc + (e.ai_health_score || 0), 0) / healingEntries.filter(e => e.ai_health_score).length
    : 0;
  const daysSinceFirst = healingEntries.length > 0 
    ? Math.ceil((Date.now() - new Date(healingEntries[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const canRequestCertificate = daysSinceFirst >= 30 && averageScore >= 80 && !certificate;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!allowedTypes.includes(file.type)) {
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    const result = await onUploadPhoto(selectedFile, dayNumber, clientNotes);
    setIsUploading(false);
    
    if (result.success) {
      setSelectedFile(null);
      setClientNotes('');
      setShowUploadForm(false);
      setDayNumber(dayNumber + 1);
      onRefresh();
    }
  };

  const handleAnalyze = async (entryId: string) => {
    setAnalyzingId(entryId);
    await onAnalyzePhoto(entryId);
    setAnalyzingId(null);
    onRefresh();
  };

  const handleRequestCert = async () => {
    setIsRequestingCert(true);
    await onRequestCertificate();
    setIsRequestingCert(false);
    onRefresh();
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{healingEntries.length}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{averageScore ? averageScore.toFixed(0) : '--'}%</p>
            <p className="text-xs text-muted-foreground">Score Promedio</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{daysSinceFirst}</p>
            <p className="text-xs text-muted-foreground">Días</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <ThermometerSun className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <p className="text-lg font-bold">
              {latestEntry?.ai_healing_stage 
                ? HEALING_STAGES[latestEntry.ai_healing_stage as keyof typeof HEALING_STAGES]?.label || latestEntry.ai_healing_stage
                : 'Sin datos'}
            </p>
            <p className="text-xs text-muted-foreground">Etapa Actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Progreso de Curación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Progress value={Math.min((daysSinceFirst / 30) * 100, 100)} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Día 1</span>
              <span>Meta: 30 días</span>
            </div>
            {averageScore >= 80 && daysSinceFirst >= 30 && (
              <div className="flex items-center gap-2 text-green-600 mt-4">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">¡Curación completada exitosamente!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Subir Foto de Curación
              </CardTitle>
              <CardDescription>
                Máximo 10 fotos por tatuaje • JPEG, PNG, WebP
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowUploadForm(!showUploadForm)}
              disabled={healingEntries.length >= 10}
            >
              <Upload className="w-4 h-4 mr-2" />
              Nueva Foto
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {showUploadForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="space-y-4 border-t pt-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden"
                />
                
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Día del proceso</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDayNumber(Math.max(1, dayNumber - 1))}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center font-bold">{dayNumber}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setDayNumber(dayNumber + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notas (opcional)</label>
                  <Textarea
                    placeholder="¿Cómo se siente? ¿Alguna molestia?"
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    rows={2}
                    maxLength={500}
                  />
                </div>
                
                {selectedFile ? (
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <img 
                      src={URL.createObjectURL(selectedFile)} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button variant="ghost" onClick={() => setSelectedFile(null)}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Haz click para seleccionar una foto</p>
                  </div>
                )}
                
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir y Analizar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline de Curación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healingEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aún no has subido fotos de curación</p>
              <p className="text-sm">Sube tu primera foto para comenzar el seguimiento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {healingEntries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative flex gap-4 p-4 rounded-lg border ${
                    entry.requires_attention ? 'border-orange-500 bg-orange-500/5' : 'border-border'
                  }`}
                >
                  {/* Photo */}
                  {entry.photo_url && (
                    <img 
                      src={entry.photo_url} 
                      alt={`Día ${entry.day_number}`}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Día {entry.day_number}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('es-ES')}
                      </span>
                      {entry.requires_attention && (
                        <Badge variant="destructive" className="animate-pulse">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Atención
                        </Badge>
                      )}
                    </div>
                    
                    {entry.client_notes && (
                      <p className="text-sm mb-2 italic">"{entry.client_notes}"</p>
                    )}
                    
                    {entry.ai_health_score !== null ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getHealthScoreColor(entry.ai_health_score)}`}>
                            {entry.ai_health_score}%
                          </span>
                          {entry.ai_healing_stage && (
                            <Badge className={HEALING_STAGES[entry.ai_healing_stage as keyof typeof HEALING_STAGES]?.bg || ''}>
                              {HEALING_STAGES[entry.ai_healing_stage as keyof typeof HEALING_STAGES]?.label || entry.ai_healing_stage}
                            </Badge>
                          )}
                        </div>
                        
                        {entry.ai_concerns && entry.ai_concerns.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.ai_concerns.map((concern, i) => (
                              <Badge key={i} variant="outline" className="text-orange-600">
                                {concern}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {entry.ai_recommendations && (
                          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            💡 {entry.ai_recommendations}
                          </p>
                        )}
                        
                        {entry.artist_response && (
                          <div className="mt-2 p-3 bg-primary/10 rounded-lg border-l-4 border-primary">
                            <p className="text-sm font-medium mb-1">Respuesta del artista:</p>
                            <p className="text-sm">{entry.artist_response}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAnalyze(entry.id)}
                        disabled={analyzingId === entry.id}
                      >
                        {analyzingId === entry.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analizando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analizar Curación
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Certificado de Curación
          </CardTitle>
          <CardDescription>
            Recibe tu certificado digital al completar 30 días de curación exitosa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certificate ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Award className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <p className="font-bold text-lg">¡Felicidades! 🎉</p>
                <p className="text-muted-foreground">
                  Certificado #{certificate.certificate_number}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-500">{certificate.final_health_score}%</p>
                  <p className="text-xs text-muted-foreground">Score Final</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{certificate.total_photos}</p>
                  <p className="text-xs text-muted-foreground">Fotos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{certificate.healing_duration_days}</p>
                  <p className="text-xs text-muted-foreground">Días</p>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Descargar Certificado
              </Button>
            </div>
          ) : canRequestCertificate ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Award className="w-10 h-10 text-primary" />
              </div>
              <p className="font-medium">¡Ya puedes solicitar tu certificado!</p>
              <Button onClick={handleRequestCert} disabled={isRequestingCert}>
                {isRequestingCert ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Generar Certificado
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Award className="w-10 h-10 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Aún no disponible</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Necesitas al menos 30 días de seguimiento y un score promedio superior al 80%
                </p>
              </div>
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  {daysSinceFirst >= 30 ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>{daysSinceFirst}/30 días</span>
                </div>
                <div className="flex items-center gap-1">
                  {averageScore >= 80 ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>{averageScore.toFixed(0)}%/80%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
