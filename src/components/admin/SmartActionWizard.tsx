import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  User,
  MessageCircle,
  Clock,
  Mail,
  Sparkles,
  Loader2,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type WizardType = "new-booking" | "follow-up" | "schedule" | "send-message";

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

interface SmartActionWizardProps {
  type: WizardType;
  onClose: () => void;
  onComplete: (data: any) => void;
}

const WIZARD_CONFIG: Record<WizardType, { title: string; icon: React.ElementType; steps: WizardStep[] }> = {
  "new-booking": {
    title: "New Booking",
    icon: Calendar,
    steps: [
      { id: "client", title: "Client Info", description: "Who is this booking for?" },
      { id: "details", title: "Tattoo Details", description: "Describe the project" },
      { id: "schedule", title: "Scheduling", description: "When should we schedule?" },
      { id: "confirm", title: "Confirm", description: "Review and create" }
    ]
  },
  "follow-up": {
    title: "Quick Follow-up",
    icon: MessageCircle,
    steps: [
      { id: "select", title: "Select Clients", description: "Who needs follow-up?" },
      { id: "message", title: "Message", description: "Craft your message" },
      { id: "confirm", title: "Send", description: "Review and send" }
    ]
  },
  "schedule": {
    title: "Smart Schedule",
    icon: Clock,
    steps: [
      { id: "booking", title: "Select Booking", description: "Which booking to schedule?" },
      { id: "suggestions", title: "AI Suggestions", description: "Recommended time slots" },
      { id: "confirm", title: "Confirm", description: "Finalize the appointment" }
    ]
  },
  "send-message": {
    title: "Quick Message",
    icon: Mail,
    steps: [
      { id: "recipient", title: "Recipient", description: "Who to message?" },
      { id: "compose", title: "Compose", description: "Write your message" },
      { id: "send", title: "Send", description: "Review and send" }
    ]
  }
};

