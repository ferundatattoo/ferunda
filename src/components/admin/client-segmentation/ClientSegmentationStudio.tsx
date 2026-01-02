import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Filter,
  Target,
  Sparkles,
  DollarSign,
  Heart,
  Zap,
  AlertCircle,
  Ghost,
  Palette,
  Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClientSegment {
  id: string;
  segment_key: string;
  display_name: string | null;
  description: string | null;
  rules_builder: {
    conditions?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
    logic?: string;
  };
  color: string;
  icon: string;
  priority: number;
  active: boolean;
  member_count: number;
}

interface SegmentMembership {
  id: string;
  client_id: string;
  segment_key: string;
  confidence: number;
  signals: Record<string, unknown>;
}

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  'dollar-sign': <DollarSign className="h-4 w-4" />,
  'heart': <Heart className="h-4 w-4" />,
  'zap': <Zap className="h-4 w-4" />,
  'ghost': <Ghost className="h-4 w-4" />,
  'alert': <AlertCircle className="h-4 w-4" />,
  'palette': <Palette className="h-4 w-4" />,
  'target': <Target className="h-4 w-4" />,
  'sparkles': <Sparkles className="h-4 w-4" />,
  'users': <Users className="h-4 w-4" />,
};

const FIELD_OPTIONS = [
  { value: 'estimated_budget', label: 'Estimated Budget' },
  { value: 'is_first_tattoo', label: 'Is First Tattoo' },
  { value: 'tattoo_count', label: 'Tattoo Count' },
  { value: 'avg_response_time', label: 'Avg Response Time (min)' },
  { value: 'ghost_probability', label: 'Ghost Probability' },
  { value: 'anxiety_detected', label: 'Anxiety Detected' },
  { value: 'project_type', label: 'Project Type' },
  { value: 'channel', label: 'Source Channel' },
  { value: 'sentiment_score', label: 'Sentiment Score' },
];

const OPERATOR_OPTIONS = [
  { value: '=', label: 'equals' },
  { value: '!=', label: 'not equals' },
  { value: '>', label: 'greater than' },
  { value: '>=', label: 'greater or equal' },
  { value: '<', label: 'less than' },
  { value: '<=', label: 'less or equal' },
  { value: 'in', label: 'in list' },
  { value: 'contains', label: 'contains' },
];

