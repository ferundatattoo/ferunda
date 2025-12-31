import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, DollarSign, Gauge, Settings, Save, RotateCcw, 
  TrendingUp, Brain, AlertTriangle, Palette, User, Zap 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SessionConfig {
  id?: string;
  artist_id?: string;
  
  // Speeds
  default_speed_cm2_hour: number;
  geometric_speed_cm2_hour: number;
  micro_realism_speed_cm2_hour: number;
  fine_line_speed_cm2_hour: number;
  color_speed_cm2_hour: number;
  
  // Session prefs
  max_session_hours: number;
  min_session_hours: number;
  preferred_session_hours: number;
  break_frequency_hours: number;
  break_duration_minutes: number;
  max_clients_per_day: number;
  
  // Multipliers
  dark_skin_multiplier: number;
  aged_skin_multiplier: number;
  keloid_prone_multiplier: number;
  sensitive_area_multiplier: number;
  coverup_multiplier: number;
  rework_multiplier: number;
  
  // Revenue
  hourly_rate: number;
  deposit_percentage: number;
  upsell_threshold_sessions: number;
  
  // ML
  ml_learning_enabled: boolean;
}

const DEFAULT_CONFIG: SessionConfig = {
  default_speed_cm2_hour: 20,
  geometric_speed_cm2_hour: 25,
  micro_realism_speed_cm2_hour: 12,
  fine_line_speed_cm2_hour: 30,
  color_speed_cm2_hour: 15,
  max_session_hours: 5,
  min_session_hours: 2,
  preferred_session_hours: 4,
  break_frequency_hours: 2,
  break_duration_minutes: 15,
  max_clients_per_day: 2,
  dark_skin_multiplier: 1.3,
  aged_skin_multiplier: 1.2,
  keloid_prone_multiplier: 1.5,
  sensitive_area_multiplier: 1.4,
  coverup_multiplier: 1.6,
  rework_multiplier: 1.3,
  hourly_rate: 200,
  deposit_percentage: 30,
  upsell_threshold_sessions: 3,
  ml_learning_enabled: true
};

interface SessionConfigManagerProps {
  artistId?: string;
}

