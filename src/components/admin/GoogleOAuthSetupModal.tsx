import React, { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Check,
  Copy,
  Globe,
  Key,
  Shield,
  Users,
  CheckCircle2,
  ArrowRight,
  Clipboard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GoogleOAuthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientIdSaved: (clientId: string) => void;
  redirectUri: string;
}

const STEPS = [
  {
    id: 1,
    title: "Create a Google Cloud Project",
    icon: Globe,
    description: "Set up a new project in Google Cloud Console",
  },
  {
    id: 2,
    title: "Configure OAuth Consent Screen",
    icon: Shield,
    description: "Set up how users will see the authorization request",
  },
  {
    id: 3,
    title: "Create OAuth Credentials",
    icon: Key,
    description: "Generate your Client ID for the application",
  },
  {
    id: 4,
    title: "Add Test Users",
    icon: Users,
    description: "Allow specific users while in testing mode",
  },
  {
    id: 5,
    title: "Enter Client ID",
    icon: CheckCircle2,
    description: "Paste your Client ID to complete setup",
  },
];

export const GoogleOAuthSetupModal = forwardRef<HTMLDivElement, GoogleOAuthSetupModalProps>(
  function GoogleOAuthSetupModal({ isOpen, onClose, onClientIdSaved, redirectUri }, ref) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [clientIdInput, setClientIdInput] = useState("");
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    if (label === "redirect") {
      setCopiedRedirect(true);
      setTimeout(() => setCopiedRedirect(false), 2000);
    }
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleSaveClientId = () => {
    const trimmed = clientIdInput.trim();
    if (!trimmed) {
      toast({
        title: "Client ID Required",
        description: "Please enter your Google OAuth Client ID",
        variant: "destructive",
      });
      return;
    }
    if (!trimmed.includes(".apps.googleusercontent.com")) {
      toast({
        title: "Invalid Format",
        description: "Client ID should end with .apps.googleusercontent.com",
        variant: "destructive",
      });
      return;
    }
    onClientIdSaved(trimmed);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-accent/30 border border-border rounded-lg">
              <p className="font-body text-sm text-foreground mb-3">
                First, you need a Google Cloud project. If you already have one, skip to Step 2.
              </p>
              <ol className="space-y-3 font-body text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <span>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="text-primary underline hover:text-primary/80">Google Cloud Console</a></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <span>Click the project dropdown at the top of the page</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <span>Click <strong className="text-foreground">"New Project"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">4</span>
                  <span>Enter a project name (e.g., "Ferunda Calendar Sync") and click <strong className="text-foreground">"Create"</strong></span>
                </li>
              </ol>
            </div>
            <a
              href="https://console.cloud.google.com/projectcreate"
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary/10 text-primary border border-primary/30 font-body text-sm hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Google Cloud Console
            </a>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-accent/30 border border-border rounded-lg">
              <p className="font-body text-sm text-foreground mb-3">
                Configure the OAuth consent screen to define what users see when authorizing.
              </p>
              <ol className="space-y-3 font-body text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <span>In the left menu, go to <strong className="text-foreground">APIs & Services → OAuth consent screen</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <span>Select <strong className="text-foreground">"External"</strong> user type and click <strong className="text-foreground">"Create"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <span>Fill in the required fields:
                    <ul className="mt-2 ml-4 space-y-1 list-disc">
                      <li>App name: <strong className="text-foreground">"Ferunda Calendar Sync"</strong></li>
                      <li>User support email: <strong className="text-foreground">your email</strong></li>
                      <li>Developer contact email: <strong className="text-foreground">your email</strong></li>
                    </ul>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">4</span>
                  <span>Click <strong className="text-foreground">"Save and Continue"</strong> through the remaining steps (Scopes and Test users can be configured later)</span>
                </li>
              </ol>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials/consent"
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary/10 text-primary border border-primary/30 font-body text-sm hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open OAuth Consent Screen
            </a>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-accent/30 border border-border rounded-lg">
              <p className="font-body text-sm text-foreground mb-3">
                Create OAuth 2.0 credentials to get your Client ID.
              </p>
              <ol className="space-y-3 font-body text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <span>Go to <strong className="text-foreground">APIs & Services → Credentials</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <span>Click <strong className="text-foreground">"+ Create Credentials"</strong> → <strong className="text-foreground">"OAuth client ID"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <span>Application type: <strong className="text-foreground">"Web application"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">4</span>
                  <span>Name: <strong className="text-foreground">"Ferunda Admin"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">5</span>
                  <div className="flex-1">
                    <span>Add this <strong className="text-foreground">Authorized redirect URI</strong>:</span>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-background border border-border text-xs text-foreground font-mono truncate">
                        {redirectUri}
                      </code>
                      <button
                        onClick={() => copyToClipboard(redirectUri, "redirect")}
                        className="flex-shrink-0 p-2 border border-border hover:bg-accent transition-colors"
                        title="Copy redirect URI"
                      >
                        {copiedRedirect ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">6</span>
                  <span>Click <strong className="text-foreground">"Create"</strong> and copy the <strong className="text-foreground">Client ID</strong></span>
                </li>
              </ol>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="font-body text-xs text-amber-400 flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>You only need the <strong>Client ID</strong> (ends with .apps.googleusercontent.com). The Client Secret is not needed for this integration.</span>
              </p>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary/10 text-primary border border-primary/30 font-body text-sm hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Credentials Page
            </a>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-accent/30 border border-border rounded-lg">
              <p className="font-body text-sm text-foreground mb-3">
                While your app is in "Testing" mode, only approved test users can sign in.
              </p>
              <ol className="space-y-3 font-body text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <span>Go to <strong className="text-foreground">OAuth consent screen</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <span>Scroll down to <strong className="text-foreground">"Test users"</strong> section</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <span>Click <strong className="text-foreground">"+ Add Users"</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">4</span>
                  <span>Add your Google email address (e.g., Fernando.moralesunda@gmail.com)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">5</span>
                  <span>Click <strong className="text-foreground">"Save"</strong></span>
                </li>
              </ol>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
              <p className="font-body text-xs text-sky-400 flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">💡</span>
                <span>You can add up to 100 test users. To allow any Google user to connect, you'll need to submit your app for verification.</span>
              </p>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials/consent"
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary/10 text-primary border border-primary/30 font-body text-sm hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open OAuth Consent Screen
            </a>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-accent/30 border border-border rounded-lg">
              <p className="font-body text-sm text-foreground mb-4">
                Paste your Client ID below to complete the setup.
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-body">
                    Google OAuth Client ID
                  </span>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="123456789-abc123xyz.apps.googleusercontent.com"
                    className="mt-2 w-full px-4 py-3 bg-background border border-border text-foreground font-mono text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </label>
              </div>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="font-body text-xs text-emerald-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Your Client ID will be stored locally in this browser. You can clear it anytime from the Google Sync settings.</span>
              </p>
            </div>
            <button
              onClick={handleSaveClientId}
              disabled={!clientIdInput.trim()}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-500 text-white font-body text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Save & Complete Setup
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border border-border shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="font-display text-xl text-foreground">
                Google Calendar Setup
              </h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Step {currentStep} of {STEPS.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicators */}
          <div className="px-6 py-4 border-b border-border bg-accent/20">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {STEPS.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0 transition-colors ${
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-background border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                    <span className="text-xs font-body hidden sm:inline">
                      {step.title}
                    </span>
                    <span className="text-xs font-body sm:hidden">
                      {step.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Step */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const CurrentIcon = STEPS[currentStep - 1].icon;
                return <CurrentIcon className="w-6 h-6 text-primary" />;
              })()}
              <div>
                <h3 className="font-display text-lg text-foreground">
                  {STEPS[currentStep - 1].title}
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  {STEPS[currentStep - 1].description}
                </p>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6 overflow-y-auto max-h-[40vh]">
            {renderStepContent()}
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between p-6 border-t border-border bg-accent/10">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-4 py-2 font-body text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < STEPS.length ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-body text-sm hover:bg-foreground/90 transition-colors"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSaveClientId}
                disabled={!clientIdInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-body text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Complete Setup
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default GoogleOAuthSetupModal;
