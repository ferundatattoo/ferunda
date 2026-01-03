import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Lock, Unlock, DollarSign, Package, Sparkles, Save, 
  RefreshCw, Trash2, Plus, Settings, Layers, Crown 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EtherealModule {
  id: string;
  module_key: string;
  display_name: string;
  description: string | null;
  category: 'core' | 'lite' | 'pro' | 'addon';
  icon: string | null;
  route: string | null;
  solo_addon_price: number | null;
  studio_addon_price: number | null;
  is_always_free: boolean;
  is_locked: boolean;
  lock_message: string | null;
  features: string[];
  sort_order: number;
}

interface EtherealBundle {
  id: string;
  name: string;
  description: string | null;
  modules: string[];
  solo_price: number | null;
  studio_price: number | null;
  discount_percent: number;
  is_active: boolean;
}

export function ModuleControlPanel() {
  const queryClient = useQueryClient();
  const [editingBundle, setEditingBundle] = useState<EtherealBundle | null>(null);
  const [newBundle, setNewBundle] = useState<Partial<EtherealBundle>>({
    name: '',
    description: '',
    modules: [],
    solo_price: null,
    studio_price: null,
    discount_percent: 0,
    is_active: true,
  });

  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading, refetch: refetchModules } = useQuery({
    queryKey: ['admin-ethereal-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ethereal_modules')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as EtherealModule[];
    },
  });

  // Fetch bundles
  const { data: bundles = [], refetch: refetchBundles } = useQuery({
    queryKey: ['admin-ethereal-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ethereal_bundles')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as EtherealBundle[];
    },
  });

  // Update module mutation
  const updateModule = useMutation({
    mutationFn: async (updates: Partial<EtherealModule> & { id: string }) => {
      const { error } = await supabase
        .from('ethereal_modules')
        .update(updates)
        .eq('id', updates.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ethereal-modules'] });
      queryClient.invalidateQueries({ queryKey: ['ethereal-modules'] });
      toast.success('Module updated');
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // Create bundle mutation
  const createBundle = useMutation({
    mutationFn: async (bundle: Partial<EtherealBundle>) => {
      const insertData = {
        name: bundle.name || '',
        modules: bundle.modules || [],
        description: bundle.description,
        solo_price: bundle.solo_price,
        studio_price: bundle.studio_price,
        discount_percent: bundle.discount_percent || 0,
        is_active: bundle.is_active ?? true,
      };
      const { error } = await supabase
        .from('ethereal_bundles')
        .insert([insertData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ethereal-bundles'] });
      setNewBundle({ name: '', description: '', modules: [], solo_price: null, studio_price: null, discount_percent: 0, is_active: true });
      toast.success('Bundle created');
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // Delete bundle mutation
  const deleteBundle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ethereal_bundles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ethereal-bundles'] });
      toast.success('Bundle deleted');
    },
  });

  // Toggle bundle active
  const toggleBundle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ethereal_bundles')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ethereal-bundles'] });
    },
  });

  const handleModuleLockToggle = (module: EtherealModule) => {
    if (module.is_always_free) {
      toast.error('Core modules cannot be locked');
      return;
    }
    updateModule.mutate({ id: module.id, is_locked: !module.is_locked });
  };

  const handlePriceChange = (module: EtherealModule, type: 'solo' | 'studio', value: string) => {
    const price = value ? parseFloat(value) : null;
    if (type === 'solo') {
      updateModule.mutate({ id: module.id, solo_addon_price: price });
    } else {
      updateModule.mutate({ id: module.id, studio_addon_price: price });
    }
  };

  const toggleModuleInBundle = (moduleKey: string) => {
    const current = newBundle.modules || [];
    if (current.includes(moduleKey)) {
      setNewBundle({ ...newBundle, modules: current.filter(m => m !== moduleKey) });
    } else {
      setNewBundle({ ...newBundle, modules: [...current, moduleKey] });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'lite': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pro': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'addon': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (modulesLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading modules...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            ETHEREAL Module Control
          </h2>
          <p className="text-muted-foreground">Manage access and pricing for all modules</p>
        </div>
        <Button variant="outline" onClick={() => { refetchModules(); refetchBundles(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="modules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="modules" className="gap-2">
            <Layers className="w-4 h-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="bundles" className="gap-2">
            <Package className="w-4 h-4" />
            Bundles
          </TabsTrigger>
        </TabsList>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <div className="grid gap-4">
            {modules.map((module) => (
              <Card key={module.id} className={cn(
                "transition-all",
                module.is_locked && "border-amber-500/30 bg-amber-500/5"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Module Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{module.display_name}</h3>
                        <Badge variant="outline" className={getCategoryColor(module.category)}>
                          {module.category}
                        </Badge>
                        {module.is_always_free && (
                          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <Crown className="w-3 h-3 mr-1" />
                            Core
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{module.description}</p>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">{module.module_key}</code>
                    </div>

                    {/* Lock Toggle */}
                    <div className="flex flex-col items-center gap-1">
                      <Label className="text-xs text-muted-foreground">
                        {module.is_locked ? 'Locked' : 'Free'}
                      </Label>
                      <Button
                        variant={module.is_locked ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleModuleLockToggle(module)}
                        disabled={module.is_always_free}
                        className="gap-1"
                      >
                        {module.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Pricing */}
                    <div className="flex gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Solo Price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={module.solo_addon_price ?? ''}
                            onChange={(e) => handlePriceChange(module, 'solo', e.target.value)}
                            className="w-24 pl-7 h-8"
                            disabled={module.is_always_free}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Studio Price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            placeholder="0"
                            value={module.studio_addon_price ?? ''}
                            onChange={(e) => handlePriceChange(module, 'studio', e.target.value)}
                            className="w-24 pl-7 h-8"
                            disabled={module.is_always_free}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Bundles Tab */}
        <TabsContent value="bundles" className="space-y-6">
          {/* Create New Bundle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create New Bundle
              </CardTitle>
              <CardDescription>
                Bundle multiple modules together at a discounted price
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bundle Name</Label>
                  <Input
                    placeholder="e.g., Pro Pack"
                    value={newBundle.name || ''}
                    onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    placeholder="20"
                    value={newBundle.discount_percent || ''}
                    onChange={(e) => setNewBundle({ ...newBundle, discount_percent: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What's included in this bundle..."
                  value={newBundle.description || ''}
                  onChange={(e) => setNewBundle({ ...newBundle, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Solo Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="49"
                      value={newBundle.solo_price ?? ''}
                      onChange={(e) => setNewBundle({ ...newBundle, solo_price: e.target.value ? parseFloat(e.target.value) : null })}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Studio Price</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="99"
                      value={newBundle.studio_price ?? ''}
                      onChange={(e) => setNewBundle({ ...newBundle, studio_price: e.target.value ? parseFloat(e.target.value) : null })}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Modules</Label>
                <div className="flex flex-wrap gap-2">
                  {modules.filter(m => !m.is_always_free).map((module) => (
                    <Badge
                      key={module.module_key}
                      variant={newBundle.modules?.includes(module.module_key) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleModuleInBundle(module.module_key)}
                    >
                      {module.display_name}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => createBundle.mutate(newBundle)}
                disabled={!newBundle.name || !newBundle.modules?.length}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                Create Bundle
              </Button>
            </CardContent>
          </Card>

          {/* Existing Bundles */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Existing Bundles</h3>
            {bundles.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No bundles created yet
              </Card>
            ) : (
              <div className="grid gap-4">
                {bundles.map((bundle) => (
                  <Card key={bundle.id} className={cn(
                    !bundle.is_active && "opacity-60"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{bundle.name}</h4>
                            {bundle.discount_percent > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {bundle.discount_percent}% off
                              </Badge>
                            )}
                            {!bundle.is_active && (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{bundle.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {bundle.modules.map((mod) => (
                              <Badge key={mod} variant="outline" className="text-xs">{mod}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            {bundle.solo_price && (
                              <div className="text-sm">Solo: <span className="font-semibold">${bundle.solo_price}</span></div>
                            )}
                            {bundle.studio_price && (
                              <div className="text-sm">Studio: <span className="font-semibold">${bundle.studio_price}</span></div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={bundle.is_active}
                              onCheckedChange={(checked) => toggleBundle.mutate({ id: bundle.id, is_active: checked })}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBundle.mutate(bundle.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ModuleControlPanel;
