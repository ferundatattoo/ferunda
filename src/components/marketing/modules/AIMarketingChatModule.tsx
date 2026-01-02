import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  "Generate a caption for my latest tattoo post",
  "What hashtags should I use for traditional tattoos?",
  "Create a content calendar for this week",
  "Analyze my competitor's strategy",
];

const AIMarketingChatModule = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your AI marketing assistant. I can help you create content, analyze trends, schedule posts, and more. What would you like to work on today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Determine the action based on the input
      let action = "generate_content";
      let payload: Record<string, unknown> = { topic: userInput, platform: "instagram", tone: "professional" };

      const lowerInput = userInput.toLowerCase();
      
      if (lowerInput.includes("hashtag")) {
        action = "generate_hashtags";
        payload = { topic: userInput.replace(/hashtag/gi, "").trim(), count: 10 };
      } else if (lowerInput.includes("trend") || lowerInput.includes("trending")) {
        action = "analyze_trends";
        payload = { industry: "tattoo", platforms: ["instagram", "tiktok"] };
      } else if (lowerInput.includes("competitor")) {
        action = "competitor_analysis";
        payload = { competitor_name: userInput.replace(/competitor|analysis|analyze/gi, "").trim() || "competitor" };
      } else if (lowerInput.includes("schedule") || lowerInput.includes("calendar")) {
        action = "get_optimal_times";
        payload = { platform: "instagram" };
      }

      const { data, error } = await supabase.functions.invoke("ai-marketing-nexus", {
        body: { action, payload },
      });

      if (error) throw error;

      let responseContent = "";

      if (data?.success) {
        switch (action) {
          case "generate_content":
            responseContent = data.data?.content || "I've generated content for you. Here it is:\n\n" + JSON.stringify(data.data, null, 2);
            break;
          case "generate_hashtags":
            const hashtags = data.data?.hashtags || [];
            responseContent = `Here are some suggested hashtags:\n\n${hashtags.map((h: any) => h.tag || h).join(" ")}\n\nThese hashtags are optimized for reach and engagement!`;
            break;
          case "analyze_trends":
            const trends = data.data?.trends || [];
            responseContent = `Here are the current trends:\n\n${trends.map((t: any) => `• ${t.topic || t.name} (${t.platform}) - Score: ${t.score || 'N/A'}`).join("\n")}\n\nWould you like me to create content based on any of these trends?`;
            break;
          case "competitor_analysis":
            responseContent = `Competitor Analysis:\n\n${JSON.stringify(data.data, null, 2)}\n\nWould you like me to suggest strategies based on this analysis?`;
            break;
          case "get_optimal_times":
            const times = data.data?.optimal_times || [];
            responseContent = `Here are the optimal posting times:\n\n${times.map((t: any) => `• ${t.day}: ${t.times?.join(", ") || t}`).join("\n")}\n\nPosting at these times can increase your engagement!`;
            break;
          default:
            responseContent = JSON.stringify(data.data, null, 2);
        }
      } else {
        responseContent = data?.error || "I encountered an issue processing your request. Please try again.";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling AI:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Error communicating with AI");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Marketing Chat</h1>
        <p className="text-muted-foreground">Get instant help with your marketing tasks</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-[500px] flex flex-col">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Marketing Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Prompts */}
          <div className="px-4 py-2 border-t border-border/50">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {quickPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap text-xs"
                  onClick={() => handleQuickPrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask anything about marketing..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIMarketingChatModule;
