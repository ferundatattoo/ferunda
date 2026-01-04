import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Loader2, Copy, Send, Mail, MessageSquare, CreditCard } from "lucide-react";

interface DepositRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: { bookingId?: string; clientEmail?: string };
}

export function DepositRequestModal({ 
  open, 
  onOpenChange, 
  initialData 
}: DepositRequestModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [paymentLink, setPaymentLink] = useState("");
  
  const [formData, setFormData] = useState({
    bookingId: "",
    clientEmail: "",
    amount: "100",
    currency: "USD",
    sendMethod: "email" as "email" | "whatsapp" | "copy"
  });

  // Load recent bookings
  useEffect(() => {
    const fetchBookings = async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, client_name, client_email, tattoo_style, preferred_date")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setBookings(data);
    };
    if (open) fetchBookings();
  }, [open]);

  // Set initial data
  useEffect(() => {
    if (open && initialData) {
      setFormData(prev => ({
        ...prev,
        bookingId: initialData.bookingId || "",
        clientEmail: initialData.clientEmail || ""
      }));
    }
  }, [open, initialData]);

  // Update email when booking is selected
  useEffect(() => {
    if (formData.bookingId) {
      const booking = bookings.find(b => b.id === formData.bookingId);
      if (booking?.client_email) {
        setFormData(prev => ({ ...prev, clientEmail: booking.client_email }));
      }
    }
  }, [formData.bookingId, bookings]);

  const generatePaymentLink = async () => {
    if (!formData.clientEmail || !formData.amount) {
      toast({
        title: "Campos requeridos",
        description: "Email y monto son obligatorios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-deposit-request", {
        body: {
          email: formData.clientEmail,
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          bookingId: formData.bookingId || undefined,
          generateOnly: true
        }
      });

      if (error) throw error;

      if (data?.paymentUrl) {
        setPaymentLink(data.paymentUrl);
        toast({
          title: "✅ Link generado",
          description: "Link de pago creado exitosamente",
        });
      }
    } catch (error: any) {
      console.error("Error generating payment link:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el link",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendPaymentRequest = async () => {
    if (!paymentLink) {
      await generatePaymentLink();
      return;
    }

    setIsSending(true);
    try {
      if (formData.sendMethod === "copy") {
        await navigator.clipboard.writeText(paymentLink);
        toast({
          title: "📋 Copiado",
          description: "Link copiado al portapapeles",
        });
      } else if (formData.sendMethod === "email") {
        const { error } = await supabase.functions.invoke("send-deposit-request", {
          body: {
            email: formData.clientEmail,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            bookingId: formData.bookingId || undefined,
            sendEmail: true
          }
        });

        if (error) throw error;

        toast({
          title: "📧 Enviado",
          description: `Solicitud enviada a ${formData.clientEmail}`,
        });
        onOpenChange(false);
      } else if (formData.sendMethod === "whatsapp") {
        const message = encodeURIComponent(
          `¡Hola! 🎨\n\nPara confirmar tu cita de tatuaje, por favor realiza el depósito de $${formData.amount} ${formData.currency} usando este link:\n\n${paymentLink}\n\n¡Gracias!`
        );
        window.open(`https://wa.me/?text=${message}`, "_blank");
        toast({
          title: "📱 WhatsApp",
          description: "Abriendo WhatsApp para enviar...",
        });
      }
    } catch (error: any) {
      console.error("Error sending:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Solicitar Depósito
          </DialogTitle>
          <DialogDescription>
            Genera y envía un link de pago para el depósito
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Booking Selection */}
          <div className="space-y-2">
            <Label>Reserva (opcional)</Label>
            <Select
              value={formData.bookingId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, bookingId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar reserva..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin reserva específica</SelectItem>
                {bookings.map(booking => (
                  <SelectItem key={booking.id} value={booking.id}>
                    {booking.client_name || booking.client_email} - {booking.tattoo_style || "Sin estilo"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Email */}
          <div className="space-y-2">
            <Label htmlFor="depositEmail">Email del Cliente *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="depositEmail"
                type="email"
                className="pl-9"
                placeholder="cliente@email.com"
                value={formData.clientEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  className="pl-9"
                  placeholder="100"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Link Preview */}
          {paymentLink && (
            <div className="space-y-2">
              <Label>Link de Pago</Label>
              <div className="flex gap-2">
                <Input 
                  value={paymentLink} 
                  readOnly 
                  className="text-xs bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(paymentLink);
                    toast({ title: "Copiado" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Send Method */}
          <div className="space-y-2">
            <Label>Método de Envío</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={formData.sendMethod === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, sendMethod: "email" }))}
                className="flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                type="button"
                variant={formData.sendMethod === "whatsapp" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, sendMethod: "whatsapp" }))}
                className="flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button
                type="button"
                variant={formData.sendMethod === "copy" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, sendMethod: "copy" }))}
                className="flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!paymentLink ? (
            <Button onClick={generatePaymentLink} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Generar Link
            </Button>
          ) : (
            <Button onClick={sendPaymentRequest} disabled={isSending}>
              {isSending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
