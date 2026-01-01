-- =====================================================
-- SUPPLY CHAIN TABLES
-- =====================================================

-- Inventory Items
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  sku TEXT,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  max_stock INTEGER,
  unit TEXT NOT NULL DEFAULT 'unidad',
  unit_cost DECIMAL(10,2),
  supplier_id UUID,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_restock_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  expected_delivery_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase Order Items
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock Movements
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'machine',
  serial_number TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  warranty_expires_at DATE,
  status TEXT NOT NULL DEFAULT 'operational',
  location TEXT,
  assigned_to UUID,
  last_maintenance_at TIMESTAMP WITH TIME ZONE,
  next_maintenance_at TIMESTAMP WITH TIME ZONE,
  maintenance_interval_days INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance Logs
CREATE TABLE public.maintenance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  cost DECIMAL(10,2),
  parts_used TEXT[],
  status TEXT NOT NULL DEFAULT 'completed',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  next_maintenance_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES public.workspace_settings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_preferred BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add supplier FK to inventory_items
ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_supplier_id_fkey 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Enable RLS on all tables
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_items
CREATE POLICY "Users can view inventory in their workspace" 
ON public.inventory_items FOR SELECT 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert inventory in their workspace" 
ON public.inventory_items FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update inventory in their workspace" 
ON public.inventory_items FOR UPDATE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete inventory in their workspace" 
ON public.inventory_items FOR DELETE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view POs in their workspace" 
ON public.purchase_orders FOR SELECT 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert POs in their workspace" 
ON public.purchase_orders FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update POs in their workspace" 
ON public.purchase_orders FOR UPDATE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete POs in their workspace" 
ON public.purchase_orders FOR DELETE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

-- RLS Policies for purchase_order_items
CREATE POLICY "Users can view PO items through PO access" 
ON public.purchase_order_items FOR SELECT 
USING (
  purchase_order_id IN (
    SELECT id FROM public.purchase_orders 
    WHERE workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert PO items through PO access" 
ON public.purchase_order_items FOR INSERT 
WITH CHECK (
  purchase_order_id IN (
    SELECT id FROM public.purchase_orders 
    WHERE workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update PO items through PO access" 
ON public.purchase_order_items FOR UPDATE 
USING (
  purchase_order_id IN (
    SELECT id FROM public.purchase_orders 
    WHERE workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete PO items through PO access" 
ON public.purchase_order_items FOR DELETE 
USING (
  purchase_order_id IN (
    SELECT id FROM public.purchase_orders 
    WHERE workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  )
);

-- RLS Policies for stock_movements
CREATE POLICY "Users can view stock movements in their workspace" 
ON public.stock_movements FOR SELECT 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert stock movements in their workspace" 
ON public.stock_movements FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

-- RLS Policies for equipment
CREATE POLICY "Users can view equipment in their workspace" 
ON public.equipment FOR SELECT 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert equipment in their workspace" 
ON public.equipment FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update equipment in their workspace" 
ON public.equipment FOR UPDATE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete equipment in their workspace" 
ON public.equipment FOR DELETE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

-- RLS Policies for maintenance_logs
CREATE POLICY "Users can view maintenance logs" 
ON public.maintenance_logs FOR SELECT 
USING (
  equipment_id IN (
    SELECT id FROM public.equipment 
    WHERE workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert maintenance logs" 
ON public.maintenance_logs FOR INSERT 
WITH CHECK (
  equipment_id IN (
    SELECT id FROM public.equipment 
    WHERE workspace_id IN (
      SELECT id FROM public.workspace_settings 
      WHERE owner_user_id = auth.uid()
    )
  )
);

-- RLS Policies for suppliers
CREATE POLICY "Users can view suppliers in their workspace" 
ON public.suppliers FOR SELECT 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert suppliers in their workspace" 
ON public.suppliers FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update suppliers in their workspace" 
ON public.suppliers FOR UPDATE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete suppliers in their workspace" 
ON public.suppliers FOR DELETE 
USING (
  workspace_id IN (
    SELECT id FROM public.workspace_settings 
    WHERE owner_user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_inventory_items_workspace ON public.inventory_items(workspace_id);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX idx_inventory_items_status ON public.inventory_items(status);
CREATE INDEX idx_purchase_orders_workspace ON public.purchase_orders(workspace_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_stock_movements_item ON public.stock_movements(inventory_item_id);
CREATE INDEX idx_equipment_workspace ON public.equipment(workspace_id);
CREATE INDEX idx_suppliers_workspace ON public.suppliers(workspace_id);