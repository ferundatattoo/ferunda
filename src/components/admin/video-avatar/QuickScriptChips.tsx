import { Heart, DollarSign, Calendar, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickScriptChipsProps {
  onSelect: (template: string) => void;
}

const scriptTemplates = [
  {
    id: "aftercare",
    label: "Aftercare Instructions",
    icon: <Heart className="w-4 h-4" />,
    template: `Hola {name}! 👋

Gracias por confiar en mí para tu nuevo tatuaje. Aquí tienes las instrucciones de cuidado:

🧴 Lava suavemente con jabón antibacterial 2-3 veces al día
💧 Mantén la piel hidratada con crema sin fragancia
☀️ Evita el sol directo durante las primeras 2 semanas
🏊 No te sumerjas en agua (piscina, mar, bañera) por 2-3 semanas

Si tienes cualquier duda, escríbeme. ¡Cuídate!`
  },
  {
    id: "deposit",
    label: "Deposit Reminder",
    icon: <DollarSign className="w-4 h-4" />,
    template: `Hola {name}! 

Te escribo para recordarte que tu depósito de $150 USD está pendiente para confirmar tu cita de tatuaje.

📅 Fecha tentativa: {date}
⏰ Hora: {time}

Puedes realizar el pago por Zelle, Venmo o en efectivo en el estudio. Una vez confirmado el depósito, tu cita quedará reservada.

¡Espero verte pronto!`
  },
  {
    id: "consultation",
    label: "Consultation Confirm",
    icon: <Calendar className="w-4 h-4" />,
    template: `¡Hola {name}! 🎨

Tu consulta está confirmada para el {date} a las {time}.

Durante la consulta revisaremos:
✨ Tu diseño e ideas
📐 Tamaño y ubicación
💰 Presupuesto estimado
📅 Disponibilidad para agendar

Por favor trae referencias visuales de lo que tienes en mente. ¡Nos vemos pronto!`
  },
  {
    id: "custom",
    label: "Custom Message",
    icon: <MessageSquare className="w-4 h-4" />,
    template: `Hola {name}!

{your_message}

Saludos,
{artist_name}`
  }
];

const QuickScriptChips = ({ onSelect }: QuickScriptChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {scriptTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.template)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            "bg-iron-dark border border-border/50",
            "text-sm text-muted-foreground",
            "hover:border-needle-blue/50 hover:text-needle-blue",
            "transition-all duration-200"
          )}
        >
          {template.icon}
          <span>{template.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickScriptChips;