export function ClientSegmentationStudio() {
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSegment, setEditingSegment] = useState<ClientSegment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  const createDefaultSegments = async () => {
    const defaultSegments = [
      {
        segment_key: 'high_budget',
        display_name: 'High Budget',
        description: 'Clients with estimated budget over $500',
        color: '#10b981',
        icon: 'dollar-sign',
        priority: 100,
        active: true,
        rules_builder: { conditions: [{ field: 'estimated_budget', operator: '>=', value: 500 }], logic: 'AND' }
      },
      {
        segment_key: 'first_timers',
        display_name: 'First Timers',
        description: 'Clients getting their first tattoo',
        color: '#8b5cf6',
        icon: 'sparkles',
        priority: 80,
        active: true,
        rules_builder: { conditions: [{ field: 'is_first_tattoo', operator: '=', value: true }], logic: 'AND' }
      },
      {
        segment_key: 'at_risk',
        display_name: 'At Risk',
        description: 'Clients with high ghost probability',
        color: '#f59e0b',
        icon: 'alert',
        priority: 90,
        active: true,
        rules_builder: { conditions: [{ field: 'ghost_probability', operator: '>=', value: 0.6 }], logic: 'AND' }
      },
      {
        segment_key: 'repeat_clients',
        display_name: 'Repeat Clients',
        description: 'Clients with 2+ tattoos',
        color: '#ec4899',
        icon: 'heart',
        priority: 70,
        active: true,
        rules_builder: { conditions: [{ field: 'tattoo_count', operator: '>=', value: 2 }], logic: 'AND' }
      },
      {
        segment_key: 'vip',
        display_name: 'VIP Clients',
        description: 'High value repeat clients',
        color: '#f97316',
        icon: 'zap',
        priority: 110,
        active: true,
        rules_builder: { conditions: [{ field: 'estimated_budget', operator: '>=', value: 1000 }, { field: 'tattoo_count', operator: '>=', value: 3 }], logic: 'AND' }
      }
    ];

    try {
      const { error } = await supabase.from('client_segments').insert(defaultSegments);
      if (error) throw error;
      toast.success('Default segments created!');
      fetchSegments();
    } catch (err) {
      console.error('Error creating default segments:', err);
      toast.error('Failed to create default segments');
    }
  };

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_segments')
        .select('*')
        .order('priority', { ascending: false });

      if (data) {
        setSegments(data.map(s => ({
          ...s,
          rules_builder: (s.rules_builder as unknown as ClientSegment['rules_builder']) || { conditions: [], logic: 'AND' }
        })));
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSegment = async (segment: ClientSegment) => {
    const { error } = await supabase
      .from('client_segments')
      .update({ active: !segment.active })
      .eq('id', segment.id);

    if (!error) {
      fetchSegments();
      toast.success(`Segment ${segment.active ? 'deactivated' : 'activated'}`);
    }
  };

  const deleteSegment = async (segmentId: string) => {
    const { error } = await supabase
      .from('client_segments')
      .delete()
      .eq('id', segmentId);

    if (!error) {
      fetchSegments();
      toast.success('Segment deleted');
    }
  };

  const saveSegment = async (segment: Partial<ClientSegment>) => {
    const dbSegment = {
      segment_key: segment.segment_key,
      display_name: segment.display_name,
      description: segment.description,
      color: segment.color,
      icon: segment.icon,
      priority: segment.priority,
      active: segment.active,
      rules_builder: JSON.parse(JSON.stringify(segment.rules_builder || { conditions: [], logic: 'AND' }))
    };
    
    if (editingSegment?.id) {
      const { error } = await supabase
        .from('client_segments')
        .update(dbSegment)
        .eq('id', editingSegment.id);

      if (!error) {
        toast.success('Segment updated');
        setIsDialogOpen(false);
        fetchSegments();
      }
    } else {
      const { error } = await supabase
        .from('client_segments')
        .insert([{ ...dbSegment, segment_key: segment.segment_key! }]);

      if (!error) {
        toast.success('Segment created');
        setIsDialogOpen(false);
        fetchSegments();
      }
    }
  };

  const getSegmentIcon = (iconName: string) => {
    return SEGMENT_ICONS[iconName] || <Users className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with Description */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    Client Segmentation
                  </h2>
                  <Badge variant="outline" className="bg-primary/5">AI-Powered</Badge>
                </div>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  Clasifica automáticamente a tus clientes según su comportamiento, presupuesto y probabilidad de conversión. 
                  Crea segmentos personalizados para campañas de marketing y atención diferenciada.
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Auto-clasificación en tiempo real
                  </span>
                  <span className="flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Reglas personalizables
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Marketing dirigido
                  </span>
                </div>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingSegment(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Segment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingSegment ? 'Edit Segment' : 'Create New Segment'}
                  </DialogTitle>
                </DialogHeader>
                <SegmentEditor 
                  segment={editingSegment}
                  onSave={saveSegment}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Segments</p>
            <p className="text-2xl font-bold">{segments.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-4">
            <p className="text-xs text-emerald-600">Active</p>
            <p className="text-2xl font-bold text-emerald-600">
              {segments.filter(s => s.active).length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-600">Total Members</p>
            <p className="text-2xl font-bold text-amber-600">
              {segments.reduce((acc, s) => acc + s.member_count, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-4">
            <p className="text-xs text-purple-600">Auto-Segmented</p>
            <p className="text-2xl font-bold text-purple-600">
              {segments.filter(s => s.rules_builder?.conditions?.length > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Segments Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Segments</CardTitle>
          <CardDescription>
            Define rules to automatically categorize clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {segments.map((segment, idx) => (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-4 rounded-lg border transition-all ${
                      segment.active 
                        ? 'bg-card border-border' 
                        : 'bg-muted/30 border-border/50 opacity-60'
                    }`}
                    style={{ borderLeftColor: segment.color, borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${segment.color}20` }}
                        >
                          {getSegmentIcon(segment.icon)}
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {segment.display_name || segment.segment_key}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {segment.member_count} members
                          </p>
                        </div>
                      </div>
                      <Switch 
                        checked={segment.active}
                        onCheckedChange={() => toggleSegment(segment)}
                      />
                    </div>

                    {segment.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {segment.description}
                      </p>
                    )}

                    {/* Rules Preview */}
                    {segment.rules_builder?.conditions?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-1">Rules:</p>
                        <div className="flex flex-wrap gap-1">
                          {segment.rules_builder.conditions.slice(0, 2).map((condition, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {condition.field} {condition.operator} {String(condition.value)}
                            </Badge>
                          ))}
                          {segment.rules_builder.conditions.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{segment.rules_builder.conditions.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        Priority: {segment.priority}
                      </Badge>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingSegment(segment);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteSegment(segment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {segments.length === 0 && !loading && (
                <div className="col-span-full text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No segments configured yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Segments help you automatically categorize clients based on their behavior, budget, and history for personalized experiences.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={createDefaultSegments}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Default Segments
                    </Button>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Custom Segment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function SegmentEditor({ 
  segment, 
  onSave, 
  onCancel 
}: { 
  segment: ClientSegment | null;
  onSave: (segment: Partial<ClientSegment>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<ClientSegment>>({
    segment_key: segment?.segment_key || '',
    display_name: segment?.display_name || '',
    description: segment?.description || '',
    color: segment?.color || '#6366f1',
    icon: segment?.icon || 'users',
    priority: segment?.priority || 0,
    active: segment?.active ?? true,
    rules_builder: segment?.rules_builder || { conditions: [], logic: 'AND' as const }
  });

  const addCondition = () => {
    const newConditions = [
      ...(formData.rules_builder?.conditions || []),
      { field: 'estimated_budget', operator: '>=', value: 0 }
    ];
    setFormData({
      ...formData,
      rules_builder: { ...formData.rules_builder, conditions: newConditions, logic: formData.rules_builder?.logic || 'AND' }
    });
  };

  const updateCondition = (index: number, updates: Partial<{ field: string; operator: string; value: unknown }>) => {
    const newConditions = [...(formData.rules_builder?.conditions || [])];
    newConditions[index] = { ...newConditions[index], ...updates };
    setFormData({
      ...formData,
      rules_builder: { ...formData.rules_builder, conditions: newConditions, logic: formData.rules_builder?.logic || 'AND' }
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = (formData.rules_builder?.conditions || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      rules_builder: { ...formData.rules_builder, conditions: newConditions, logic: formData.rules_builder?.logic || 'AND' }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Segment Key</Label>
          <Input 
            value={formData.segment_key}
            onChange={(e) => setFormData({ ...formData, segment_key: e.target.value })}
            placeholder="e.g., high_budget"
          />
        </div>
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input 
            value={formData.display_name || ''}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            placeholder="e.g., High Budget"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea 
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this segment represents..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Color</Label>
          <Input 
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Input 
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Active</Label>
          <div className="pt-2">
            <Switch 
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
        </div>
      </div>

      {/* Rules Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Segmentation Rules</Label>
          <div className="flex items-center gap-2">
            <Select 
              value={formData.rules_builder?.logic || 'AND'}
              onValueChange={(value: 'AND' | 'OR') => setFormData({
                ...formData,
                rules_builder: { ...formData.rules_builder, conditions: formData.rules_builder?.conditions || [], logic: value }
              })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addCondition}>
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {formData.rules_builder?.conditions?.map((condition, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <Select 
                value={condition.field}
                onValueChange={(value) => updateCondition(idx, { field: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={condition.operator}
                onValueChange={(value) => updateCondition(idx, { operator: value })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input 
                value={String(condition.value)}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                className="flex-1"
                placeholder="Value"
              />

              <Button 
                size="icon" 
                variant="ghost"
                className="text-destructive"
                onClick={() => removeCondition(idx)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {(!formData.rules_builder?.conditions || formData.rules_builder.conditions.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No rules defined. Add rules to auto-segment clients.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>
          <Save className="h-4 w-4 mr-2" />
          Save Segment
        </Button>
      </div>
    </div>
  );
}

export default ClientSegmentationStudio;
