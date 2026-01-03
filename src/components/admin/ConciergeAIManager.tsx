import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, BookOpen, MessageSquare, Settings, Users, DollarSign,
  GitBranch, FileText, Plus, Trash2, Edit2, Save, X, Loader2, 
  Eye, EyeOff, ChevronDown, ChevronUp, Bot, User, RefreshCw, Tag, Camera
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// Import sub-managers
import ArtistsManager from "./concierge/ArtistsManager";
import PricingModelsManager from "./concierge/PricingModelsManager";
import MessageTemplatesManager from "./concierge/MessageTemplatesManager";
import ConversationFlowManager from "./concierge/ConversationFlowManager";
import ConciergeScreenshotTrainer from "./concierge/ScreenshotTrainer";
import ArtistCapabilitiesManager from "./concierge/ArtistCapabilitiesManager";
import { FactsVaultManager } from "./concierge/FactsVaultManager";
import { GuestSpotManager } from "./concierge/GuestSpotManager";
import { VoiceProfileEditor } from "./concierge/VoiceProfileEditor";
import { RegressionTestRunner } from "./concierge/RegressionTestRunner";
import { Shield, Database, MapPin, Mic, FlaskConical } from "lucide-react";

type ConciergeTab = "artists" | "capabilities" | "facts" | "guestspots" | "voice" | "pricing" | "flow" | "templates" | "knowledge" | "training" | "screenshots" | "tests" | "conversations" | "settings";

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

interface ConciergeSetting {
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
  concierge_mode: string | null;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

const ConciergeAIManager = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ConciergeTab>("flow");
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
  
  // Conversations State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<ConciergeSetting[]>([]);
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<Record<string, string>>({});

  const tabs = [
    { id: "flow" as ConciergeTab, label: "Conversation Flow", icon: GitBranch, description: "One question at a time" },
    { id: "templates" as ConciergeTab, label: "Messages", icon: FileText, description: "Key message templates" },
    { id: "artists" as ConciergeTab, label: "Artists", icon: Users, description: "Manage team" },
    { id: "capabilities" as ConciergeTab, label: "Capabilities", icon: Shield, description: "What artists accept/reject" },
    { id: "facts" as ConciergeTab, label: "Facts Vault", icon: Database, description: "Verified artist facts" },
    { id: "guestspots" as ConciergeTab, label: "Guest Spots", icon: MapPin, description: "Travel dates & events" },
    { id: "voice" as ConciergeTab, label: "Voice", icon: Mic, description: "Tone & messaging rules" },
    { id: "pricing" as ConciergeTab, label: "Pricing", icon: DollarSign, description: "Rates & deposits" },
    { id: "knowledge" as ConciergeTab, label: "Knowledge", icon: BookOpen, description: "Facts & info" },
    { id: "training" as ConciergeTab, label: "Training", icon: MessageSquare, description: "Q&A examples" },
    { id: "screenshots" as ConciergeTab, label: "Screenshots", icon: Camera, description: "Learn from DMs" },
    { id: "tests" as ConciergeTab, label: "Tests", icon: FlaskConical, description: "Regression tests" },
    { id: "conversations" as ConciergeTab, label: "History", icon: Sparkles, description: "Past chats" },
    { id: "settings" as ConciergeTab, label: "Settings", icon: Settings, description: "Behavior" },
  ];