const SmartActionWizard = ({ type, onClose, onComplete }: SmartActionWizardProps) => {
  const config = WIZARD_CONFIG[type];
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const step = config.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === config.steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    onComplete(data);
    onClose();
  };

  const updateData = (key: string, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <config.icon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h2 className="font-display text-lg font-medium text-foreground">
                {config.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {config.steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-2 bg-accent/30">
          <div className="flex gap-2">
            {config.steps.map((s, idx) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  idx <= currentStep ? "bg-foreground" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="mb-6">
                <h3 className="font-display text-xl font-light text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {/* Dynamic Step Content */}
              {type === "new-booking" && (
                <NewBookingStep
                  stepId={step.id}
                  data={data}
                  onUpdate={updateData}
                />
              )}

              {type === "follow-up" && (
                <FollowUpStep
                  stepId={step.id}
                  data={data}
                  onUpdate={updateData}
                />
              )}

              {type === "schedule" && (
                <ScheduleStep
                  stepId={step.id}
                  data={data}
                  onUpdate={updateData}
                />
              )}

              {type === "send-message" && (
                <SendMessageStep
                  stepId={step.id}
                  data={data}
                  onUpdate={updateData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-accent/10">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={isFirstStep || isProcessing}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={isProcessing}
            className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : isLastStep ? (
              <>
                <Check className="w-4 h-4" />
                Complete
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Step Components
interface StepProps {
  stepId: string;
  data: Record<string, any>;
  onUpdate: (key: string, value: any) => void;
}

const NewBookingStep = ({ stepId, data, onUpdate }: StepProps) => {
  if (stepId === "client") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Client Name</Label>
          <Input
            placeholder="Enter client name"
            value={data.clientName || ""}
            onChange={(e) => onUpdate("clientName", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="client@email.com"
            value={data.clientEmail || ""}
            onChange={(e) => onUpdate("clientEmail", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone (optional)</Label>
          <Input
            placeholder="+1 (555) 000-0000"
            value={data.clientPhone || ""}
            onChange={(e) => onUpdate("clientPhone", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (stepId === "details") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tattoo Description</Label>
          <Textarea
            placeholder="Describe the tattoo idea..."
            value={data.description || ""}
            onChange={(e) => onUpdate("description", e.target.value)}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Size</Label>
            <RadioGroup
              value={data.size || ""}
              onValueChange={(v) => onUpdate("size", v)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="small" />
                <Label htmlFor="small" className="font-normal">Small (2-4")</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="font-normal">Medium (4-6")</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="large" />
                <Label htmlFor="large" className="font-normal">Large (6"+)</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label>Placement</Label>
            <Input
              placeholder="e.g., Forearm"
              value={data.placement || ""}
              onChange={(e) => onUpdate("placement", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (stepId === "schedule") {
    return (
      <div className="space-y-4">
        <div className="p-4 border border-border rounded-lg bg-accent/20">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-foreground" />
            <span className="font-medium text-foreground">AI Suggestions</span>
          </div>
          <div className="space-y-2">
            {["Tomorrow at 2:00 PM", "Friday at 10:00 AM", "Next Monday at 3:00 PM"].map((slot, idx) => (
              <button
                key={idx}
                onClick={() => onUpdate("scheduledSlot", slot)}
                className={`w-full p-3 text-left border rounded-lg transition-colors ${
                  data.scheduledSlot === slot
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:bg-accent/50"
                }`}
              >
                <p className="text-sm font-medium text-foreground">{slot}</p>
                <p className="text-xs text-muted-foreground">
                  {idx === 0 ? "Best availability" : idx === 1 ? "Good for longer sessions" : "Recommended"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stepId === "confirm") {
    return (
      <div className="space-y-4">
        <div className="p-4 border border-border rounded-lg space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Client</span>
            <span className="text-foreground font-medium">{data.clientName || "Not set"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{data.clientEmail || "Not set"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Size</span>
            <span className="text-foreground capitalize">{data.size || "Not set"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Placement</span>
            <span className="text-foreground">{data.placement || "Not set"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Scheduled</span>
            <span className="text-foreground">{data.scheduledSlot || "Not set"}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          A confirmation email will be sent to the client
        </p>
      </div>
    );
  }

  return null;
};

const FollowUpStep = ({ stepId, data, onUpdate }: StepProps) => {
  const mockClients = [
    { id: "1", name: "Sarah Johnson", status: "pending", days: 3 },
    { id: "2", name: "Mike Chen", status: "pending", days: 5 },
    { id: "3", name: "Emily Rodriguez", status: "pending", days: 7 }
  ];

  if (stepId === "select") {
    return (
      <div className="space-y-3">
        {mockClients.map(client => (
          <button
            key={client.id}
            onClick={() => {
              const selected = data.selectedClients || [];
              const isSelected = selected.includes(client.id);
              onUpdate("selectedClients", isSelected
                ? selected.filter((id: string) => id !== client.id)
                : [...selected, client.id]
              );
            }}
            className={`w-full p-3 flex items-center justify-between border rounded-lg transition-colors ${
              (data.selectedClients || []).includes(client.id)
                ? "border-foreground bg-foreground/5"
                : "border-border hover:bg-accent/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <User className="w-4 h-4 text-foreground" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{client.name}</p>
                <p className="text-xs text-muted-foreground">Waiting {client.days} days</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              (data.selectedClients || []).includes(client.id)
                ? "border-foreground bg-foreground"
                : "border-border"
            }`}>
              {(data.selectedClients || []).includes(client.id) && (
                <Check className="w-3 h-3 text-background" />
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (stepId === "message") {
    const templates = [
      "Hi! Just following up on your tattoo inquiry. Ready to get started?",
      "Checking in to see if you have any questions about your upcoming tattoo.",
      "Hi there! Your design is ready for review. Let me know when you're free."
    ];

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Quick Templates</Label>
          <div className="space-y-2">
            {templates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => onUpdate("message", template)}
                className="w-full p-2 text-left text-sm border border-border rounded hover:bg-accent/50 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Or write custom</Label>
          <Textarea
            placeholder="Write your message..."
            value={data.message || ""}
            onChange={(e) => onUpdate("message", e.target.value)}
            rows={4}
          />
        </div>
      </div>
    );
  }

  if (stepId === "confirm") {
    const selectedCount = (data.selectedClients || []).length;
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-accent mx-auto flex items-center justify-center">
          <Mail className="w-8 h-8 text-foreground" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">
            Ready to send to {selectedCount} client{selectedCount !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            They will receive your message via email
          </p>
        </div>
        <div className="p-3 bg-accent/20 rounded-lg text-sm text-foreground text-left">
          {data.message || "No message set"}
        </div>
      </div>
    );
  }

  return null;
};

const ScheduleStep = ({ stepId, data, onUpdate }: StepProps) => {
  if (stepId === "booking") {
    const mockBookings = [
      { id: "1", name: "Sarah Johnson", description: "Neo-traditional sleeve" },
      { id: "2", name: "Mike Chen", description: "Japanese koi fish" },
      { id: "3", name: "Emily Rodriguez", description: "Minimalist geometric" }
    ];

    return (
      <div className="space-y-3">
        {mockBookings.map(booking => (
          <button
            key={booking.id}
            onClick={() => onUpdate("selectedBooking", booking)}
            className={`w-full p-3 text-left border rounded-lg transition-colors ${
              data.selectedBooking?.id === booking.id
                ? "border-foreground bg-foreground/5"
                : "border-border hover:bg-accent/50"
            }`}
          >
            <p className="text-sm font-medium text-foreground">{booking.name}</p>
            <p className="text-xs text-muted-foreground">{booking.description}</p>
          </button>
        ))}
      </div>
    );
  }

  if (stepId === "suggestions") {
    const suggestions = [
      { time: "Monday, Jan 15 at 10:00 AM", score: 95, reason: "Optimal for long session" },
      { time: "Tuesday, Jan 16 at 2:00 PM", score: 88, reason: "Good natural light" },
      { time: "Thursday, Jan 18 at 11:00 AM", score: 82, reason: "Available slot" }
    ];

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Sparkles className="w-4 h-4" />
          AI-recommended based on your schedule and preferences
        </div>
        {suggestions.map((sug, idx) => (
          <button
            key={idx}
            onClick={() => onUpdate("selectedTime", sug)}
            className={`w-full p-4 text-left border rounded-lg transition-colors ${
              data.selectedTime?.time === sug.time
                ? "border-foreground bg-foreground/5"
                : "border-border hover:bg-accent/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-foreground">{sug.time}</p>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded-full">
                {sug.score}% match
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{sug.reason}</p>
          </button>
        ))}
      </div>
    );
  }

  if (stepId === "confirm") {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
          <Calendar className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">
            Schedule appointment?
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.selectedBooking?.name} - {data.selectedTime?.time}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Client will receive a confirmation email with calendar invite
        </p>
      </div>
    );
  }

  return null;
};

const SendMessageStep = ({ stepId, data, onUpdate }: StepProps) => {
  if (stepId === "recipient") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Search client</Label>
          <Input
            placeholder="Type name or email..."
            value={data.searchQuery || ""}
            onChange={(e) => onUpdate("searchQuery", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Recent contacts</Label>
          {["Sarah Johnson", "Mike Chen", "Emily Rodriguez"].map(name => (
            <button
              key={name}
              onClick={() => onUpdate("recipient", name)}
              className={`w-full p-3 flex items-center gap-3 border rounded-lg transition-colors ${
                data.recipient === name
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:bg-accent/50"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm text-foreground">{name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (stepId === "compose") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            placeholder="Message subject..."
            value={data.subject || ""}
            onChange={(e) => onUpdate("subject", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            placeholder="Write your message..."
            value={data.messageBody || ""}
            onChange={(e) => onUpdate("messageBody", e.target.value)}
            rows={5}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Zap className="w-3 h-3" />
            AI Suggest
          </Button>
        </div>
      </div>
    );
  }

  if (stepId === "send") {
    return (
      <div className="space-y-4">
        <div className="p-4 border border-border rounded-lg space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">To</span>
            <span className="text-foreground font-medium">{data.recipient || "Not set"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subject</span>
            <span className="text-foreground">{data.subject || "Not set"}</span>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground mb-1">Message</p>
            <p className="text-sm text-foreground">{data.messageBody || "No message"}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SmartActionWizard;
