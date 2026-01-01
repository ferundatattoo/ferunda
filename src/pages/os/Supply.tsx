import { useState } from 'react';
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
  Plus, Search, RefreshCw, Loader2, Building2
} from 'lucide-react';
import { useSupplyData, InventoryItem, Equipment } from '@/hooks/useSupplyData';
import { motion, AnimatePresence } from 'framer-motion';

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
    refresh, addInventoryItem, deleteInventoryItem, addEquipment, createPurchaseOrder
  } = useSupplyData();
  
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addEquipDialogOpen, setAddEquipDialogOpen] = useState(false);
  
  // Form states
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'otros',
    current_stock: 0,
    min_stock: 5,
    unit: 'unidad',
    unit_cost: 0,
  });
  
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    category: 'machine',
    status: 'operational',
    serial_number: '',
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
    
    await addInventoryItem({
      name: newItem.name,
      category: newItem.category,
      current_stock: newItem.current_stock,
      min_stock: newItem.min_stock,
      unit: newItem.unit,
      unit_cost: newItem.unit_cost,
    });
    
    setNewItem({
      name: '',
      category: 'otros',
      current_stock: 0,
      min_stock: 5,
      unit: 'unidad',
      unit_cost: 0,
    });
    setAddDialogOpen(false);
  };

  const handleAddEquipment = async () => {
    if (!newEquipment.name) return;
    
    await addEquipment({
      name: newEquipment.name,
      category: newEquipment.category,
      status: newEquipment.status,
      serial_number: newEquipment.serial_number || null,
    });
    
    setNewEquipment({
      name: '',
      category: 'machine',
      status: 'operational',
      serial_number: '',
    });
    setAddEquipDialogOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Supply Chain</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inventario, órdenes y equipamiento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nuevo Item
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Agregar Item de Inventario</DialogTitle>
                <DialogDescription>
                  Añade un nuevo item a tu inventario
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input 
                    id="name" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Ej: Tinta negra 30ml"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select 
                      value={newItem.category} 
                      onValueChange={(v) => setNewItem({ ...newItem, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unidad</Label>
                    <Input 
                      id="unit" 
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      placeholder="unidad"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock Actual</Label>
                    <Input 
                      id="stock" 
                      type="number"
                      value={newItem.current_stock}
                      onChange={(e) => setNewItem({ ...newItem, current_stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minStock">Stock Mínimo</Label>
                    <Input 
                      id="minStock" 
                      type="number"
                      value={newItem.min_stock}
                      onChange={(e) => setNewItem({ ...newItem, min_stock: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Costo Unitario ($)</Label>
                  <Input 
                    id="cost" 
                    type="number"
                    step="0.01"
                    value={newItem.unit_cost}
                    onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddItem} disabled={!newItem.name}>
                  Agregar Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-semibold">{stats.totalItems}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-semibold text-amber-500">
                  {stats.lowStockCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Órdenes Pendientes</p>
                <p className="text-2xl font-semibold">{stats.pendingOrders}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Equipamiento</p>
                <p className="text-2xl font-semibold">{stats.totalEquipment}</p>
                {stats.maintenanceDue > 0 && (
                  <p className="text-xs text-amber-500">{stats.maintenanceDue} pendientes mant.</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wrench className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Órdenes
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Equipamiento
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar items..." 
              className="pl-10 bg-secondary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInventory.length === 0 ? (
            <Card className="glass-card">
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
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="glass-card hover:shadow-lg transition-shadow">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold">{item.current_stock} {item.unit}</p>
                                <p className="text-xs text-muted-foreground">Mín: {item.min_stock}</p>
                              </div>
                              <Badge 
                                className={
                                  status === 'critical' 
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : status === 'low'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                }
                              >
                                {status === 'critical' ? 'Sin Stock' : status === 'low' ? 'Bajo' : 'OK'}
                              </Badge>
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
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
              <CardDescription>Gestiona tus órdenes a proveedores</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay órdenes de compra</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Orden
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchaseOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">{order.supplier_name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold">
                          {order.currency} {order.total_amount?.toFixed(2)}
                        </p>
                        <Badge variant="outline" className="capitalize">{order.status}</Badge>
                      </div>
                    </div>
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
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Agregar Equipo</DialogTitle>
                  <DialogDescription>
                    Registra un nuevo equipo o máquina
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nombre</Label>
                    <Input 
                      value={newEquipment.name}
                      onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                      placeholder="Ej: Máquina rotativa Cheyenne"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Categoría</Label>
                      <Select 
                        value={newEquipment.category}
                        onValueChange={(v) => setNewEquipment({ ...newEquipment, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="machine">Máquina</SelectItem>
                          <SelectItem value="furniture">Mobiliario</SelectItem>
                          <SelectItem value="lighting">Iluminación</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>N° Serie</Label>
                      <Input 
                        value={newEquipment.serial_number}
                        onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddEquipDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddEquipment} disabled={!newEquipment.name}>
                    Agregar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {equipment.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="text-center py-12 text-muted-foreground">
                <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay equipamiento registrado</p>
                <Button variant="outline" className="mt-4" onClick={() => setAddEquipDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Equipo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map(equip => (
                <Card key={equip.id} className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{equip.name}</CardTitle>
                          <CardDescription className="capitalize">{equip.category}</CardDescription>
                        </div>
                      </div>
                      <Badge 
                        className={
                          equip.status === 'operational'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : equip.status === 'maintenance'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-red-500/10 text-red-500'
                        }
                      >
                        {equip.status === 'operational' ? 'Operativo' : 
                         equip.status === 'maintenance' ? 'En Mant.' : 'Fuera Servicio'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {equip.serial_number && (
                      <p className="text-xs text-muted-foreground">S/N: {equip.serial_number}</p>
                    )}
                    {equip.next_maintenance_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Próximo mant.: {new Date(equip.next_maintenance_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="mt-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>Gestiona tu red de proveedores</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay proveedores registrados</p>
              <Button variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Proveedor
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OSSupply;