  const categories = ["general", "pricing", "booking", "aftercare", "style", "availability", "faq", "policies"];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchKnowledge(),
      fetchTrainingPairs(),
      fetchConversations(),
      fetchSettings(),
    ]);
    setLoading(false);
  };

  const fetchKnowledge = async () => {
    const { data, error } = await supabase
      .from("concierge_knowledge")
      .select("*")
      .order("priority", { ascending: false });
    if (!error && data) setKnowledge(data);
  };

  const fetchTrainingPairs = async () => {
    const { data, error } = await supabase
      .from("concierge_training_pairs")
      .select("*")
      .order("use_count", { ascending: false });
    if (!error && data) setTrainingPairs(data);
  };

  const fetchConversations = async () => {
    // Using modern concierge_sessions table
    const { data, error } = await supabase
      .from("concierge_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) {
      // Map to legacy format for compatibility
      const mapped = data.map(s => ({
        id: s.id,
        session_id: s.id,
        started_at: s.created_at,
        ended_at: s.stage === 'confirmed' ? s.updated_at : null,
        message_count: s.message_count,
        concierge_mode: 'ethereal',
        converted: s.stage === 'confirmed',
      }));
      setConversations(mapped);
    }
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("concierge_settings")
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
    
    // Using modern concierge_messages table
    const { data, error } = await supabase
      .from("concierge_messages")
      .select("*")
      .eq("session_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      // Map to legacy format for compatibility
      const mapped = data.map(m => ({
        id: m.id,
        conversation_id: m.session_id,
        role: m.role,
        content: m.content || '',
        created_at: m.created_at,
      }));
      setConversationMessages(mapped);
    }
    setLoadingMessages(false);
  };

  // Knowledge Base CRUD
  const addKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return;
    
    const { error } = await supabase.from("concierge_knowledge").insert({
      title: newKnowledge.title,
      content: newKnowledge.content,
      category: newKnowledge.category,
    });
    
    if (error) {
      toast({ title: "Error", description: "Failed to add knowledge entry", variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Knowledge entry added" });
      setNewKnowledge({ title: "", content: "", category: "general" });
      setShowAddKnowledge(false);
      fetchKnowledge();
    }
  };

  const updateKnowledge = async (entry: KnowledgeEntry) => {
    const { error } = await supabase
      .from("concierge_knowledge")
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
    
    const { error } = await supabase.from("concierge_knowledge").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Knowledge entry removed" });
      fetchKnowledge();
    }
  };

  // Training Pairs CRUD
  const addTrainingPair = async () => {
    if (!newPair.question || !newPair.ideal_response) return;
    
    const { error } = await supabase.from("concierge_training_pairs").insert({
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
      .from("concierge_training_pairs")
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
    
    const { error } = await supabase.from("concierge_training_pairs").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Training pair removed" });
      fetchTrainingPairs();
    }
  };

  // Settings
  const saveSettings = async () => {
    for (const [key, value] of Object.entries(tempSettings)) {
      await supabase
        .from("concierge_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
    }
    toast({ title: "Saved", description: "Settings updated" });
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
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap transition-colors rounded-t ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Artists Tab */}
          {activeTab === "artists" && <ArtistsManager />}

          {/* Capabilities Tab */}
          {activeTab === "capabilities" && <ArtistCapabilitiesManager />}

          {/* Facts Vault Tab */}
          {activeTab === "facts" && <FactsVaultManager />}

          {/* Guest Spots Tab */}
          {activeTab === "guestspots" && <GuestSpotManager />}

          {/* Voice Profile Tab */}
          {activeTab === "voice" && <VoiceProfileEditor />}

          {/* Pricing Tab */}
          {activeTab === "pricing" && <PricingModelsManager />}

          {/* Flow Tab */}
          {activeTab === "flow" && <ConversationFlowManager />}

          {/* Templates Tab */}
          {activeTab === "templates" && <MessageTemplatesManager />}

          {/* Knowledge Base Tab */}
          {activeTab === "knowledge" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Add knowledge that the Concierge can reference when answering questions.
                </p>
                <button
                  onClick={() => setShowAddKnowledge(!showAddKnowledge)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </button>
              </div>

              {/* Add New Knowledge Form */}
              {showAddKnowledge && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-card border border-border space-y-4"
                >
                  <input
                    type="text"
                    placeholder="Title"
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <select
                    value={newKnowledge.category}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Content - what should the Concierge know?"
                    value={newKnowledge.content}
                    onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addKnowledge}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setShowAddKnowledge(false)}
                      className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Knowledge Entries List */}
              <div className="space-y-3">
                {knowledge.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 bg-card border ${entry.is_active ? 'border-border' : 'border-muted opacity-60'}`}
                  >
                    {editingKnowledge?.id === entry.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingKnowledge.title}
                          onChange={(e) => setEditingKnowledge(prev => prev ? { ...prev, title: e.target.value } : null)}
                          className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                        />
                        <textarea
                          value={editingKnowledge.content}
                          onChange={(e) => setEditingKnowledge(prev => prev ? { ...prev, content: e.target.value } : null)}
                          rows={3}
                          className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateKnowledge(editingKnowledge)}
                            className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-sm"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingKnowledge(null)}
                            className="px-3 py-1 text-muted-foreground text-sm hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground uppercase tracking-wide">
                                {entry.category}
                              </span>
                              {!entry.is_active && (
                                <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-foreground mb-1">{entry.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateKnowledge({ ...entry, is_active: !entry.is_active })}
                              className="p-2 text-muted-foreground hover:text-foreground"
                              title={entry.is_active ? "Deactivate" : "Activate"}
                            >
                              {entry.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setEditingKnowledge(entry)}
                              className="p-2 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteKnowledge(entry.id)}
                              className="p-2 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training Tab */}
          {activeTab === "training" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Teach the Concierge how to respond to common questions.
                </p>
                <button
                  onClick={() => setShowAddPair(!showAddPair)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Add Q&A
                </button>
              </div>

              {showAddPair && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 bg-card border border-border space-y-4"
                >
                  <textarea
                    placeholder="Question"
                    value={newPair.question}
                    onChange={(e) => setNewPair(prev => ({ ...prev, question: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                  <textarea
                    placeholder="Ideal Response"
                    value={newPair.ideal_response}
                    onChange={(e) => setNewPair(prev => ({ ...prev, ideal_response: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addTrainingPair}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setShowAddPair(false)}
                      className="px-4 py-2 text-muted-foreground text-sm hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                {trainingPairs.map((pair) => (
                  <div
                    key={pair.id}
                    className={`p-4 bg-card border ${pair.is_active ? 'border-border' : 'border-muted opacity-60'}`}
                  >
                    {editingPair?.id === pair.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingPair.question}
                          onChange={(e) => setEditingPair(prev => prev ? { ...prev, question: e.target.value } : null)}
                          rows={2}
                          className="w-full px-3 py-2 bg-background border border-border text-foreground resize-none"
                        />
                        <textarea
                          value={editingPair.ideal_response}
                          onChange={(e) => setEditingPair(prev => prev ? { ...prev, ideal_response: e.target.value } : null)}
                          rows={3}
                          className="w-full px-3 py-2 bg-background border border-border text-foreground resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTrainingPair(editingPair)}
                            className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-sm"
                          >
                            <Save className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPair(null)}
                            className="px-3 py-1 text-muted-foreground text-sm hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <p className="text-sm text-foreground">{pair.question}</p>
                            </div>
                            <div className="flex items-start gap-2 pl-6">
                              <Bot className="w-4 h-4 text-primary mt-0.5" />
                              <p className="text-sm text-muted-foreground">{pair.ideal_response}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 pl-6">
                              <span className="text-xs text-muted-foreground">
                                Used {pair.use_count} times
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateTrainingPair({ ...pair, is_active: !pair.is_active })}
                              className="p-2 text-muted-foreground hover:text-foreground"
                            >
                              {pair.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setEditingPair(pair)}
                              className="p-2 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTrainingPair(pair.id)}
                              className="p-2 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshots Tab */}
          {activeTab === "screenshots" && <ConciergeScreenshotTrainer />}

          {/* Regression Tests Tab */}
          {activeTab === "tests" && <RegressionTestRunner />}

          {/* Conversations Tab */}
          {activeTab === "conversations" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review past Concierge conversations. Click to expand and optionally create training pairs.
              </p>

              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div key={conv.id} className="bg-card border border-border">
                    <button
                      onClick={() => loadConversationMessages(conv.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {format(new Date(conv.started_at), "MMM d, h:mm a")}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground">
                              {conv.concierge_mode}
                            </span>
                            {conv.converted && (
                              <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary">
                                Converted
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {conv.message_count} messages
                          </span>
                        </div>
                      </div>
                      {selectedConversation === conv.id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {selectedConversation === conv.id && (
                      <div className="border-t border-border p-4 space-y-3">
                        {loadingMessages ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : (
                          conversationMessages.map((msg, idx) => (
                            <div
                              key={msg.id}
                              className={`flex gap-2 ${msg.role === 'user' ? '' : 'pl-4'}`}
                            >
                              {msg.role === 'user' ? (
                                <User className="w-4 h-4 text-muted-foreground mt-1" />
                              ) : (
                                <Bot className="w-4 h-4 text-primary mt-1" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm text-foreground">{msg.content}</p>
                                {msg.role === 'user' && conversationMessages[idx + 1]?.role === 'assistant' && (
                                  <button
                                    onClick={() => createTrainingFromMessage(
                                      msg.content,
                                      conversationMessages[idx + 1].content
                                    )}
                                    className="text-xs text-primary mt-1 hover:underline"
                                  >
                                    + Create training pair
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Configure Concierge behavior and personality.
                </p>
                {editingSettings ? (
                  <div className="flex gap-2">
                    <button
                      onClick={saveSettings}
                      className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingSettings(false)}
                      className="px-3 py-2 text-muted-foreground text-sm hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingSettings(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {settings.map((setting) => (
                  <div key={setting.id} className="p-4 bg-card border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground capitalize">
                          {setting.setting_key.replace(/_/g, ' ')}
                        </h3>
                        {setting.description && (
                          <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
                        )}
                      </div>
                      {editingSettings ? (
                        <input
                          type="text"
                          value={tempSettings[setting.setting_key] || ""}
                          onChange={(e) => setTempSettings(prev => ({
                            ...prev,
                            [setting.setting_key]: e.target.value
                          }))}
                          className="px-3 py-1 bg-background border border-border text-foreground text-sm w-48"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {setting.setting_value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ConciergeAIManager;
