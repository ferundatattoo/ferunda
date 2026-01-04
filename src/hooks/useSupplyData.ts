import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from './useWorkspace';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useModuleRealtime } from './useGlobalRealtime';

export interface InventoryItem {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string;
  sku: string | null;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit: string;
  unit_cost: number | null;
  supplier_id: string | null;
  location: string | null;
  status: string;
  last_restock_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  workspace_id: string;
  order_number: string;
  supplier_name: string;
  supplier_contact: string | null;
  status: string;
  total_amount: number | null;
  currency: string;
  notes: string | null;
  expected_delivery_at: string | null;
  received_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  warranty_expires_at: string | null;
  status: string;
  location: string | null;
  assigned_to: string | null;
  last_maintenance_at: string | null;
  next_maintenance_at: string | null;
  maintenance_interval_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  workspace_id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_preferred: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SupplyStats {
  totalItems: number;
  lowStockCount: number;
  criticalStockCount: number;
  pendingOrders: number;
  totalEquipment: number;
  maintenanceDue: number;
}

export const useSupplyData = () => {
  const { user } = useAuth();
  const workspace = useWorkspace(user?.id || null);
  const { toast } = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<SupplyStats>({
    totalItems: 0,
    lowStockCount: 0,
    criticalStockCount: 0,
    pendingOrders: 0,
    totalEquipment: 0,
    maintenanceDue: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    if (!workspace.workspaceId) return;

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('workspace_id', workspace.workspaceId)
      .order('name');

    if (error) {
      console.error('Error fetching inventory:', error);
      return;
    }

    setInventory(data || []);
    
    // Calculate stats
    const items = data || [];
    const lowStock = items.filter(i => i.current_stock <= i.min_stock && i.current_stock > 0);
    const critical = items.filter(i => i.current_stock === 0);
    
    setStats(prev => ({
      ...prev,
      totalItems: items.length,
      lowStockCount: lowStock.length,
      criticalStockCount: critical.length,
    }));
  }, [workspace.workspaceId]);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!workspace.workspaceId) return;

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchase orders:', error);
      return;
    }

    setPurchaseOrders(data || []);
    
    const pending = (data || []).filter(po => po.status === 'pending' || po.status === 'ordered');
    setStats(prev => ({ ...prev, pendingOrders: pending.length }));
  }, [workspace.workspaceId]);

  const fetchEquipment = useCallback(async () => {
    if (!workspace.workspaceId) return;

    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('workspace_id', workspace.workspaceId)
      .order('name');

    if (error) {
      console.error('Error fetching equipment:', error);
      return;
    }

    setEquipment(data || []);
    
    const now = new Date();
    const maintenanceDue = (data || []).filter(e => {
      if (!e.next_maintenance_at) return false;
      return new Date(e.next_maintenance_at) <= now;
    });
    
    setStats(prev => ({
      ...prev,
      totalEquipment: (data || []).length,
      maintenanceDue: maintenanceDue.length,
    }));
  }, [workspace.workspaceId]);

  const fetchSuppliers = useCallback(async () => {
    if (!workspace.workspaceId) return;

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('workspace_id', workspace.workspaceId)
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      return;
    }

    setSuppliers(data || []);
  }, [workspace.workspaceId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchInventory(),
      fetchPurchaseOrders(),
      fetchEquipment(),
      fetchSuppliers(),
    ]);
    setLoading(false);
  }, [fetchInventory, fetchPurchaseOrders, fetchEquipment, fetchSuppliers]);

  useEffect(() => {
    if (workspace.workspaceId) {
      refresh();
    }
  }, [workspace.workspaceId, refresh]);

  // 🔥 VIVO SUPREMO: Connect to global realtime for auto-refresh
  const realtimeState = useModuleRealtime('supply', refresh);

  // CRUD Operations
  const addInventoryItem = async (item: Partial<InventoryItem>) => {
    if (!workspace.workspaceId) return null;

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        name: item.name || '',
        category: item.category || 'general',
        current_stock: item.current_stock || 0,
        min_stock: item.min_stock || 5,
        unit: item.unit || 'unidad',
        unit_cost: item.unit_cost,
        workspace_id: workspace.workspaceId,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el item',
        variant: 'destructive',
      });
      return null;
    }

    toast({ title: 'Item agregado', description: data.name });
    await fetchInventory();
    return data;
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    const { error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el item',
        variant: 'destructive',
      });
      return false;
    }

    await fetchInventory();
    return true;
  };

  const deleteInventoryItem = async (id: string) => {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el item',
        variant: 'destructive',
      });
      return false;
    }

    toast({ title: 'Item eliminado' });
    await fetchInventory();
    return true;
  };

  const addEquipment = async (item: Partial<Equipment>) => {
    if (!workspace.workspaceId) return null;

    const { data, error } = await supabase
      .from('equipment')
      .insert({
        name: item.name || '',
        category: item.category || 'machine',
        status: item.status || 'operational',
        serial_number: item.serial_number,
        workspace_id: workspace.workspaceId,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el equipo',
        variant: 'destructive',
      });
      return null;
    }

    toast({ title: 'Equipo agregado', description: data.name });
    await fetchEquipment();
    return data;
  };

  const createPurchaseOrder = async (order: Partial<PurchaseOrder>) => {
    if (!workspace.workspaceId) return null;

    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        order_number: orderNumber,
        supplier_name: order.supplier_name || 'Proveedor',
        status: order.status || 'draft',
        total_amount: order.total_amount,
        currency: order.currency || 'USD',
        notes: order.notes,
        workspace_id: workspace.workspaceId,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear la orden',
        variant: 'destructive',
      });
      return null;
    }

    toast({ title: 'Orden creada', description: orderNumber });
    await fetchPurchaseOrders();
    return data;
  };

  return {
    inventory,
    purchaseOrders,
    equipment,
    suppliers,
    stats,
    loading,
    refresh,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    addEquipment,
    createPurchaseOrder,
    workspaceId: workspace.workspaceId,
    realtimeStatus: realtimeState.status,
  };
};
