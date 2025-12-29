import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerSession } from '@/hooks/useCustomerSession';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Shield, Clock, AlertCircle, Send, RefreshCw, LogOut, Loader2, 
  Folder, Calendar, CheckSquare, Heart, MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Import new luxury tab components
import PortalProjectTab from '@/components/customer/PortalProjectTab';
import PortalSessionTab from '@/components/customer/PortalSessionTab';
import PortalPreparationTab from '@/components/customer/PortalPreparationTab';
import HealingGuardianTab from '@/components/customer/HealingGuardianTab';

// =====================================================
// NAVIGATION ITEMS - Minimal "Private Folder" Feel
// =====================================================

const NAV_ITEMS = [
  { key: 'project', label: 'Project', icon: Folder },
  { key: 'session', label: 'Session', icon: Calendar },
  { key: 'preparation', label: 'Preparation', icon: CheckSquare },
  { key: 'healing', label: 'Healing', icon: Heart },
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
    fetchMessages,
    sendMessage,
    requestReschedule,
    fetchPayments
  } = useCustomerSession();

  const [activeTab, setActiveTab] = useState('project');
  const [isValidating, setIsValidating] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // New data for enhanced portal
  const [projectNotes, setProjectNotes] = useState<any[]>([]);
  const [clientDocuments, setClientDocuments] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Validate magic link on load
  useEffect(() => {
    if (token && !isAuthenticated && !isValidating) {
      setIsValidating(true);
      validateMagicLink(token).then(success => {
        setIsValidating(false);
        if (success) {
          toast.success('Welcome to your private folder');
          window.history.replaceState({}, '', '/customer-portal');
        } else {
          toast.error('Link invalid or expired');
        }
      });
    }
  }, [token, isAuthenticated, validateMagicLink, isValidating]);

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && booking?.id) {
      fetchMessages();
      fetchPayments();
      fetchProjectData();
    }
  }, [isAuthenticated, booking?.id, fetchMessages, fetchPayments]);

  // Fetch project notes and documents
  const fetchProjectData = async () => {
    if (!booking?.id) return;
    
    try {
      const [notesRes, docsRes] = await Promise.all([
        supabase
          .from('client_project_notes')
          .select('*')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('client_documents')
          .select('*')
          .eq('booking_id', booking.id)
          .order('uploaded_at', { ascending: false })
      ]);
      
      if (notesRes.data) setProjectNotes(notesRes.data);
      if (docsRes.data) setClientDocuments(docsRes.data);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

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

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    const success = await sendMessage(messageInput);
    setIsSendingMessage(false);
    
    if (success) {
      setMessageInput('');
      toast.success('Message sent');
    } else {
      toast.error('Could not send message');
    }
  };

  // Handle reschedule request
  const handleRequestReschedule = async (reason: string) => {
    return await requestReschedule('', '', reason);
  };

  // Determine which tabs to show based on booking stage
  const showHealingTab = booking?.pipeline_stage === 'scheduled' || booking?.pipeline_stage === 'completed';

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
          <Loader2 className="w-8 h-8 animate-spin text-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-body text-sm uppercase tracking-widest">
            Validating secure access
          </p>
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
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Access Required</h1>
          <p className="text-muted-foreground font-body mb-6">
            {error || 'A valid access link is required to view your project.'}
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </motion.div>
      </div>
    );
  }

  // =====================================================
  // RENDER: Authenticated Portal - Luxury Private Folder
  // =====================================================
  
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b border-border/50 bg-background sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-body uppercase tracking-widest text-muted-foreground">
              Secure Session
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {getTimeRemaining()}
            </span>
            <Button variant="ghost" size="icon" onClick={refreshSession} className="h-8 w-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 pb-24">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12 text-center"
        >
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-2">
            {booking?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground font-body text-sm uppercase tracking-widest">
            Project #{booking?.id?.slice(0, 8).toUpperCase()}
          </p>
        </motion.div>

        {/* Navigation - Minimal Top Nav */}
        <nav className="border-b border-border/50 mb-8">
          <div className="flex">
            {NAV_ITEMS.filter(item => item.key !== 'healing' || showHealingTab).map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex-1 py-4 text-center font-body text-sm transition-colors relative ${
                  activeTab === item.key 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <item.icon className="w-4 h-4 sm:hidden mx-auto" />
                {activeTab === item.key && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-px bg-foreground"
                  />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'project' && (
              <PortalProjectTab 
                booking={booking}
                notes={projectNotes}
                documents={clientDocuments}
                onRefresh={fetchProjectData}
              />
            )}
            
            {activeTab === 'session' && (
              <PortalSessionTab 
                booking={booking}
                payments={payments}
                onRequestReschedule={handleRequestReschedule}
                canReschedule={permissions?.can_reschedule || false}
              />
            )}
            
            {activeTab === 'preparation' && (
              <PortalPreparationTab booking={booking} />
            )}
            
            {activeTab === 'healing' && showHealingTab && (
              <HealingGuardianTab bookingId={booking?.id || ''} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Message Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowMessages(!showMessages)}
          className="h-14 w-14 rounded-full shadow-lg relative"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {unreadMessages}
            </span>
          )}
        </Button>
      </div>

      {/* Message Panel */}
      <AnimatePresence>
        {showMessages && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-80 md:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-body text-sm uppercase tracking-widest">Messages</h3>
              <button onClick={() => setShowMessages(false)} className="text-muted-foreground hover:text-foreground">
                ×
              </button>
            </div>
            
            <div className="h-80 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.sender_type === 'customer' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_type === 'customer' ? 'opacity-70' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {permissions?.can_message && (
              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="resize-none text-sm min-h-[60px]"
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
                    size="icon"
                    className="self-end h-10 w-10"
                  >
                    {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Footer */}
      <div className="fixed bottom-0 left-0 right-0 py-3 bg-background/80 backdrop-blur border-t border-border/50">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Shield className="w-3 h-3" />
          <span className="font-body">End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
