import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Loader2, Sparkles, ArrowRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { OSAction } from "./OSActionProvider";

interface GrokCommandInterpreterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCommand?: string;
  onActionDetected: (action: OSAction) => void;
}

interface InterpretedAction {
  action: OSAction;
  confidence: number;
  reasoning: string;
  alternatives?: OSAction[];
}

export function GrokCommandInterpreter({ 
  open, 
  onOpenChange, 
  initialCommand = "",
  onActionDetected 
}: GrokCommandInterpreterProps) {
  const { toast } = useToast();
  const [command, setCommand] = useState(initialCommand);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interpretedAction, setInterpretedAction] = useState<InterpretedAction | null>(null);

  useEffect(() => {
    if (open && initialCommand) {
      setCommand(initialCommand);
      handleInterpret(initialCommand);
    }
  }, [open, initialCommand]);

  const handleInterpret = async (inputCommand?: string) => {
    const cmdToProcess = inputCommand || command;
    if (!cmdToProcess.trim()) return;

    setIsProcessing(true);
    setInterpretedAction(null);

    try {
      const { data, error } = await supabase.functions.invoke("grok-gateway", {
        body: {
          messages: [
            {
              role: "system",
              content: `Eres un asistente AI para un sistema de gestión de estudio de tatuajes. Tu trabajo es interpretar comandos en lenguaje natural y convertirlos en acciones del sistema.

Las acciones disponibles son:
- create-client: Crear un nuevo cliente (payload: { email?, name? })
- create-booking: Crear una nueva reserva/cita (payload: { email?, clientName? })
- send-deposit: Enviar solicitud de depósito (payload: { bookingId?, clientEmail? })
- create-quote: Crear cotización (payload: { clientEmail?, description? })
- create-content: Crear contenido de marketing (payload: { type?: "post"|"story"|"reel"|"email", topic? })
- create-design: Generar diseño con AI (payload: { prompt?, style? })
- ai-generate-reply: Generar respuesta AI para conversación
- ai-suggest-slots: Sugerir horarios disponibles

Responde SOLO en formato JSON con esta estructura:
{
  "action": "nombre-de-la-accion",
  "payload": { ... datos extraídos del comando ... },
  "confidence": 0.0-1.0,
  "reasoning": "explicación breve de por qué elegiste esta acción"
}`
            },
            {
              role: "user",
              content: cmdToProcess
            }
          ]
        }
      });

      if (error) throw error;

      const content = data?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        const osAction: OSAction = {
          type: parsed.action as any,
          payload: parsed.payload
        };

        setInterpretedAction({
          action: osAction,
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning || "Acción detectada"
        });
      } else {
        toast({
          title: "No pude entender",
          description: "Intenta reformular tu comando",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Interpretation error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el comando",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = () => {
    if (interpretedAction) {
      onActionDetected(interpretedAction.action);
      toast({
        title: "✨ Ejecutando acción",
        description: interpretedAction.reasoning,
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-500";
    if (confidence >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      "create-client": "Crear Cliente",
      "create-booking": "Nueva Reserva",
      "send-deposit": "Enviar Depósito",
      "create-quote": "Crear Cotización",
      "create-content": "Crear Contenido",
      "create-design": "Generar Diseño",
      "ai-generate-reply": "Generar Respuesta AI",
      "ai-suggest-slots": "Sugerir Horarios"
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Grok AI Command Center
          </DialogTitle>
          <DialogDescription>
            Describe lo que quieres hacer en lenguaje natural
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Command Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Ej: Agenda una cita con María para la próxima semana..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInterpret()}
              className="flex-1"
            />
            <Button
              onClick={() => handleInterpret()}
              disabled={isProcessing || !command.trim()}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Processing Animation */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-center py-8"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Brain className="h-8 w-8 text-primary animate-pulse" />
                    <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                  <div>
                    <p className="font-medium">Grok está analizando...</p>
                    <p className="text-sm text-muted-foreground">Interpretando tu comando</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interpreted Action */}
          <AnimatePresence>
            {interpretedAction && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-medium">Acción Detectada</span>
                  </div>
                  <span className={`text-sm font-medium ${getConfidenceColor(interpretedAction.confidence)}`}>
                    {Math.round(interpretedAction.confidence * 100)}% confianza
                  </span>
                </div>

                <div className="bg-background rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-primary text-primary-foreground text-sm rounded-md">
                      {getActionLabel(interpretedAction.action.type)}
                    </span>
                  </div>
                  
                  {"payload" in interpretedAction.action && interpretedAction.action.payload && Object.keys(interpretedAction.action.payload).length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Datos extraídos:</span>
                      <ul className="mt-1 space-y-1">
                        {Object.entries(interpretedAction.action.payload as Record<string, any>).map(([key, value]) => (
                          <li key={key} className="flex gap-2">
                            <span className="text-foreground">{key}:</span>
                            <span>{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {interpretedAction.reasoning}
                </p>

                <Button className="w-full" onClick={handleExecute}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Ejecutar Acción
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Examples */}
          {!interpretedAction && !isProcessing && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Ejemplos de comandos:</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Crea un cliente nuevo llamado Juan",
                  "Agenda una cita para mañana a las 3pm",
                  "Genera un diseño de lobo geométrico",
                  "Crea un post sobre tatuajes minimalistas"
                ].map((example) => (
                  <Button
                    key={example}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-left h-auto py-2 px-3"
                    onClick={() => {
                      setCommand(example);
                      handleInterpret(example);
                    }}
                  >
                    <span className="text-muted-foreground mr-2">→</span>
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
