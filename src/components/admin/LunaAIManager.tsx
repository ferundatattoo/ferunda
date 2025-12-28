import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  Mail, 
  Settings,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Send,
  RefreshCw,
  Tag,
  Clock,
  Check,
  Reply,
  ArrowLeft,
  Camera
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ScreenshotTrainer from "./ScreenshotTrainer";

type LunaTab = "screenshots" | "knowledge" | "training" | "emails" | "conversations" | "settings";

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface TrainingPair {
  id: string;
  question: string;
  ideal_response: string;
  category: string;
  is_active: boolean;
  use_count: number;
}

interface CustomerEmail {
  id: string;
  booking_id: string | null;
  customer_email: string;
  customer_name: string | null;
  subject: string | null;
  email_body: string;
  direction: string;
  sentiment: string | null;
  tags: string[] | null;
  is_read: boolean;
  created_at: string;
}

interface LunaSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

interface ChatConversation {
  id: string;
  session_id: string;
  started_at: string;
  message_count: number;
  converted: boolean;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const LunaAIManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<LunaTab>("screenshots");
  const [loading, setLoading] = useState(true);
  
  // Knowledge Base State
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeEntry | null>(null);
  const [newKnowledge, setNewKnowledge] = useState({ title: "", content: "", category: "general" });
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  
  // Training Pairs State
  const [trainingPairs, setTrainingPairs] = useState<TrainingPair[]>([]);
  const [editingPair, setEditingPair] = useState<TrainingPair | null>(null);
  const [newPair, setNewPair] = useState({ question: "", ideal_response: "", category: "general" });
  const [showAddPair, setShowAddPair] = useState(false);
  
  // Emails State
  const [emails, setEmails] = useState<CustomerEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<CustomerEmail | null>(null);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [newEmail, setNewEmail] = useState({ 
    customer_email: "", 
    customer_name: "", 
    subject: "", 
    email_body: "", 
    direction: "inbound" 
  });
  
