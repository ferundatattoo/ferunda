import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Clock,
  User,
  Bot,
  Loader2,
  X,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface ChatConversation {
  id: string;
  session_id: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  converted: boolean;
  conversion_type: string | null;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  conversions: number;
  conversionRate: number;
  commonQuestions: { question: string; count: number }[];
}

interface ConversationsManagerProps {
  conversations: ChatConversation[];
  stats: ChatStats | null;
  loading: boolean;
  onLoadMessages: (conversationId: string) => Promise<ChatMessage[]>;
}

const ConversationsManager = forwardRef<HTMLDivElement, ConversationsManagerProps>(({ 
  conversations, 
  stats, 
  loading,
  onLoadMessages
}, ref) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const handleSelectConversation = async (id: string) => {
    if (selectedConversation === id) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }
    
    setLoadingMessages(true);
    setSelectedConversation(id);
    const msgs = await onLoadMessages(id);
    setMessages(msgs);
    setLoadingMessages(false);
  };

  return (
    <div ref={ref} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-light text-foreground">
          Chat Conversations
        </h1>
        <p className="font-body text-muted-foreground mt-1">
          View chat history and analyze customer interactions
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-border p-4">
            <p className="font-display text-2xl font-light text-foreground">
              {stats.totalConversations}
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Total Conversations
            </p>
          </div>
          <div className="border border-border p-4">
            <p className="font-display text-2xl font-light text-foreground">
              {stats.totalMessages}
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Total Messages
            </p>
          </div>
          <div className="border border-border p-4">
            <p className="font-display text-2xl font-light text-foreground">
              {stats.conversions}
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Conversions
            </p>
          </div>
          <div className="border border-border p-4">
            <p className="font-display text-2xl font-light text-green-500">
              {stats.conversionRate}%
            </p>
            <p className="font-body text-sm text-muted-foreground">
              Conversion Rate
            </p>
          </div>
        </div>
      )}

      {/* Common Topics */}
      {stats && stats.commonQuestions.length > 0 && (
        <div className="border border-border p-6">
          <h3 className="font-display text-xl font-light text-foreground mb-4">
            Common Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.commonQuestions.map((q) => (
              <span
                key={q.question}
                className="px-3 py-1.5 bg-accent text-foreground font-body text-sm capitalize"
              >
                {q.question} <span className="text-muted-foreground">({q.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-20 border border-border">
          <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-muted-foreground">
            No conversations yet
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Conversations List */}
          <div className="border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="font-display text-lg text-foreground">
                Recent Conversations
              </h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    selectedConversation === conv.id
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="font-body text-sm text-foreground">
                        {conv.message_count} messages
                      </span>
                    </div>
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
              ))}
            </div>
          </div>

          {/* Message Viewer */}
          <div className="border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-lg text-foreground">
                Conversation
              </h3>
              {selectedConversation && (
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                    setMessages([]);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="h-[600px] overflow-y-auto p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !selectedConversation ? (
                <div className="flex items-center justify-center h-full">
                  <p className="font-body text-muted-foreground text-center">
                    Select a conversation to view messages
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="font-body text-muted-foreground">
                    No messages in this conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role !== "user" && (
                        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-foreground" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] p-3 ${
                          msg.role === "user"
                            ? "bg-foreground text-background"
                            : "bg-accent text-foreground"
                        }`}
                      >
                        <p className="font-body text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <p className={`font-body text-xs mt-2 ${
                          msg.role === "user" ? "text-background/60" : "text-muted-foreground"
                        }`}>
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-background" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ConversationsManager.displayName = "ConversationsManager";

export default ConversationsManager;