const SessionConfigManager: React.FC<SessionConfigManagerProps> = ({ artistId }) => {
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, [artistId]);

  const fetchConfig = async () => {
    if (!artistId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('artist_session_config')
        .select('*')
        .eq('artist_id', artistId)
        .single();

      if (data) {
        setConfig(data as SessionConfig);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: keyof SessionConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveConfig = async () => {
    if (!artistId) {
      toast({
        title: "Error",
        description: "No se encontró ID de artista",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('artist_session_config')
        .upsert({
          artist_id: artistId,
          ...config,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'artist_id'
        });

      if (error) throw error;

      toast({
        title: "Configuración guardada",
        description: "Tus ajustes se aplicarán a futuras estimaciones"
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  // Calculate example estimation
  const exampleHours = (100 * 1.5) / config.default_speed_cm2_hour; // 100cm², moderate complexity
  const exampleSessions = Math.ceil(exampleHours / config.max_session_hours);
  const exampleRevenue = exampleHours * config.hourly_rate;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuración de Sesiones</h2>
          <p className="text-muted-foreground">
            Ajusta parámetros para estimaciones precisas basadas en tu velocidad real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Defaults
          </Button>
          <Button onClick={saveConfig} disabled={saving || !hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Example Preview */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Ejemplo (100cm², moderado):</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium">{exampleHours.toFixed(1)}h totales</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">{exampleSessions} sesiones</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium text-green-500">${exampleRevenue.toFixed(0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="speed" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="speed" className="flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Velocidad
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Sesiones
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Ajustes
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Revenue
          </TabsTrigger>
        </TabsList>

        {/* Speed Tab */}
        <TabsContent value="speed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                Velocidad por Estilo
              </CardTitle>
              <CardDescription>
                cm² por hora que tatúas en promedio para cada estilo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'default_speed_cm2_hour', label: 'Default', icon: Palette, color: 'text-muted-foreground' },
                { key: 'geometric_speed_cm2_hour', label: 'Geométrico', icon: Palette, color: 'text-blue-500' },
                { key: 'micro_realism_speed_cm2_hour', label: 'Micro-Realismo', icon: Palette, color: 'text-purple-500' },
                { key: 'fine_line_speed_cm2_hour', label: 'Fine Line', icon: Palette, color: 'text-green-500' },
                { key: 'color_speed_cm2_hour', label: 'Color Work', icon: Palette, color: 'text-orange-500' }
              ].map(({ key, label, icon: Icon, color }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      {label}
                    </Label>
                    <span className="text-sm font-medium">
                      {config[key as keyof SessionConfig]} cm²/h
                    </span>
                  </div>
                  <Slider
                    value={[config[key as keyof SessionConfig] as number]}
                    onValueChange={([v]) => updateConfig(key as keyof SessionConfig, v)}
                    min={5}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 (detallado)</span>
                    <span>50 (rápido)</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Preferencias de Sesión
              </CardTitle>
              <CardDescription>
                Duración y estructura de tus sesiones de trabajo
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Máximo horas por sesión</Label>
                  <Input
                    type="number"
                    value={config.max_session_hours}
                    onChange={(e) => updateConfig('max_session_hours', Number(e.target.value))}
                    min={1}
                    max={12}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mínimo horas por sesión</Label>
                  <Input
                    type="number"
                    value={config.min_session_hours}
                    onChange={(e) => updateConfig('min_session_hours', Number(e.target.value))}
                    min={1}
                    max={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horas preferidas por sesión</Label>
                  <Input
                    type="number"
                    value={config.preferred_session_hours}
                    onChange={(e) => updateConfig('preferred_session_hours', Number(e.target.value))}
                    min={1}
                    max={8}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Break cada X horas</Label>
                  <Input
                    type="number"
                    value={config.break_frequency_hours}
                    onChange={(e) => updateConfig('break_frequency_hours', Number(e.target.value))}
                    min={1}
                    max={4}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración break (minutos)</Label>
                  <Input
                    type="number"
                    value={config.break_duration_minutes}
                    onChange={(e) => updateConfig('break_duration_minutes', Number(e.target.value))}
                    min={5}
                    max={30}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. clientes por día</Label>
                  <Input
                    type="number"
                    value={config.max_clients_per_day}
                    onChange={(e) => updateConfig('max_clients_per_day', Number(e.target.value))}
                    min={1}
                    max={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adjustments Tab */}
        <TabsContent value="adjustments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Multiplicadores de Ajuste
              </CardTitle>
              <CardDescription>
                Factores que incrementan tiempo según condiciones del cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'dark_skin_multiplier', label: 'Piel oscura (Fitzpatrick V-VI)', desc: 'Requiere más pasadas para saturación' },
                { key: 'aged_skin_multiplier', label: 'Piel madura', desc: 'Mayor cuidado y tiempo de healing' },
                { key: 'keloid_prone_multiplier', label: 'Tendencia a queloides', desc: 'Técnica más conservadora' },
                { key: 'sensitive_area_multiplier', label: 'Zona sensible', desc: 'Más breaks, trabajo más lento' },
                { key: 'coverup_multiplier', label: 'Coverup', desc: 'Diseño y técnica adicional' },
                { key: 'rework_multiplier', label: 'Rework', desc: 'Corregir trabajo previo' }
              ].map(({ key, label, desc }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      +{(((config[key as keyof SessionConfig] as number) - 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(config[key as keyof SessionConfig] as number) * 100]}
                    onValueChange={([v]) => updateConfig(key as keyof SessionConfig, v / 100)}
                    min={100}
                    max={200}
                    step={5}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Configuración de Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Tarifa por hora (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={config.hourly_rate}
                      onChange={(e) => updateConfig('hourly_rate', Number(e.target.value))}
                      className="pl-9"
                      min={50}
                      max={500}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Porcentaje de depósito</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={config.deposit_percentage}
                      onChange={(e) => updateConfig('deposit_percentage', Number(e.target.value))}
                      min={10}
                      max={50}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Umbral para upsells (sesiones)</Label>
                  <Input
                    type="number"
                    value={config.upsell_threshold_sessions}
                    onChange={(e) => updateConfig('upsell_threshold_sessions', Number(e.target.value))}
                    min={2}
                    max={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ofrecer extras cuando proyecto tenga ≥ este número de sesiones
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  Machine Learning
                </CardTitle>
                <CardDescription>
                  Aprende de tus sesiones reales para mejorar estimaciones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Aprendizaje automático</p>
                    <p className="text-sm text-muted-foreground">
                      Ajusta estimaciones basándose en tu historial de sesiones
                    </p>
                  </div>
                  <Switch
                    checked={config.ml_learning_enabled}
                    onCheckedChange={(checked) => updateConfig('ml_learning_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SessionConfigManager;
