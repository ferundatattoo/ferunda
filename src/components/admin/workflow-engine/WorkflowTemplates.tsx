import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, DollarSign, Calendar, AlertTriangle, Heart, Package, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";

interface Props {
  onApply: () => void;
}

const TEMPLATES = [
  {
    id: "lead_to_deposit",
    name: "Lead → Intake → Quote → Deposit → Confirm",
    description: "Flujo completo desde lead hasta cita confirmada",
    icon: DollarSign,
    category: "Conversión",
    nodes: [
      { type: "action_send_dm", label: "Enviar bienvenida", config: {} },
      { type: "delay", label: "Esperar 24h", config: { delay_minutes: 1440 } },
      { type: "condition", label: "¿Envió referencias?", config: {} },
      { type: "action_send_dm", label: "Pedir referencias", config: {} },
      { type: "action_send_deposit", label: "Enviar link depósito", config: {} },
    ],
  },
  {
    id: "no_show_defense",
    name: "No-show Defense",
    description: "Previene no-shows con recordatorios y confirmaciones",
    icon: AlertTriangle,
    category: "Retención",
    nodes: [
      { type: "delay", label: "48h antes de cita", config: { delay_minutes: -2880 } },
      { type: "action_send_dm", label: "Recordatorio", config: {} },
      { type: "delay", label: "24h antes", config: { delay_minutes: -1440 } },
      { type: "action_send_dm", label: "Confirmar asistencia", config: {} },
    ],
  },
  {
    id: "aftercare_followups",
    name: "Aftercare Follow-ups",
    description: "Seguimiento post-sesión para curado óptimo",
    icon: Heart,
    category: "Aftercare",
    nodes: [
      { type: "action_send_dm", label: "Instrucciones aftercare", config: {} },
      { type: "delay", label: "Día 3", config: { delay_minutes: 4320 } },
      { type: "action_send_dm", label: "¿Cómo va el curado?", config: {} },
      { type: "delay", label: "Día 14", config: { delay_minutes: 20160 } },
      { type: "action_send_dm", label: "Check-in final", config: {} },
    ],
  },
  {
    id: "waitlist_fill",
    name: "Waitlist Fill",
    description: "Llena espacios cancelados con clientes en espera",
    icon: Calendar,
    category: "Scheduling",
    nodes: [
      { type: "condition", label: "¿Hay cancelación?", config: {} },
      { type: "action_send_dm", label: "Notificar waitlist", config: {} },
      { type: "delay", label: "Esperar 2h respuesta", config: { delay_minutes: 120 } },
      { type: "action_assign", label: "Asignar slot", config: {} },
    ],
  },
  {
    id: "inventory_reorder",
    name: "Inventory Auto-Reorder",
    description: "Crea órdenes de compra cuando el stock baja",
    icon: Package,
    category: "Supply",
    nodes: [
      { type: "condition", label: "¿Stock < mínimo?", config: {} },
      { type: "action_send_email", label: "Alerta de stock bajo", config: {} },
      { type: "delay", label: "Esperar aprobación", config: { delay_minutes: 60 } },
    ],
  },
  {
    id: "review_request",
    name: "Review Request + Reputation Rescue",
    description: "Pide reviews y maneja feedback negativo",
    icon: Star,
    category: "Reputación",
    nodes: [
      { type: "delay", label: "3 días post-sesión", config: { delay_minutes: 4320 } },
      { type: "action_send_dm", label: "Pedir review", config: {} },
      { type: "condition", label: "¿Review < 4 estrellas?", config: {} },
      { type: "action_assign", label: "Escalar a manager", config: {} },
    ],
  },
];

export default function WorkflowTemplates({ onApply }: Props) {
  const { workspace } = useWorkspace();

  const applyTemplate = async (template: typeof TEMPLATES[0]) => {
    if (!workspace?.id) return;

    // Create workflow
    const { data: workflow, error: wfError } = await supabase
      .from("workflows")
      .insert({
        workspace_id: workspace.id,
        name: template.name,
        description: template.description,
        trigger_type: "manual",
        safety_level: "suggest_only",
        is_enabled: false,
        version: 1,
      })
      .select()
      .single();

    if (wfError || !workflow) {
      toast.error("Error al crear workflow");
      return;
    }

    // Create nodes
    let prevNodeId: string | null = null;
    for (let i = 0; i < template.nodes.length; i++) {
      const node = template.nodes[i];
      const { data: newNode } = await supabase
        .from("workflow_nodes")
        .insert({
          workflow_id: workflow.id,
          node_type: node.type,
          node_key: `${node.type}_${i}`,
          label: node.label,
          config_json: node.config,
          position_x: 0,
          position_y: i * 120,
        })
        .select()
        .single();

      if (prevNodeId && newNode) {
        await supabase
          .from("workflow_nodes")
          .update({ next_node_id: newNode.id })
          .eq("id", prevNodeId);
      }

      prevNodeId = newNode?.id || null;
    }

    toast.success(`Template "${template.name}" aplicado`);
    onApply();
  };

  const categories = [...new Set(TEMPLATES.map((t) => t.category))];

  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category}>
          <h3 className="font-semibold mb-4">{category}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.filter((t) => t.category === category).map((template) => (
              <Card key={template.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <template.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{template.nodes.length} pasos</Badge>
                    <Button size="sm" onClick={() => applyTemplate(template)}>
                      <Zap className="h-4 w-4 mr-2" />
                      Usar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
