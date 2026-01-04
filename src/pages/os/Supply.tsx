import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, ShoppingCart, Truck, Wrench, AlertTriangle,
  Plus, Search, RefreshCw, Loader2, Building2, TrendingUp,
  Sparkles, Zap, ChevronRight, DollarSign, BarChart3, Activity
} from 'lucide-react';
import { useSupplyData, InventoryItem } from '@/hooks/useSupplyData';

const CATEGORIES = [
  { value: 'tintas', label: 'Tintas' },
  { value: 'agujas', label: 'Agujas' },
  { value: 'proteccion', label: 'Protección' },
  { value: 'aftercare', label: 'Aftercare' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'otros', label: 'Otros' },
];

const OSSupply = () => {
  const { 
    inventory, purchaseOrders, equipment, stats, loading, 
    refresh, addInventoryItem, deleteInventoryItem, addEquipment,
    realtimeStatus
  } = useSupplyData();
  
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addEquipDialogOpen, setAddEquipDialogOpen] = useState(false);
  
  const [newItem, setNewItem] = useState({
    name: '', category: 'otros', current_stock: 0, min_stock: 5, unit: 'unidad', unit_cost: 0,
  });
  
  const [newEquipment, setNewEquipment] = useState({
    name: '', category: 'machine', status: 'operational', serial_number: '',
  });

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return 'critical';
    if (item.current_stock <= item.min_stock) return 'low';
    return 'ok';
  };

  const handleAddItem = async () => {
    if (!newItem.name) return;
    await addInventoryItem(newItem);
    setNewItem({ name: '', category: 'otros', current_stock: 0, min_stock: 5, unit: 'unidad', unit_cost: 0 });
    setAddDialogOpen(false);
  };

  const handleAddEquipment = async () => {
    if (!newEquipment.name) return;
    await addEquipment({ ...newEquipment, serial_number: newEquipment.serial_number || null });
    setNewEquipment({ name: '', category: 'machine', status: 'operational', serial_number: '' });
    setAddEquipDialogOpen(false);
  };

  const statCards = [
    { label: "Total Items", value: stats.totalItems, icon: Package, color: "from-blue-500 to-cyan-500" },
    { label: "Stock Bajo", value: stats.lowStockCount, icon: AlertTriangle, color: "from-amber-500 to-orange-500", alert: stats.lowStockCount > 0 },
    { label: "Órdenes Pendientes", value: stats.pendingOrders, icon: Truck, color: "from-purple-500 to-pink-500" },
    { label: "Equipamiento", value: stats.totalEquipment, icon: Wrench, color: "from-emerald-500 to-green-500", sub: stats.maintenanceDue > 0 ? `${stats.maintenanceDue} mant.` : null }
  ];

  const inventoryValue = inventory.reduce((acc, item) => acc + (item.current_stock * (item.unit_cost || 0)), 0);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/5 border border-emerald-500/20">
              <Package className="w-6 h-6 text-emerald-500" />
            </div>
            Supply Chain
          </h1>
          <p className="text-muted-foreground mt-2">
            Inventario, órdenes de compra y equipamiento
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Realtime Status Badge - VIVO SUPREMO */}
          <Badge 
            variant="outline" 
            className={
              realtimeStatus === 'connected' 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : realtimeStatus === 'connecting'
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-muted/50 text-muted-foreground border-border/50"
            }
          >
            <Activity className={`w-3 h-3 mr-1 ${realtimeStatus === 'connected' ? 'animate-pulse' : ''}`} />
            {realtimeStatus === 'connected' ? 'Vivo' : realtimeStatus === 'connecting' ? 'Sync...' : 'Offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600">
                <Plus className="w-4 h-4" />
                Nuevo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
              <DialogHeader>
                <DialogTitle>Agregar Item de Inventario</DialogTitle>
                <DialogDescription>Añade un nuevo item a tu inventario</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nombre</Label>
                  <Input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej: Tinta negra 30ml" className="bg-background/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Categoría</Label>
                    <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                      <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">{CATEGORIES.map(cat => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Unidad</Label>
                    <Input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="bg-background/50" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label>Stock Actual</Label>
                    <Input type="number" value={newItem.current_stock} onChange={(e) => setNewItem({ ...newItem, current_stock: parseInt(e.target.value) || 0 })} className="bg-background/50" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Stock Mínimo</Label>
                    <Input type="number" value={newItem.min_stock} onChange={(e) => setNewItem({ ...newItem, min_stock: parseInt(e.target.value) || 0 })} className="bg-background/50" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Costo ($)</Label>
                    <Input type="number" step="0.01" value={newItem.unit_cost} onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })} className="bg-background/50" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddItem} disabled={!newItem.name}>Agregar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`relative overflow-hidden bg-card/30 backdrop-blur-xl border-border/50 hover:border-emerald-500/30 transition-all group ${stat.alert ? 'border-amber-500/50' : ''}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.alert ? 'text-amber-500' : ''}`}>{loading ? "..." : stat.value}</p>
                    {stat.sub && <p className="text-xs text-amber-500">{stat.sub}</p>}
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Inventory Value & AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-card/30 backdrop-blur-xl border-border/50 h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10">
                  <DollarSign className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total Inventario</p>
                  <p className="text-2xl font-bold">${inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/20 h-full">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">AI Supply Insights</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.lowStockCount > 0 
                      ? `${stats.lowStockCount} items necesitan restock. Considera crear orden de compra.`
                      : "Inventario en niveles óptimos. Próxima revisión sugerida en 7 días."
                    }
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400">
                      <Zap className="w-3 h-3 mr-1" />
                      Auto-reorder activo
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card/30 backdrop-blur-xl border border-border/50 p-1">
            <TabsTrigger value="inventory" className="flex items-center gap-2 data-[state=active]:bg-emerald-500/20">
              <Package className="w-4 h-4" />
              Inventario
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 data-[state=active]:bg-emerald-500/20">
              <ShoppingCart className="w-4 h-4" />
              Órdenes
              {stats.pendingOrders > 0 && <Badge variant="secondary" className="ml-1">{stats.pendingOrders}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-2 data-[state=active]:bg-emerald-500/20">
              <Wrench className="w-4 h-4" />
              Equipamiento
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center gap-2 data-[state=active]:bg-emerald-500/20">
              <Building2 className="w-4 h-4" />
              Proveedores
            </TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar items..." className="pl-10 bg-background/50 backdrop-blur-sm border-border/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : filteredInventory.length === 0 ? (
              <Card className="bg-card/30 backdrop-blur-xl border-border/50">
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay items en inventario</p>
                  <Button variant="outline" className="mt-4" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Primer Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {filteredInventory.map((item, index) => {
                    const status = getStockStatus(item);
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: index * 0.03 }}>
                        <Card className="bg-card/30 backdrop-blur-xl border-border/50 hover:border-emerald-500/30 transition-all group cursor-pointer">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                  <p className="font-medium group-hover:text-emerald-400 transition-colors">{item.name}</p>
                                  <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-semibold">{item.current_stock} {item.unit}</p>
                                  <p className="text-xs text-muted-foreground">Mín: {item.min_stock}</p>
                                </div>
                                <Badge className={
                                  status === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : status === 'low' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                }>
                                  {status === 'critical' ? 'Sin Stock' : status === 'low' ? 'Bajo' : 'OK'}
                                </Badge>
                                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <Card className="bg-card/30 backdrop-blur-xl border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Órdenes de Compra</CardTitle>
                    <CardDescription>Gestiona tus órdenes a proveedores</CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nueva Orden
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {purchaseOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay órdenes de compra</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {purchaseOrders.map((order, i) => (
                      <motion.div key={order.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-purple-500" />
                          </div>
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">{order.supplier_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-semibold">{order.currency} {order.total_amount?.toFixed(2)}</p>
                          <Badge variant="outline" className="capitalize">{order.status}</Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="mt-6 space-y-4">
            <div className="flex justify-end">
              <Dialog open={addEquipDialogOpen} onOpenChange={setAddEquipDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Agregar Equipo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
                  <DialogHeader>
                    <DialogTitle>Agregar Equipamiento</DialogTitle>
                    <DialogDescription>Registra nuevo equipo del estudio</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Nombre</Label>
                      <Input value={newEquipment.name} onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })} placeholder="Ej: Máquina rotativa" className="bg-background/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Categoría</Label>
                        <Select value={newEquipment.category} onValueChange={(v) => setNewEquipment({ ...newEquipment, category: v })}>
                          <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="machine">Máquina</SelectItem>
                            <SelectItem value="furniture">Mobiliario</SelectItem>
                            <SelectItem value="lighting">Iluminación</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Estado</Label>
                        <Select value={newEquipment.status} onValueChange={(v) => setNewEquipment({ ...newEquipment, status: v })}>
                          <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="operational">Operativo</SelectItem>
                            <SelectItem value="maintenance">Mantenimiento</SelectItem>
                            <SelectItem value="retired">Retirado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Número de Serie (opcional)</Label>
                      <Input value={newEquipment.serial_number} onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })} className="bg-background/50" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddEquipDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAddEquipment} disabled={!newEquipment.name}>Agregar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {equipment.length === 0 ? (
              <Card className="bg-card/30 backdrop-blur-xl border-border/50">
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay equipamiento registrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipment.map((eq, i) => (
                  <motion.div key={eq.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <Card className="bg-card/30 backdrop-blur-xl border-border/50 hover:border-emerald-500/30 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 flex items-center justify-center">
                              <Wrench className="w-5 h-5 text-cyan-500" />
                            </div>
                            <div>
                              <p className="font-medium">{eq.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{eq.category}</p>
                            </div>
                          </div>
                          <Badge className={
                            eq.status === 'operational' ? 'bg-emerald-500/10 text-emerald-500'
                              : eq.status === 'maintenance' ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-slate-500/10 text-slate-500'
                          }>
                            {eq.status === 'operational' ? 'Operativo' : eq.status === 'maintenance' ? 'Mant.' : 'Retirado'}
                          </Badge>
                        </div>
                        {eq.serial_number && (
                          <p className="text-xs text-muted-foreground mt-3">S/N: {eq.serial_number}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="mt-6">
            <Card className="bg-card/30 backdrop-blur-xl border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Proveedores</CardTitle>
                    <CardDescription>Directorio de proveedores</CardDescription>
                  </div>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Agregar Proveedor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay proveedores registrados</p>
                  <p className="text-sm mt-2">Agrega proveedores para gestionar mejor tus compras</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default OSSupply;
