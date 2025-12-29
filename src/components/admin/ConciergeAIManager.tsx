import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
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
  RefreshCw,
  Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type ConciergeTab = "knowledge" | "training" | "conversations" | "settings";

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
  const [activeTab, setActiveTab] = useState<ConciergeTab>("knowledge");
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
    { id: "knowledge" as ConciergeTab, label: "Knowledge Base", icon: BookOpen },
    { id: "training" as ConciergeTab, label: "Training Q&A", icon: MessageSquare },
    { id: "conversations" as ConciergeTab, label: "Chat History", icon: Sparkles },
    { id: "settings" as ConciergeTab, label: "Settings", icon: Settings },
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
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .not("concierge_mode", "is", null)
      .order("started_at", { ascending: false })
      .limit(50);
    if (!error && data) setConversations(data);
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
    
    const { error } = await supabase.from("concierge_knowledge").insert({
      title: newKnowledge.title,
      content: newKnowledge.content,
      category: newKnowledge.category,
    });
    
    if (error) {
      toast({ title: "Error", description: "Failed to add knowledge entry", variant: "destructive" });
    } else {
      toast({ title: "Added", description: "Knowledge entry added to Concierge's brain" });
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
    toast({ title: "Saved", description: "Concierge settings updated" });
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
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-light text-foreground">
            Studio Concierge Training
          </h1>
          <p className="font-body text-muted-foreground mt-1">
            Customize the Concierge's knowledge, responses, and behavior
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-body text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Knowledge Base Tab */}
      <AnimatePresence mode="wait">
        {activeTab === "knowledge" && (
          <motion.div
            key="knowledge"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
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
              
              {knowledge.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No knowledge entries yet. Add some to enhance the Concierge!
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Training Q&A Tab */}
        {activeTab === "training" && (
          <motion.div
            key="training"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Train the Concierge with example questions and ideal responses.
              </p>
              <button
                onClick={() => setShowAddPair(!showAddPair)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Training Pair
              </button>
            </div>

            {/* Add New Training Pair Form */}
            {showAddPair && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 bg-card border border-border space-y-4"
              >
                <select
                  value={newPair.category}
                  onChange={(e) => setNewPair(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Example question a client might ask..."
                  value={newPair.question}
                  onChange={(e) => setNewPair(prev => ({ ...prev, question: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
                <textarea
                  placeholder="Ideal response the Concierge should give..."
                  value={newPair.ideal_response}
                  onChange={(e) => setNewPair(prev => ({ ...prev, ideal_response: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTrainingPair}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90"
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

            {/* Training Pairs List */}
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
                        className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary resize-none"
                      />
                      <textarea
                        value={editingPair.ideal_response}
                        onChange={(e) => setEditingPair(prev => prev ? { ...prev, ideal_response: e.target.value } : null)}
                        rows={3}
                        className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary resize-none"
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
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground uppercase tracking-wide">
                              {pair.category}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Used {pair.use_count}x
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                            <p className="text-sm text-foreground">{pair.question}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Bot className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                            <p className="text-sm text-muted-foreground line-clamp-2">{pair.ideal_response}</p>
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
              
              {trainingPairs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No training pairs yet. Add examples to improve responses!
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Conversations Tab */}
        {activeTab === "conversations" && (
          <motion.div
            key="conversations"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Review Concierge conversations. Click to expand and create training pairs.
              </p>
              <button
                onClick={fetchConversations}
                className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="space-y-2">
              {conversations.map((conv) => (
                <div key={conv.id} className="border border-border bg-card">
                  <button
                    onClick={() => loadConversationMessages(conv.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(conv.started_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conv.message_count} messages • Mode: {conv.concierge_mode || 'explore'}
                          {conv.converted && " • ✓ Converted"}
                        </p>
                      </div>
                    </div>
                    {selectedConversation === conv.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Expanded Messages */}
                  <AnimatePresence>
                    {selectedConversation === conv.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                          {loadingMessages ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            conversationMessages.map((msg, i) => (
                              <div
                                key={msg.id}
                                className={`flex items-start gap-2 ${msg.role === 'user' ? '' : 'pl-4'}`}
                              >
                                {msg.role === 'user' ? (
                                  <User className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <Bot className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm text-foreground">{msg.content}</p>
                                  {/* Option to create training pair */}
                                  {msg.role === 'assistant' && i > 0 && conversationMessages[i - 1]?.role === 'user' && (
                                    <button
                                      onClick={() => createTrainingFromMessage(
                                        conversationMessages[i - 1].content,
                                        msg.content
                                      )}
                                      className="mt-1 text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Create training pair
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              
              {conversations.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No Concierge conversations yet.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Configure the Concierge's behavior and personality.
              </p>
              <button
                onClick={() => editingSettings ? saveSettings() : setEditingSettings(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              >
                {editingSettings ? (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Edit Settings
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="p-4 bg-card border border-border">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  {setting.description && (
                    <p className="text-xs text-muted-foreground mb-2">{setting.description}</p>
                  )}
                  {editingSettings ? (
                    <input
                      type="text"
                      value={tempSettings[setting.setting_key] || ""}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        [setting.setting_key]: e.target.value
                      }))}
                      className="w-full px-3 py-2 bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <p className="text-sm text-foreground bg-secondary/50 px-3 py-2">
                      {setting.setting_value}
                    </p>
                  )}
                </div>
              ))}
              
              {settings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No settings configured yet.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConciergeAIManager;