  // Reply/Compose State
  const [showCompose, setShowCompose] = useState(false);
  const [replyMode, setReplyMode] = useState(false);
  const [composeEmail, setComposeEmail] = useState({
    to: "",
    subject: "",
    body: "",
    customerName: ""
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Conversations State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<LunaSetting[]>([]);
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<Record<string, string>>({});

  const tabs = [
    { id: "screenshots" as LunaTab, label: "Screenshot Training", icon: Camera },
    { id: "knowledge" as LunaTab, label: "Knowledge Base", icon: BookOpen },
    { id: "training" as LunaTab, label: "Training Q&A", icon: MessageSquare },
    { id: "emails" as LunaTab, label: "Email Replies", icon: Mail },
    { id: "conversations" as LunaTab, label: "Chat History", icon: Sparkles },
    { id: "settings" as LunaTab, label: "Settings", icon: Settings },
  ];

  const categories = ["general", "pricing", "booking", "aftercare", "style", "availability", "faq"];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchKnowledge(),
      fetchTrainingPairs(),
      fetchEmails(),
      fetchConversations(),
      fetchSettings(),
    ]);
    setLoading(false);
  };

  const fetchKnowledge = async () => {
    const { data, error } = await supabase
      .from("luna_knowledge")
      .select("*")
      .order("priority", { ascending: false });
    if (!error && data) setKnowledge(data);
  };

  const fetchTrainingPairs = async () => {
    const { data, error } = await supabase
      .from("luna_training_pairs")
      .select("*")
      .order("use_count", { ascending: false });
    if (!error && data) setTrainingPairs(data);
  };

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from("customer_emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setEmails(data);
  };

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    if (!error && data) setConversations(data);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("luna_settings")
      .select("*");
    if (!error && data) {
      setSettings(data);
      const settingsMap: Record<string, string> = {};
      data.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
      setTempSettings(settingsMap);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
      setConversationMessages([]);
      return;
    }
    
    setLoadingMessages(true);
    setSelectedConversation(conversationId);
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (!error && data) setConversationMessages(data);
    setLoadingMessages(false);
  };

  // Knowledge Base CRUD
  const addKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return;
    
    const { error } = await supabase.from("luna_knowledge").insert({
      title: newKnowledge.title,
      content: newKnowledge.content,
      category: newKnowledge.category,
    });
    
    if (error) {
      toast({ title: "Error", description: "Failed to add knowledge entry", variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Knowledge entry added to Luna's brain" });
      setNewKnowledge({ title: "", content: "", category: "general" });
      setShowAddKnowledge(false);
      fetchKnowledge();
    }
  };

  const updateKnowledge = async (entry: KnowledgeEntry) => {
    const { error } = await supabase
      .from("luna_knowledge")
      .update({ 
        title: entry.title, 
        content: entry.content, 
        category: entry.category,
        is_active: entry.is_active,
        priority: entry.priority 
      })
      .eq("id", entry.id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Knowledge entry updated" });
      setEditingKnowledge(null);
      fetchKnowledge();
    }
  };

  const deleteKnowledge = async (id: string) => {
    if (!confirm("Delete this knowledge entry?")) return;
    
    const { error } = await supabase.from("luna_knowledge").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Knowledge entry removed" });
      fetchKnowledge();
    }
  };

  // Training Pairs CRUD
  const addTrainingPair = async () => {
    if (!newPair.question || !newPair.ideal_response) return;
    
    const { error } = await supabase.from("luna_training_pairs").insert({
      question: newPair.question,
      ideal_response: newPair.ideal_response,
      category: newPair.category,
    });
    
    if (error) {
      toast({ title: "Error", description: "Failed to add training pair", variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Training pair added" });
      setNewPair({ question: "", ideal_response: "", category: "general" });
      setShowAddPair(false);
      fetchTrainingPairs();
    }
  };

  const updateTrainingPair = async (pair: TrainingPair) => {
    const { error } = await supabase
      .from("luna_training_pairs")
      .update({ 
        question: pair.question, 
        ideal_response: pair.ideal_response, 
        category: pair.category,
        is_active: pair.is_active 
      })
      .eq("id", pair.id);
    
    if (!error) {
      toast({ title: "Updated", description: "Training pair updated" });
      setEditingPair(null);
      fetchTrainingPairs();
    }
  };

  const deleteTrainingPair = async (id: string) => {
    if (!confirm("Delete this training pair?")) return;
    
    const { error } = await supabase.from("luna_training_pairs").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Training pair removed" });
      fetchTrainingPairs();
    }
  };

  // Emails CRUD
  const addEmail = async () => {
    if (!newEmail.customer_email || !newEmail.email_body) return;
    
    const { error } = await supabase.from("customer_emails").insert({
      customer_email: newEmail.customer_email,
      customer_name: newEmail.customer_name || null,
      subject: newEmail.subject || null,
      email_body: newEmail.email_body,
      direction: newEmail.direction,
    });
    
    if (error) {
      toast({ title: "Error", description: "Failed to add email", variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Email correspondence saved" });
      setNewEmail({ customer_email: "", customer_name: "", subject: "", email_body: "", direction: "inbound" });
      setShowAddEmail(false);
      fetchEmails();
    }
  };

  const markEmailAsRead = async (id: string) => {
    await supabase.from("customer_emails").update({ is_read: true }).eq("id", id);
    fetchEmails();
  };

const deleteEmail = async (id: string) => {
    if (!confirm("Delete this email?")) return;
    const { error } = await supabase.from("customer_emails").delete().eq("id", id);
    if (!error) fetchEmails();
  };

  // Send email via edge function
  const sendEmail = async () => {
    if (!composeEmail.to || !composeEmail.subject || !composeEmail.body) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setSendingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: composeEmail.to,
            subject: composeEmail.subject,
            body: composeEmail.body,
            customerName: composeEmail.customerName,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send email");
      }

      toast({ title: "Sent", description: "Email sent successfully" });
      setComposeEmail({ to: "", subject: "", body: "", customerName: "" });
      setShowCompose(false);
      setReplyMode(false);
      fetchEmails();
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send email", 
        variant: "destructive" 
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Start reply to email
  const startReply = (email: CustomerEmail) => {
    setReplyMode(true);
    setShowCompose(true);
    setComposeEmail({
      to: email.customer_email,
      subject: email.subject ? (email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`) : "Re: Your inquiry",
      body: "",
      customerName: email.customer_name || ""
    });
  };

  // Start new email
  const startNewEmail = () => {
    setReplyMode(false);
    setShowCompose(true);
    setComposeEmail({ to: "", subject: "", body: "", customerName: "" });
  };

  // Settings
  const saveSettings = async () => {
    for (const [key, value] of Object.entries(tempSettings)) {
      await supabase
        .from("luna_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
    }
    toast({ title: "Saved", description: "Luna settings updated" });
    setEditingSettings(false);
    fetchSettings();
  };

  // Create training pair from conversation
  const createTrainingFromMessage = (userMsg: string, assistantMsg: string) => {
    setNewPair({ question: userMsg, ideal_response: assistantMsg, category: "general" });
    setShowAddPair(true);
    setActiveTab("training");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-foreground" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Luna AI Training Center
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Personalize Luna's knowledge, responses, and behavior
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-body text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-foreground text-background"
                : "bg-accent text-foreground hover:bg-accent/80"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "screenshots" && (
          <motion.div
            key="screenshots"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ScreenshotTrainer />
          </motion.div>
        )}

        {activeTab === "knowledge" && (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-body text-sm text-muted-foreground">
                Add custom information for Luna to reference when answering questions
              </p>
              <button
                onClick={() => setShowAddKnowledge(!showAddKnowledge)}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Knowledge
              </button>
            </div>

            {/* Add Knowledge Form */}
            <AnimatePresence>
              {showAddKnowledge && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-border p-4 space-y-4"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Title (e.g., Pricing Information)"
                      value={newKnowledge.title}
                      onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                      className="w-full bg-transparent border-b border-border py-2 font-body text-sm focus:outline-none focus:border-foreground"
                    />
                    <select
                      value={newKnowledge.category}
                      onChange={(e) => setNewKnowledge({ ...newKnowledge, category: e.target.value })}
                      className="w-full bg-transparent border-b border-border py-2 font-body text-sm focus:outline-none focus:border-foreground"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-background">{cat}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    placeholder="Content - Add detailed information Luna should know..."
                    value={newKnowledge.content}
                    onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                    rows={4}
                    className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddKnowledge(false)}
                      className="px-4 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addKnowledge}
                      className="px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Knowledge List */}
            <div className="space-y-2">
              {knowledge.length === 0 ? (
                <div className="text-center py-12 border border-border">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No knowledge entries yet</p>
                  <p className="font-body text-sm text-muted-foreground mt-1">Add custom information for Luna</p>
                </div>
              ) : (
                knowledge.map((entry) => (
                  <div key={entry.id} className="border border-border p-4 hover:border-foreground/30 transition-colors">
                    {editingKnowledge?.id === entry.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingKnowledge.title}
                          onChange={(e) => setEditingKnowledge({ ...editingKnowledge, title: e.target.value })}
                          className="w-full bg-transparent border-b border-border py-1 font-body text-sm focus:outline-none focus:border-foreground"
                        />
                        <textarea
                          value={editingKnowledge.content}
                          onChange={(e) => setEditingKnowledge({ ...editingKnowledge, content: e.target.value })}
                          rows={3}
                          className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingKnowledge(null)} className="p-2 text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateKnowledge(editingKnowledge)} className="p-2 text-foreground hover:text-green-500">
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-0.5 text-xs font-body uppercase ${entry.is_active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
                                {entry.category}
                              </span>
                              {!entry.is_active && (
                                <span className="text-xs text-muted-foreground">(disabled)</span>
                              )}
                            </div>
                            <h4 className="font-display text-lg text-foreground">{entry.title}</h4>
                            <p className="font-body text-sm text-muted-foreground mt-1 line-clamp-2">{entry.content}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-4">
                            <button
                              onClick={() => updateKnowledge({ ...entry, is_active: !entry.is_active })}
                              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {entry.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setEditingKnowledge(entry)}
                              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteKnowledge(entry.id)}
                              className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "training" && (
          <motion.div
            key="training"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-body text-sm text-muted-foreground">
                Create Q&A pairs to train Luna on ideal responses
              </p>
              <button
                onClick={() => setShowAddPair(!showAddPair)}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Q&A Pair
              </button>
            </div>

            {/* Add Training Pair Form */}
            <AnimatePresence>
              {showAddPair && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-border p-4 space-y-4"
                >
                  <div>
                    <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                      Customer Question
                    </label>
                    <textarea
                      placeholder="What would a customer ask?"
                      value={newPair.question}
                      onChange={(e) => setNewPair({ ...newPair, question: e.target.value })}
                      rows={2}
                      className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                    />
                  </div>
                  <div>
                    <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                      Ideal Response
                    </label>
                    <textarea
                      placeholder="How should Luna respond?"
                      value={newPair.ideal_response}
                      onChange={(e) => setNewPair({ ...newPair, ideal_response: e.target.value })}
                      rows={4}
                      className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddPair(false)}
                      className="px-4 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addTrainingPair}
                      className="px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Training Pairs List */}
            <div className="space-y-3">
              {trainingPairs.length === 0 ? (
                <div className="text-center py-12 border border-border">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-body text-muted-foreground">No training pairs yet</p>
                </div>
              ) : (
                trainingPairs.map((pair) => (
                  <div key={pair.id} className="border border-border overflow-hidden">
                    <div className="p-4 bg-accent/30">
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-body text-sm text-foreground">{pair.question}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateTrainingPair({ ...pair, is_active: !pair.is_active })}
                            className="p-1.5 text-muted-foreground hover:text-foreground"
                          >
                            {pair.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteTrainingPair(pair.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <Bot className="w-5 h-5 text-foreground mt-0.5" />
                        <p className="font-body text-sm text-muted-foreground flex-1">{pair.ideal_response}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "emails" && (
          <motion.div
            key="emails"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Compose Email Panel */}
            <AnimatePresence>
              {showCompose && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border-2 border-foreground p-6 space-y-4 bg-accent/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setShowCompose(false); setReplyMode(false); }}
                        className="p-2 hover:bg-accent transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h3 className="font-display text-xl text-foreground">
                        {replyMode ? "Reply to Email" : "Compose New Email"}
                      </h3>
                    </div>
                    <Send className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                        To
                      </label>
                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={composeEmail.to}
                        onChange={(e) => setComposeEmail({ ...composeEmail, to: e.target.value })}
                        className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground"
                      />
                    </div>
                    <div>
                      <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                        Customer Name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={composeEmail.customerName}
                        onChange={(e) => setComposeEmail({ ...composeEmail, customerName: e.target.value })}
                        className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                      Subject
                    </label>
                    <input
                      type="text"
                      placeholder="Subject line..."
                      value={composeEmail.subject}
                      onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                      className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                      Message
                    </label>
                    <textarea
                      placeholder="Write your message here..."
                      value={composeEmail.body}
                      onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                      rows={8}
                      className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setShowCompose(false); setReplyMode(false); }}
                      className="px-6 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendEmail}
                      disabled={sendingEmail}
                      className="flex items-center gap-2 px-6 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      {sendingEmail ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send Email
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showCompose && (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-body text-sm text-muted-foreground">
                    Send & receive emails, track conversations for Luna to learn
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddEmail(!showAddEmail)}
                      className="flex items-center gap-2 px-4 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Log Email
                    </button>
                    <button
                      onClick={startNewEmail}
                      className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Compose
                    </button>
                  </div>
                </div>

                {/* Add Email Form (for logging past emails) */}
                <AnimatePresence>
                  {showAddEmail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-border p-4 space-y-4"
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="email"
                          placeholder="Customer Email"
                          value={newEmail.customer_email}
                          onChange={(e) => setNewEmail({ ...newEmail, customer_email: e.target.value })}
                          className="w-full bg-transparent border-b border-border py-2 font-body text-sm focus:outline-none focus:border-foreground"
                        />
                        <input
                          type="text"
                          placeholder="Customer Name (optional)"
                          value={newEmail.customer_name}
                          onChange={(e) => setNewEmail({ ...newEmail, customer_name: e.target.value })}
                          className="w-full bg-transparent border-b border-border py-2 font-body text-sm focus:outline-none focus:border-foreground"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Subject"
                          value={newEmail.subject}
                          onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                          className="w-full bg-transparent border-b border-border py-2 font-body text-sm focus:outline-none focus:border-foreground"
                        />
                        <select
                          value={newEmail.direction}
                          onChange={(e) => setNewEmail({ ...newEmail, direction: e.target.value })}
                          className="w-full bg-transparent border-b border-border py-2 font-body text-sm focus:outline-none focus:border-foreground"
                        >
                          <option value="inbound" className="bg-background">Inbound (from customer)</option>
                          <option value="outbound" className="bg-background">Outbound (your reply)</option>
                        </select>
                      </div>
                      <textarea
                        placeholder="Email content..."
                        value={newEmail.email_body}
                        onChange={(e) => setNewEmail({ ...newEmail, email_body: e.target.value })}
                        rows={6}
                        className="w-full bg-transparent border border-border p-3 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowAddEmail(false)}
                          className="px-4 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addEmail}
                          className="px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Emails List */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="border border-border">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-display text-lg text-foreground">Email Correspondence</h3>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
                      {emails.length === 0 ? (
                        <div className="p-8 text-center">
                          <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="font-body text-sm text-muted-foreground">No emails yet</p>
                        </div>
                      ) : (
                        emails.map((email) => (
                          <button
                            key={email.id}
                            onClick={() => {
                              setSelectedEmail(email);
                              if (!email.is_read) markEmailAsRead(email.id);
                            }}
                            className={`w-full text-left p-4 transition-colors ${
                              selectedEmail?.id === email.id ? "bg-accent" : "hover:bg-accent/50"
                            } ${!email.is_read ? "border-l-2 border-l-foreground" : ""}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-body uppercase ${
                                email.direction === "inbound" ? "text-blue-500" : "text-green-500"
                              }`}>
                                {email.direction}
                              </span>
                              <span className="text-xs text-muted-foreground font-body">
                                {format(new Date(email.created_at), "MMM d")}
                              </span>
                            </div>
                            <p className="font-body text-sm text-foreground truncate">
                              {email.customer_name || email.customer_email}
                            </p>
                            <p className="font-body text-xs text-muted-foreground truncate mt-0.5">
                              {email.subject || "No subject"}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border border-border">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-display text-lg text-foreground">Email Content</h3>
                      {selectedEmail && (
                        <div className="flex items-center gap-2">
                          {selectedEmail.direction === "inbound" && (
                            <button
                              onClick={() => startReply(selectedEmail)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-foreground text-background font-body text-xs hover:bg-foreground/90 transition-colors"
                            >
                              <Reply className="w-3 h-3" />
                              Reply
                            </button>
                          )}
                          <button
                            onClick={() => deleteEmail(selectedEmail.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-4 min-h-[400px]">
                      {selectedEmail ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="font-body text-xs text-muted-foreground">
                                {selectedEmail.direction === "inbound" ? "From:" : "To:"}
                              </span>
                              <span className="font-body text-sm text-foreground">{selectedEmail.customer_email}</span>
                            </div>
                            {selectedEmail.subject && (
                              <div className="flex justify-between">
                                <span className="font-body text-xs text-muted-foreground">Subject:</span>
                                <span className="font-body text-sm text-foreground">{selectedEmail.subject}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="font-body text-xs text-muted-foreground">Date:</span>
                              <span className="font-body text-sm text-foreground">
                                {format(new Date(selectedEmail.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-border pt-4">
                            <p className="font-body text-sm text-foreground whitespace-pre-wrap">
                              {selectedEmail.email_body}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="font-body text-sm text-muted-foreground">Select an email to view</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === "conversations" && (
          <motion.div
            key="conversations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-body text-sm text-muted-foreground">
                Review chat conversations and create training pairs from real interactions
              </p>
              <button
                onClick={fetchConversations}
                className="flex items-center gap-2 px-4 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {/* Conversations List */}
              <div className="border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-display text-lg text-foreground">Recent Chats</h3>
                </div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="font-body text-sm text-muted-foreground">No conversations yet</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversationMessages(conv.id)}
                        className={`w-full text-left p-4 transition-colors ${
                          selectedConversation === conv.id ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body text-sm text-foreground">
                            {conv.message_count} messages
                          </span>
                          {conv.converted && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-body">
                              Converted
                            </span>
                          )}
                        </div>
                        <p className="font-body text-xs text-muted-foreground">
                          {format(new Date(conv.started_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Messages Viewer */}
              <div className="border border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-display text-lg text-foreground">Conversation</h3>
                </div>
                <div className="h-[500px] overflow-y-auto p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !selectedConversation ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="font-body text-sm text-muted-foreground">Select a conversation</p>
                    </div>
                  ) : conversationMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="font-body text-sm text-muted-foreground">No messages</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conversationMessages.map((msg, index) => {
                        const nextMsg = conversationMessages[index + 1];
                        const canCreateTraining = msg.role === "user" && nextMsg?.role === "assistant";
                        
                        return (
                          <div key={msg.id} className="group">
                            <div className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                              {msg.role !== "user" && (
                                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                                  <Bot className="w-3 h-3" />
                                </div>
                              )}
                              <div
                                className={`max-w-[80%] p-3 text-sm font-body ${
                                  msg.role === "user"
                                    ? "bg-foreground text-background"
                                    : "bg-accent text-foreground"
                                }`}
                              >
                                {msg.content}
                              </div>
                              {msg.role === "user" && (
                                <div className="w-6 h-6 bg-foreground rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-3 h-3 text-background" />
                                </div>
                              )}
                            </div>
                            {canCreateTraining && (
                              <div className="flex justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => createTrainingFromMessage(msg.content, nextMsg.content)}
                                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Create training pair
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <p className="font-body text-sm text-muted-foreground">
                Configure Luna's personality and behavior
              </p>
              {editingSettings ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingSettings(false)}
                    className="px-4 py-2 border border-border text-foreground font-body text-sm hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Settings
                </button>
              )}
            </div>

            <div className="grid gap-4">
              {/* Personality */}
              <div className="border border-border p-4">
                <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Personality Style
                </label>
                {editingSettings ? (
                  <select
                    value={tempSettings.personality || "friendly"}
                    onChange={(e) => setTempSettings({ ...tempSettings, personality: e.target.value })}
                    className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground"
                  >
                    <option value="friendly" className="bg-background">Friendly & Warm</option>
                    <option value="professional" className="bg-background">Professional & Formal</option>
                    <option value="casual" className="bg-background">Casual & Relaxed</option>
                  </select>
                ) : (
                  <p className="font-body text-foreground capitalize">{tempSettings.personality || "friendly"}</p>
                )}
              </div>

              {/* Greeting */}
              <div className="border border-border p-4">
                <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Default Greeting
                </label>
                {editingSettings ? (
                  <textarea
                    value={tempSettings.greeting || ""}
                    onChange={(e) => setTempSettings({ ...tempSettings, greeting: e.target.value })}
                    rows={3}
                    className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground resize-none"
                  />
                ) : (
                  <p className="font-body text-foreground">{tempSettings.greeting || "Not set"}</p>
                )}
              </div>

              {/* Use Emojis */}
              <div className="border border-border p-4">
                <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Use Emojis
                </label>
                {editingSettings ? (
                  <select
                    value={tempSettings.use_emojis || "true"}
                    onChange={(e) => setTempSettings({ ...tempSettings, use_emojis: e.target.value })}
                    className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground"
                  >
                    <option value="true" className="bg-background">Yes ✨</option>
                    <option value="false" className="bg-background">No</option>
                  </select>
                ) : (
                  <p className="font-body text-foreground">{tempSettings.use_emojis === "true" ? "Yes ✨" : "No"}</p>
                )}
              </div>

              {/* Response Length */}
              <div className="border border-border p-4">
                <label className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                  Response Length
                </label>
                {editingSettings ? (
                  <select
                    value={tempSettings.response_length || "medium"}
                    onChange={(e) => setTempSettings({ ...tempSettings, response_length: e.target.value })}
                    className="w-full bg-transparent border border-border p-2 font-body text-sm focus:outline-none focus:border-foreground"
                  >
                    <option value="short" className="bg-background">Short (1-2 sentences)</option>
                    <option value="medium" className="bg-background">Medium (2-4 sentences)</option>
                    <option value="long" className="bg-background">Long (detailed responses)</option>
                  </select>
                ) : (
                  <p className="font-body text-foreground capitalize">{tempSettings.response_length || "medium"}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LunaAIManager;