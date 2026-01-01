import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, ShoppingCart, Truck, Wrench, AlertTriangle,
  Plus, Search, RefreshCw
} from 'lucide-react';

// Placeholder data
const inventoryItems = [
  { id: '1', name: 'Tinta negra 30ml', category: 'Tintas', stock: 24, minStock: 10, status: 'ok' },
  { id: '2', name: 'Agujas RL 5', category: 'Agujas', stock: 156, minStock: 50, status: 'ok' },
  { id: '3', name: 'Guantes M', category: 'Protección', stock: 8, minStock: 20, status: 'low' },
  { id: '4', name: 'Film protector', category: 'Aftercare', stock: 3, minStock: 15, status: 'critical' },
];

const OSSupply = () => {
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Supply Chain</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inventario, órdenes y equipamiento
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Item
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-semibold">247</p>
              </div>
              <Package className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                <p className="text-2xl font-semibold text-warning">3</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Órdenes Pendientes</p>
                <p className="text-2xl font-semibold">2</p>
              </div>
              <Truck className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mantenimiento</p>
                <p className="text-2xl font-semibold text-success">OK</p>
              </div>
              <Wrench className="w-8 h-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/30 border border-border/50">
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
        </TabsList>

        <TabsContent value="inventory" className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar items..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Items List */}
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Card key={item.id} className="bg-card border-border/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{item.stock} unidades</p>
                        <p className="text-xs text-muted-foreground">Mín: {item.minStock}</p>
                      </div>
                      <Badge 
                        className={
                          item.status === 'critical' 
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : item.status === 'low'
                            ? 'bg-warning/10 text-warning border-warning/20'
                            : 'bg-success/10 text-success border-success/20'
                        }
                      >
                        {item.status === 'critical' ? 'Crítico' : item.status === 'low' ? 'Bajo' : 'OK'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Compra</CardTitle>
              <CardDescription>Gestiona tus órdenes a proveedores</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay órdenes pendientes</p>
              <Button variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Orden
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipamiento</CardTitle>
              <CardDescription>Mantenimiento de máquinas y equipos</CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Todo el equipamiento está en buen estado</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OSSupply;
