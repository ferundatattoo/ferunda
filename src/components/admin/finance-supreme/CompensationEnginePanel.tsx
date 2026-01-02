import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Percent, DollarSign, Calendar, Users, Save, 
  TrendingUp, Sparkles, AlertTriangle, Settings2,
  Building2, PiggyBank, Calculator, Zap, RefreshCw, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CompensationRule {
  id: string;
  artistId: string;
  artistName: string;
  type: 'percentage' | 'fixed' | 'booth_rent' | 'hybrid' | 'tiered' | 'guest_spot';
  percentage?: number;
  fixedAmount?: number;
  boothRent?: number;
  tieredRates?: { min: number; max: number; rate: number }[];
  period: 'per_session' | 'weekly' | 'monthly';
  isActive: boolean;
}

interface Artist {
  id: string;
  name: string;
  avatar: string;
}

export function CompensationEnginePanel() {
  const [rules, setRules] = useState<CompensationRule[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Current editing state
  const [compType, setCompType] = useState<CompensationRule['type']>('percentage');
  const [percentage, setPercentage] = useState(50);
  const [fixedAmount, setFixedAmount] = useState(0);
  const [boothRent, setBoothRent] = useState(500);
  const [period, setPeriod] = useState<CompensationRule['period']>('per_session');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch artists
      const { data: artistsData } = await supabase
        .from('artist_profiles')
        .select('id, display_name, avatar_url')
        .limit(20);
      
      if (artistsData && artistsData.length > 0) {
        setArtists(artistsData.map(a => ({
          id: a.id,
          name: a.display_name || 'Unknown Artist',
          avatar: a.avatar_url ? '👤' : '🎨'
        })));
      } else {
        // Demo artists if no real data
        setArtists([
          { id: 'demo-1', name: 'Ferunda', avatar: '🎨' },
          { id: 'demo-2', name: 'Luna Ink', avatar: '🌙' },
          { id: 'demo-3', name: 'Shadow Art', avatar: '⚡' },
        ]);
      }

      // Fetch compensation rules - using demo data for now
      // In production, this would fetch from artist_compensation_rules table
      setRules([
        { id: '1', artistId: 'demo-1', artistName: 'Ferunda', type: 'percentage', percentage: 60, period: 'per_session', isActive: true },
        { id: '2', artistId: 'demo-2', artistName: 'Luna Ink', type: 'booth_rent', boothRent: 800, period: 'monthly', isActive: true },
        { id: '3', artistId: 'demo-3', artistName: 'Shadow Art', type: 'guest_spot', percentage: 40, fixedAmount: 200, period: 'per_session', isActive: true },
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: CompensationRule['type']) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed': return <DollarSign className="w-4 h-4" />;
      case 'booth_rent': return <Building2 className="w-4 h-4" />;
      case 'hybrid': return <Zap className="w-4 h-4" />;
      case 'tiered': return <TrendingUp className="w-4 h-4" />;
      case 'guest_spot': return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: CompensationRule['type']) => {
    switch (type) {
      case 'percentage': return 'Porcentaje';
      case 'fixed': return 'Monto Fijo';
      case 'booth_rent': return 'Renta Booth';
      case 'hybrid': return 'Híbrido';
      case 'tiered': return 'Por Niveles';
      case 'guest_spot': return 'Guest Spot';
    }
  };

  const handleSaveRule = () => {
    if (!selectedArtist) return;
    
    const artist = artists.find(a => a.id === selectedArtist);
    if (!artist) return;

    const newRule: CompensationRule = {
      id: crypto.randomUUID(),
      artistId: selectedArtist,
      artistName: artist.name,
      type: compType,
      percentage: compType === 'percentage' || compType === 'hybrid' ? percentage : undefined,
      fixedAmount: compType === 'fixed' || compType === 'hybrid' ? fixedAmount : undefined,
      boothRent: compType === 'booth_rent' ? boothRent : undefined,
      period,
      isActive: true,
    };

    setRules(prev => [...prev.filter(r => r.artistId !== selectedArtist), newRule]);
    toast.success('Regla de compensación guardada');
    setEditMode(false);
  };

  const artistForRule = (artistId: string) => {
    return artists.find(a => a.id === artistId);
  };

  const calculateProjectedEarnings = (rule: CompensationRule) => {
    const avgSessionValue = 350;
    const sessionsPerMonth = 12;
    
    switch (rule.type) {
      case 'percentage':
        return avgSessionValue * sessionsPerMonth * ((rule.percentage || 0) / 100);
      case 'fixed':
        return (rule.fixedAmount || 0) * sessionsPerMonth;
      case 'booth_rent':
        return avgSessionValue * sessionsPerMonth - (rule.boothRent || 0);
      case 'hybrid':
        return (avgSessionValue * ((rule.percentage || 0) / 100) + (rule.fixedAmount || 0)) * sessionsPerMonth;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Description */}
      <Card className="bg-gradient-to-r from-violet-500/5 via-transparent to-transparent border-violet-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <Calculator className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground">Compensation Engine</h2>
                  <Badge variant="outline" className="bg-violet-500/5 text-violet-600">Multi-Artista</Badge>
                </div>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  Configura reglas de comisión, renta de booth y splits por artista. 
                  Soporta modelos de porcentaje, monto fijo, híbrido, escalonado y guest spot.
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Splits automáticos
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Renta de booth
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Causal AI insights
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setEditMode(true)} className="gap-2">
                <Settings2 className="w-4 h-4" />
                Nueva Regla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compensation Types Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(['percentage', 'fixed', 'booth_rent', 'hybrid', 'tiered', 'guest_spot'] as const).map((type) => {
          const count = rules.filter(r => r.type === type).length;
          return (
            <Card key={type} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-4 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  {getTypeIcon(type)}
                </div>
                <p className="text-xs font-medium">{getTypeLabel(type)}</p>
                <p className="text-lg font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reglas Activas</CardTitle>
          <CardDescription>
            Causal AI: Cambios aquí afectan automáticamente payroll y forecasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    {artistForRule(rule.artistId)?.avatar || '👤'}
                  </div>
                  <div>
                    <p className="font-medium">{rule.artistName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getTypeIcon(rule.type)}
                      <span>{getTypeLabel(rule.type)}</span>
                      <span>•</span>
                      {rule.percentage && <span>{rule.percentage}%</span>}
                      {rule.fixedAmount && <span>€{rule.fixedAmount}</span>}
                      {rule.boothRent && <span>€{rule.boothRent}/mes</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Proyección Mensual</p>
                    <p className="font-semibold text-success">
                      €{calculateProjectedEarnings(rule).toLocaleString()}
                    </p>
                  </div>
                  <Switch checked={rule.isActive} />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal/Panel */}
      {editMode && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Configurar Compensación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Artist Selection */}
            <div className="space-y-2">
              <Label>Artista</Label>
              <Select value={selectedArtist || ''} onValueChange={setSelectedArtist}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar artista" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map(artist => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.avatar} {artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Compensation Type */}
            <div className="space-y-2">
              <Label>Tipo de Compensación</Label>
              <Tabs value={compType} onValueChange={(v) => setCompType(v as CompensationRule['type'])}>
                <TabsList className="grid grid-cols-3 lg:grid-cols-6">
                  <TabsTrigger value="percentage">%</TabsTrigger>
                  <TabsTrigger value="fixed">Fijo</TabsTrigger>
                  <TabsTrigger value="booth_rent">Renta</TabsTrigger>
                  <TabsTrigger value="hybrid">Híbrido</TabsTrigger>
                  <TabsTrigger value="tiered">Niveles</TabsTrigger>
                  <TabsTrigger value="guest_spot">Guest</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Dynamic Fields based on Type */}
            {(compType === 'percentage' || compType === 'hybrid') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Porcentaje</Label>
                  <span className="text-sm font-mono">{percentage}%</span>
                </div>
                <Slider
                  value={[percentage]}
                  onValueChange={([v]) => setPercentage(v)}
                  min={10}
                  max={90}
                  step={5}
                />
              </div>
            )}

            {(compType === 'fixed' || compType === 'hybrid') && (
              <div className="space-y-2">
                <Label>Monto Fijo (€)</Label>
                <Input
                  type="number"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            )}

            {compType === 'booth_rent' && (
              <div className="space-y-2">
                <Label>Renta Mensual (€)</Label>
                <Input
                  type="number"
                  value={boothRent}
                  onChange={(e) => setBoothRent(Number(e.target.value))}
                  placeholder="500"
                />
                <p className="text-xs text-muted-foreground">
                  El artista paga renta fija y conserva 100% de sus ingresos
                </p>
              </div>
            )}

            {/* Period Selection */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as CompensationRule['period'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_session">Por Sesión</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Insights */}
            <div className="p-4 rounded-xl bg-ai/10 border border-ai/20">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-ai mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Causal AI Insight</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Con {percentage}% comisión y 12 sesiones/mes promedio, 
                    el pago proyectado sería €{(350 * 12 * (percentage / 100)).toLocaleString()}/mes.
                    Esto representa un balance óptimo studio/artista.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditMode(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveRule} disabled={!selectedArtist} className="flex-1 gap-2">
                <Save className="w-4 h-4" />
                Guardar Regla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CompensationEnginePanel;
