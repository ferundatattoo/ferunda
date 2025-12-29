import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Shield, Lock, Clock, CheckCircle, Upload, MessageSquare, 
  CreditCard, Calendar, AlertCircle, Send, Image, ExternalLink,
  RefreshCw, LogOut, ChevronRight, Loader2, FileImage, Sparkles, Heart
} from 'lucide-react';
import DesignStudioAI from '@/components/admin/DesignStudioAI';
import HealingGuardianTab from '@/components/customer/HealingGuardianTab';

// =====================================================
// PIPELINE STAGES CONFIGURATION
// =====================================================

const PIPELINE_STAGES = [
  { key: 'new_inquiry', label: 'Solicitud', icon: CheckCircle },
  { key: 'references_requested', label: 'Referencias', icon: Image },
  { key: 'references_received', label: 'Recibidas', icon: CheckCircle },
  { key: 'deposit_requested', label: 'Depósito', icon: CreditCard },
  { key: 'deposit_paid', label: 'Pagado', icon: CheckCircle },
  { key: 'scheduled', label: 'Agendado', icon: Calendar },
  { key: 'completed', label: 'Completado', icon: CheckCircle }
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function CustomerPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const {
    isLoading,
    isAuthenticated,
    error,
    booking,
    permissions,
    messages,
    payments,
    unreadMessages,
    sessionExpiresAt,
    validateMagicLink,
    refreshSession,
    logout,
    fetchBooking,
    fetchMessages,
    sendMessage,
    uploadReference,
    requestPayment,
    requestReschedule,
    fetchPayments
  } = useCustomerSession();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isValidating, setIsValidating] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [isRequestingReschedule, setIsRequestingReschedule] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Validate magic link on load
  useEffect(() => {
    if (token && !isAuthenticated && !isValidating) {
      setIsValidating(true);
      validateMagicLink(token).then(success => {
        setIsValidating(false);
        if (success) {
          toast.success('Bienvenido a tu portal de cliente');
          // Remove token from URL for security
          window.history.replaceState({}, '', '/customer-portal');
        } else {
          toast.error('Link inválido o expirado');
        }
      });
    }
  }, [token, isAuthenticated, validateMagicLink, isValidating]);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMessages();
      fetchPayments();
    }
  }, [isAuthenticated, fetchMessages, fetchPayments]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Calculate session time remaining
  const getTimeRemaining = useCallback(() => {
    if (!sessionExpiresAt) return '';
    const remaining = (sessionExpiresAt * 1000) - Date.now();
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, [sessionExpiresAt]);

  // Get current stage index
  const getCurrentStageIndex = useCallback(() => {
    if (!booking) return 0;
    const index = PIPELINE_STAGES.findIndex(s => s.key === booking.pipeline_stage);
    return index >= 0 ? index : 0;
  }, [booking]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    const success = await sendMessage(messageInput);
    setIsSendingMessage(false);
    
    if (success) {
      setMessageInput('');
      toast.success('Mensaje enviado');
    } else {
      toast.error('Error al enviar mensaje');
    }
  };

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Solo se permiten imágenes JPEG, PNG, WebP o HEIC');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no debe superar 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUploadReference = async () => {
    if (!selectedFile || isUploading) return;
    
    setIsUploading(true);
    const result = await uploadReference(selectedFile);
    setIsUploading(false);
    
    if (result.success) {
      toast.success(`Referencia subida. Te quedan ${result.remaining} más disponibles.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      toast.error(result.error || 'Error al subir referencia');
    }
  };

  // Handle payment request
  const handleRequestPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error('El monto mínimo es $100');
      return;
    }
    
    if (amount > 10000) {
      toast.error('El monto máximo es $10,000');
      return;
    }
    
    setIsRequestingPayment(true);
    const result = await requestPayment(amount);
    setIsRequestingPayment(false);
    
    if (result.success && result.payment_url) {
      toast.success('Link de pago generado');
      window.open(result.payment_url, '_blank');
      setPaymentAmount('');
      fetchPayments();
    } else {
      toast.error(result.error || 'Error al generar link de pago');
    }
  };

  // Handle reschedule request
  const handleRequestReschedule = async () => {
    if (rescheduleReason.trim().length < 10) {
      toast.error('Por favor proporciona una razón (mínimo 10 caracteres)');
      return;
    }
    
    setIsRequestingReschedule(true);
    const result = await requestReschedule('', '', rescheduleReason);
    setIsRequestingReschedule(false);
    
    if (result.success) {
      toast.success('Solicitud de reagendamiento enviada');
      setRescheduleReason('');
    } else {
      toast.error(result.error || 'Error al enviar solicitud');
    }
  };

  // =====================================================
  // RENDER: Loading State
  // =====================================================
  
  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando acceso seguro...</p>
        </motion.div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Not Authenticated
  // =====================================================
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="border-destructive/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle>Acceso Requerido</CardTitle>
              <CardDescription>
                {error || 'Necesitas un link mágico válido para acceder a tu portal de cliente.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Si no tienes un link de acceso, revisa tu email o contacta a Ferunda.
              </p>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Volver al Inicio
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Authenticated Portal
  // =====================================================
  
  return (
    <div className="min-h-screen bg-background">
      {/* Security Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Sesión Segura</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="w-4 h-4" />
              <span>Expira en {getTimeRemaining()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refreshSession}>
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Renovar</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">
            Hola, {booking?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground">
            Booking #{booking?.id.slice(0, 8).toUpperCase()}
          </p>
        </motion.div>

        {/* Progress Timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progreso de tu Tatuaje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Progress value={(getCurrentStageIndex() / (PIPELINE_STAGES.length - 1)) * 100} className="h-2 mb-6" />
                <div className="flex justify-between">
                  {PIPELINE_STAGES.map((stage, index) => {
                    const isCompleted = index <= getCurrentStageIndex();
                    const isCurrent = index === getCurrentStageIndex();
                    const StageIcon = stage.icon;
                    
                    return (
                      <div 
                        key={stage.key} 
                        className={`flex flex-col items-center ${index === 0 ? 'items-start' : index === PIPELINE_STAGES.length - 1 ? 'items-end' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                          isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                          <StageIcon className="w-4 h-4" />
                        </div>
                        <span className={`text-xs text-center hidden sm:block ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-7 lg:w-[800px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Design</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2 relative">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Mensajes</span>
              {unreadMessages > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  {unreadMessages}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="references" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">Refs</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="appointment" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Cita</span>
            </TabsTrigger>
            {(booking?.pipeline_stage === 'scheduled' || booking?.pipeline_stage === 'completed') && (
              <TabsTrigger value="healing" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Curación</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* AI Design Tab */}
          <TabsContent value="design">
            <Card>
              <CardContent className="pt-6">
                <DesignStudioAI 
                  bookingId={booking?.id} 
                  clientView={true}
                  onDesignApproved={(designId, imageUrl) => {
                    toast.success('Diseño aprobado y guardado');
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalles del Tatuaje</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Descripción</label>
                    <p className="font-medium">{booking?.tattoo_description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Tamaño</label>
                      <p className="font-medium">{booking?.size || 'Por definir'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Ubicación</label>
                      <p className="font-medium">{booking?.placement || 'Por definir'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Ciudad</label>
                    <p className="font-medium">{booking?.requested_city || 'Por definir'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <CreditCard className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">${booking?.total_paid || 0}</p>
                      <p className="text-xs text-muted-foreground">Pagado</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <MessageSquare className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{messages.length}</p>
                      <p className="text-xs text-muted-foreground">Mensajes</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Image className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">
                        {(booking?.reference_images?.length || 0) + (booking?.reference_images_customer?.length || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Referencias</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-lg font-bold">
                        {booking?.scheduled_date 
                          ? new Date(booking.scheduled_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                          : 'TBD'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Fecha</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Chat con Ferunda
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay mensajes aún</p>
                    <p className="text-sm">Inicia la conversación enviando un mensaje</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender_type === 'customer' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_type === 'customer' ? 'opacity-70' : 'text-muted-foreground'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              
              {permissions?.can_message && (
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escribe tu mensaje..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="resize-none"
                      rows={2}
                      maxLength={2000}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!messageInput.trim() || isSendingMessage}
                      className="self-end"
                    >
                      {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* References Tab */}
          <TabsContent value="references">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Referencias e Inspiración
                </CardTitle>
                <CardDescription>
                  Tus imágenes de referencia para el diseño del tatuaje
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Original References */}
                {booking?.reference_images && booking.reference_images.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Referencias Originales</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {booking.reference_images.map((url, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={url} 
                            alt={`Referencia ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Uploaded References */}
                {booking?.reference_images_customer && booking.reference_images_customer.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Referencias Adicionales</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {booking.reference_images_customer.map((ref: any, index: number) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={ref.url} 
                            alt={`Referencia adicional ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Section */}
                {permissions?.can_upload && (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/jpeg,image/png,image/webp,image/heic"
                      className="hidden"
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3">
                          <FileImage className="w-8 h-8 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" onClick={() => setSelectedFile(null)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleUploadReference} disabled={isUploading}>
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Subir Referencia
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer"
                      >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="font-medium">Arrastra o haz click para subir</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          JPEG, PNG, WebP, HEIC • Máx 10MB
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Puedes subir hasta {5 - (booking?.reference_images_customer?.length || 0)} imágenes más
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Payment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Pagos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Depósito requerido</span>
                    <span className="font-medium">${booking?.deposit_amount || 500}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Pagado hasta ahora</span>
                    <span className="font-medium text-primary">${booking?.total_paid || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Costo estimado</span>
                    <span className="font-medium">${booking?.session_rate || 2500}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Balance pendiente</span>
                    <span className="text-xl font-bold">
                      ${(booking?.session_rate || 2500) - (booking?.total_paid || 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Make Payment */}
              {permissions?.can_pay && (
                <Card>
                  <CardHeader>
                    <CardTitle>Hacer un Pago</CardTitle>
                    <CardDescription>
                      Abona a tu tatuaje cuando quieras
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Monto (USD)</label>
                      <Input
                        type="number"
                        placeholder="Ej: 500"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min={100}
                        max={10000}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo $100, máximo $10,000
                      </p>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleRequestPayment}
                      disabled={isRequestingPayment || !paymentAmount}
                    >
                      {isRequestingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generando link...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Generar Link de Pago Seguro
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      <Lock className="w-3 h-3 inline mr-1" />
                      El link expira en 2 horas y solo puede usarse una vez
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Payment History */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay pagos registrados
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div 
                        key={payment.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            payment.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {payment.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <Clock className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{payment.payment_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${payment.amount}</p>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Healing Tab */}
          {(booking?.pipeline_stage === 'scheduled' || booking?.pipeline_stage === 'completed') && (
            <TabsContent value="healing">
              <HealingGuardianTab bookingId={booking?.id || ''} />
            </TabsContent>
          )}

          {/* Appointment Tab */}
          <TabsContent value="appointment">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Appointment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Tu Cita
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {booking?.scheduled_date ? (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-primary" />
                      </div>
                      <p className="text-3xl font-bold mb-2">
                        {new Date(booking.scheduled_date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xl text-muted-foreground">
                        {booking.scheduled_time || '1:00 PM'}
                      </p>
                      <Badge className="mt-4" variant="outline">
                        {booking.requested_city || 'Ciudad por confirmar'}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="font-medium">Pendiente de agendar</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Te contactaremos pronto para confirmar fecha y hora
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reschedule Request */}
              {permissions?.can_reschedule && booking?.scheduled_date && (
                <Card>
                  <CardHeader>
                    <CardTitle>Solicitar Cambio de Fecha</CardTitle>
                    <CardDescription>
                      Puedes solicitar un cambio hasta 48 horas antes de tu cita
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Razón del cambio</label>
                      <Textarea
                        placeholder="Por favor explica por qué necesitas cambiar la fecha..."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        rows={4}
                        maxLength={500}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo 10 caracteres
                      </p>
                    </div>
                    <Button 
                      className="w-full"
                      onClick={handleRequestReschedule}
                      disabled={isRequestingReschedule || rescheduleReason.length < 10}
                    >
                      {isRequestingReschedule ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar Solicitud'
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Límite: 2 solicitudes por día
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Security Footer */}
        <div className="mt-12 py-6 border-t text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Shield className="w-4 h-4" />
            <span>Portal seguro con encriptación de extremo a extremo</span>
          </div>
        </div>
      </main>
    </div>
  );
}
