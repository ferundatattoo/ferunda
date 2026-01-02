import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Check, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Palette, 
  Ruler, 
  MapPin,
  Sparkles,
  Copy,
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  Bell,
  Clock,
  AlertCircle
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDate?: string;
  prefilledCity?: string;
}

// Validation schemas for each step
const step1Schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required").max(255),
  phone: z.string().max(20).optional(),
});

const step2Schema = z.object({
  tattoo_description: z.string().min(10, "Please describe your idea (min 10 characters)").max(2000),
});

const step3Schema = z.object({
  placement: z.string().max(100).optional(),
  size: z.string().optional(),
});

type FormData = {
  name: string;
  email: string;
  phone: string;
  tattoo_description: string;
  placement: string;
  size: string;
  preferred_date: string;
  reference_images: string[];
  subscribe_newsletter: boolean;
  // Honeypot fields - should never be filled by real users
  _hp_website: string;
  _hp_company: string;
};

const STEPS = [
  { id: 1, title: "Your Info", icon: User },
  { id: 2, title: "Verify", icon: ShieldCheck },
  { id: 3, title: "Your Vision", icon: Palette },
  { id: 4, title: "Details", icon: Ruler },
  { id: 5, title: "Confirm", icon: Check },
];

const SIZE_OPTIONS = [
  { value: "tiny", label: "Tiny", desc: "1-2 inches", icon: "●" },
  { value: "small", label: "Small", desc: "2-4 inches", icon: "●●" },
  { value: "medium", label: "Medium", desc: "4-6 inches", icon: "●●●" },
  { value: "large", label: "Large", desc: "6+ inches", icon: "●●●●" },
];

const PLACEMENT_OPTIONS = [
  "Inner Forearm", "Outer Forearm", "Upper Arm", "Shoulder",
  "Back", "Chest", "Ribs", "Thigh", "Calf", "Ankle", "Wrist", "Other"
];

// Get UTM params from URL
const getUTMParams = () => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
  };
};

const BookingWizard = ({ isOpen, onClose, prefilledDate, prefilledCity }: BookingWizardProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fingerprint } = useDeviceFingerprint();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [showWaitlistOption, setShowWaitlistOption] = useState(false);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  
  // Email verification state
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Track page load time for anti-bot detection
  useEffect(() => {
    if (isOpen) {
      sessionStorage.setItem('page_load_time', Date.now().toString());
    }
  }, [isOpen]);

  // Store fingerprint for security tracking
  useEffect(() => {
    if (fingerprint) {
      sessionStorage.setItem('device_fingerprint', fingerprint);
    }
  }, [fingerprint]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    tattoo_description: "",
    placement: "",
    size: "",
    preferred_date: prefilledDate || "",
    reference_images: [],
    subscribe_newsletter: true,
    // Honeypot fields initialized empty
    _hp_website: "",
    _hp_company: "",
  });

  const validateStep = (step: number): boolean => {
    setErrors({});
    try {
      if (step === 1) {
        step1Schema.parse(formData);
      } else if (step === 3) {
        step2Schema.parse(formData);
      } else if (step === 4) {
        step3Schema.parse(formData);
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          if (field && !fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const sendVerificationOtp = async () => {
    if (!validateStep(1)) return;
    
    setIsSendingOtp(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-otp`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-fingerprint-hash": sessionStorage.getItem('device_fingerprint') || '',
          },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            name: formData.name.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send verification code");
      }

      setOtpSentAt(Date.now());
      setResendCooldown(60);
      setCurrentStep(2);
      
      toast({
        title: "Verification code sent",
        description: "Check your email for the 6-digit code.",
      });
    } catch (error) {
      toast({
        title: "Failed to send code",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (otpValue.length !== 6) {
      setErrors({ otp: "Please enter the complete 6-digit code" });
      return;
    }
    
    setIsVerifying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-fingerprint-hash": sessionStorage.getItem('device_fingerprint') || '',
          },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            otp: otpValue,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Invalid verification code");
      }

      setIsEmailVerified(true);
      setVerificationToken(result.verificationToken);
      setCurrentStep(3);
      
      toast({
        title: "Email verified!",
        description: "Your email has been verified successfully.",
      });
    } catch (error) {
      setErrors({ otp: error instanceof Error ? error.message : "Verification failed" });
    } finally {
      setIsVerifying(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      // Step 1 -> Send OTP and go to verification
      sendVerificationOtp();
    } else if (currentStep === 2) {
      // Skip if already verified
      if (isEmailVerified) {
        setCurrentStep(3);
      }
    } else if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    if (currentStep === 2) {
      // Going back from verification resets OTP state
      setOtpValue("");
      setIsEmailVerified(false);
      setVerificationToken(null);
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formData.reference_images.length + files.length > 5) {
      toast({
        title: "Too many images",
        description: "Maximum 5 reference images allowed.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 5MB limit.`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `bookings/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("reference-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("reference-images")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setFormData((prev) => ({
        ...prev,
        reference_images: [...prev.reference_images, ...uploadedUrls],
      }));

      toast({
        title: "Images uploaded",
        description: `${uploadedUrls.length} image(s) added successfully.`,
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      reference_images: prev.reference_images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const utmParams = getUTMParams();
      
      // Use centralized create-booking edge function for security
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-fingerprint-hash": sessionStorage.getItem('device_fingerprint') || '',
            "x-load-time": sessionStorage.getItem('page_load_time') || '0',
            "x-verification-token": verificationToken || '',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone || null,
            preferred_date: formData.preferred_date || null,
            placement: formData.placement || null,
            size: formData.size || null,
            tattoo_description: formData.tattoo_description.trim(),
            reference_images: formData.reference_images.length > 0 ? formData.reference_images : [],
            requested_city: prefilledCity || null,
            subscribe_newsletter: formData.subscribe_newsletter,
            utm_params: utmParams,
            // Honeypot fields
            _hp_url: formData._hp_website,
            company: formData._hp_company,
            website: formData._hp_website,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Too many requests",
            description: result.error || "Please wait before submitting another booking.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(result.error || "Failed to submit booking");
      }

      setTrackingCode(result.tracking_code);
      setCurrentStep(6); // Success step
      
    } catch {
      toast({
        title: "Submission failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!isEmailVerified) {
      toast({
        title: "Email not verified",
        description: "Please verify your email first.",
        variant: "destructive",
      });
      return;
    }

    setIsJoiningWaitlist(true);
    try {
      // Calculate match score based on preferences
      let matchScore = 50; // Base score
      
      // +20 for having a preferred city
      if (prefilledCity) matchScore += 20;
      
      // +15 for size preference (helps with scheduling)
      if (formData.size) matchScore += 15;
      
      // +10 for description (shows commitment)
      if (formData.tattoo_description && formData.tattoo_description.length > 30) matchScore += 10;
      
      // +5 for phone number (easier to reach)
      if (formData.phone) matchScore += 5;

      // Cap at 100
      matchScore = Math.min(matchScore, 100);

      const { error } = await supabase.from("booking_waitlist").insert({
        client_email: formData.email.trim().toLowerCase(),
        client_name: formData.name.trim(),
        client_phone: formData.phone || null,
        preferred_cities: prefilledCity ? [prefilledCity] : null,
        tattoo_description: formData.tattoo_description.trim() || null,
        size_preference: formData.size || null,
        style_preference: formData.placement || null, // Use placement as style hint
        flexibility_days: 7,
        status: "waiting",
        match_score: matchScore,
        discount_eligible: matchScore >= 70, // High match = eligible for discount
      });

      if (error) throw error;

      setWaitlistJoined(true);
      toast({
        title: "Added to Waitlist! 🎉",
        description: `Match score: ${matchScore}%. We'll notify you when a spot opens up.`,
      });
    } catch (error) {
      console.error("Waitlist join error:", error);
      toast({
        title: "Failed to join waitlist",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const copyTrackingCode = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      toast({
        title: "Copied!",
        description: "Tracking code copied to clipboard.",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      tattoo_description: "",
      placement: "",
      size: "",
      preferred_date: prefilledDate || "",
      reference_images: [],
      subscribe_newsletter: true,
      _hp_website: "",
      _hp_company: "",
    });
    setCurrentStep(1);
    setTrackingCode(null);
    setErrors({});
    setOtpValue("");
    setIsEmailVerified(false);
    setVerificationToken(null);
    setOtpSentAt(null);
    setResendCooldown(0);
    setShowWaitlistOption(false);
    setWaitlistJoined(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Honeypot fields component - hidden from real users, visible to bots
  const HoneypotFields = () => (
    <div 
      aria-hidden="true" 
      style={{ 
        position: 'absolute', 
        left: '-9999px', 
        top: '-9999px',
        opacity: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
      tabIndex={-1}
    >
      {/* These fields are hidden from users but bots will fill them */}
      <label htmlFor="_hp_website">Website (leave blank)</label>
      <input
        type="text"
        id="_hp_website"
        name="website"
        value={formData._hp_website}
        onChange={(e) => setFormData({ ...formData, _hp_website: e.target.value })}
        autoComplete="off"
        tabIndex={-1}
      />
      <label htmlFor="_hp_company">Company (leave blank)</label>
      <input
        type="text"
        id="_hp_company"
        name="company"
        value={formData._hp_company}
        onChange={(e) => setFormData({ ...formData, _hp_company: e.target.value })}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/98 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative min-h-screen flex items-start md:items-center justify-center p-6 py-16">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute -top-10 right-0 md:top-0 md:-right-12 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Progress Steps */}
              {currentStep <= 5 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-px bg-border" />
                    <div 
                      className="absolute top-5 left-0 h-px bg-foreground transition-all duration-500"
                      style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                    />
                    
                    {STEPS.map((step) => {
                      const StepIcon = step.icon;
                      const isActive = currentStep === step.id;
                      const isComplete = currentStep > step.id;
                      
                      return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center">
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                              isComplete 
                                ? "bg-foreground text-background" 
                                : isActive 
                                  ? "bg-foreground text-background ring-4 ring-foreground/20" 
                                  : "bg-background border border-border text-muted-foreground"
                            }`}
                          >
                            {isComplete ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                          <span className={`mt-2 font-body text-xs tracking-wider uppercase hidden md:block ${
                            isActive ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {step.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Honeypot fields for bot detection */}
              <HoneypotFields />

              {/* Step Content */}
              <AnimatePresence mode="wait">
                {/* Step 1: Personal Info */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
                        Let's start with you
                      </h2>
                      <p className="font-body text-muted-foreground mt-2">
                        Tell me a bit about yourself so I can get in touch.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <User className="w-3 h-3" /> Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors ${
                            errors.name ? "border-destructive" : "border-border focus:border-foreground"
                          }`}
                          placeholder="Your full name"
                        />
                        {errors.name && (
                          <p className="text-destructive text-xs mt-1 font-body">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <Mail className="w-3 h-3" /> Email *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors ${
                            errors.email ? "border-destructive" : "border-border focus:border-foreground"
                          }`}
                          placeholder="your@email.com"
                        />
                        {errors.email && (
                          <p className="text-destructive text-xs mt-1 font-body">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <Phone className="w-3 h-3" /> Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors"
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Email Verification */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-6 bg-foreground/10 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-foreground" />
                      </div>
                      <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
                        Verify your email
                      </h2>
                      <p className="font-body text-muted-foreground mt-2">
                        We sent a 6-digit code to <span className="text-foreground">{formData.email}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-center space-y-6">
                      <InputOTP
                        value={otpValue}
                        onChange={setOtpValue}
                        maxLength={6}
                        disabled={isVerifying}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-12 h-14 text-xl border-border" />
                          <InputOTPSlot index={1} className="w-12 h-14 text-xl border-border" />
                          <InputOTPSlot index={2} className="w-12 h-14 text-xl border-border" />
                          <InputOTPSlot index={3} className="w-12 h-14 text-xl border-border" />
                          <InputOTPSlot index={4} className="w-12 h-14 text-xl border-border" />
                          <InputOTPSlot index={5} className="w-12 h-14 text-xl border-border" />
                        </InputOTPGroup>
                      </InputOTP>

                      {errors.otp && (
                        <p className="text-destructive text-sm font-body">{errors.otp}</p>
                      )}

                      <button
                        onClick={verifyOtp}
                        disabled={otpValue.length !== 6 || isVerifying}
                        className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify Code
                            <Check className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <div className="text-center">
                        <p className="font-body text-sm text-muted-foreground">
                          Didn't receive the code?{" "}
                          {resendCooldown > 0 ? (
                            <span className="text-foreground">Resend in {resendCooldown}s</span>
                          ) : (
                            <button
                              onClick={sendVerificationOtp}
                              disabled={isSendingOtp}
                              className="text-foreground underline hover:no-underline"
                            >
                              {isSendingOtp ? "Sending..." : "Resend code"}
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Tattoo Vision */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
                        Tell me your vision
                      </h2>
                      <p className="font-body text-muted-foreground mt-2">
                        Describe your tattoo idea - the more detail, the better!
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block">
                          Describe your tattoo idea *
                        </label>
                        <textarea
                          value={formData.tattoo_description}
                          onChange={(e) => setFormData({ ...formData, tattoo_description: e.target.value })}
                          rows={5}
                          maxLength={2000}
                          className={`w-full bg-transparent border-b py-3 font-body text-foreground focus:outline-none transition-colors resize-none ${
                            errors.tattoo_description ? "border-destructive" : "border-border focus:border-foreground"
                          }`}
                          placeholder="Share the story, meaning, style, any specific elements you want..."
                        />
                        {errors.tattoo_description && (
                          <p className="text-destructive text-xs mt-1 font-body">{errors.tattoo_description}</p>
                        )}
                        <p className="text-muted-foreground text-xs mt-1 font-body text-right">
                          {formData.tattoo_description.length}/2000
                        </p>
                      </div>

                      {/* Reference Images */}
                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <ImageIcon className="w-3 h-3" /> Reference Images (Optional)
                        </label>
                        <p className="font-body text-xs text-muted-foreground mb-3">
                          Upload up to 5 images for inspiration (max 5MB each)
                        </p>

                        {/* Uploaded Images Grid */}
                        {formData.reference_images.length > 0 && (
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-3">
                            {formData.reference_images.map((url, index) => (
                              <div key={index} className="relative group aspect-square">
                                <img
                                  src={url}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-full object-cover border border-border"
                                />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute top-1 right-1 p-1 bg-background/80 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {formData.reference_images.length < 5 && (
                          <label className="flex items-center justify-center gap-2 p-6 border border-dashed border-border hover:border-foreground/50 cursor-pointer transition-colors">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={isUploading}
                            />
                            {isUploading ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                <span className="font-body text-sm text-muted-foreground">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-muted-foreground" />
                                <span className="font-body text-sm text-muted-foreground">
                                  Click to upload or drag images here
                                </span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Details */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
                        The details
                      </h2>
                      <p className="font-body text-muted-foreground mt-2">
                        Help me understand the specifics of your piece.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Size Selection */}
                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 block">
                          Approximate Size
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {SIZE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, size: option.value })}
                              className={`p-4 border transition-all ${
                                formData.size === option.value
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border hover:border-foreground/50"
                              }`}
                            >
                              <span className="block text-lg mb-1">{option.icon}</span>
                              <span className="font-body text-sm text-foreground block">{option.label}</span>
                              <span className="font-body text-xs text-muted-foreground">{option.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Placement Selection */}
                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 block">
                          Body Placement
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {PLACEMENT_OPTIONS.map((placement) => (
                            <button
                              key={placement}
                              type="button"
                              onClick={() => setFormData({ ...formData, placement })}
                              className={`px-4 py-2 border font-body text-sm transition-all ${
                                formData.placement === placement
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground"
                              }`}
                            >
                              {placement}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preferred Date */}
                      <div>
                        <label className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Preferred Date
                        </label>
                        <input
                          type="date"
                          value={formData.preferred_date}
                          onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-transparent border-b border-border py-3 font-body text-foreground focus:outline-none focus:border-foreground transition-colors"
                        />
                        {prefilledCity && (
                          <p className="font-body text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {prefilledCity}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="font-display text-3xl md:text-4xl font-light text-foreground">
                        Review & Submit
                      </h2>
                      <p className="font-body text-muted-foreground mt-2">
                        Make sure everything looks good before submitting.
                      </p>
                    </div>

                    <div className="space-y-4 p-6 border border-border bg-card/50">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Name</span>
                          <p className="font-body text-foreground">{formData.name}</p>
                        </div>
                        <div>
                          <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Email</span>
                          <p className="font-body text-foreground flex items-center gap-2">
                            {formData.email}
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                          </p>
                        </div>
                        {formData.phone && (
                          <div>
                            <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Phone</span>
                            <p className="font-body text-foreground">{formData.phone}</p>
                          </div>
                        )}
                        {formData.preferred_date && (
                          <div>
                            <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Preferred Date</span>
                            <p className="font-body text-foreground">{format(new Date(formData.preferred_date), "MMMM d, yyyy")}</p>
                          </div>
                        )}
                        {formData.size && (
                          <div>
                            <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Size</span>
                            <p className="font-body text-foreground capitalize">{formData.size}</p>
                          </div>
                        )}
                        {formData.placement && (
                          <div>
                            <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Placement</span>
                            <p className="font-body text-foreground">{formData.placement}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-4 border-t border-border">
                        <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Tattoo Description</span>
                        <p className="font-body text-foreground mt-1 whitespace-pre-wrap">{formData.tattoo_description}</p>
                      </div>

                      {formData.reference_images.length > 0 && (
                        <div className="pt-4 border-t border-border">
                          <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">Reference Images</span>
                          <div className="grid grid-cols-5 gap-2 mt-2">
                            {formData.reference_images.map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Reference ${index + 1}`}
                                className="w-full aspect-square object-cover border border-border"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Waitlist Option */}
                    <div className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-body text-sm text-foreground font-medium">
                            Can't find a date that works?
                          </p>
                          <p className="font-body text-xs text-muted-foreground mt-1">
                            Join our waitlist and be first to know when new spots open up. We'll reach out when there's a cancellation or new availability.
                          </p>
                          {!waitlistJoined ? (
                            <button
                              type="button"
                              onClick={handleJoinWaitlist}
                              disabled={isJoiningWaitlist}
                              className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-body text-amber-400 border border-amber-500/50 hover:bg-amber-500/10 transition-colors"
                            >
                              {isJoiningWaitlist ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Joining...
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  Join Waitlist
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                              <Check className="w-4 h-4" />
                              You're on the waitlist!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Newsletter Subscription */}
                    <label className="flex items-start gap-3 p-4 border border-border hover:border-foreground/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.subscribe_newsletter}
                        onChange={(e) => setFormData({ ...formData, subscribe_newsletter: e.target.checked })}
                        className="mt-1 w-4 h-4 rounded border-border text-foreground focus:ring-foreground"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-muted-foreground" />
                          <span className="font-body text-sm text-foreground">Keep me updated</span>
                        </div>
                        <p className="font-body text-xs text-muted-foreground mt-1">
                          Receive exclusive flash sales, availability alerts, and news about upcoming guest spots.
                        </p>
                      </div>
                    </label>
                  </motion.div>
                )}

                {/* Step 6: Success */}
                {currentStep === 6 && (
                  <motion.div
                    key="step6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-20 h-20 mx-auto mb-6 bg-foreground rounded-full flex items-center justify-center"
                    >
                      <Sparkles className="w-10 h-10 text-background" />
                    </motion.div>
                    
                    <h2 className="font-display text-3xl md:text-4xl font-light text-foreground mb-4">
                      Request Submitted!
                    </h2>
                    <p className="font-body text-muted-foreground mb-6 max-w-md mx-auto">
                      Thank you for your booking request! I'll review your submission and get back to you within 48 hours.
                    </p>

                    {/* Email confirmation notice */}
                    <div className="p-6 border border-border bg-card/50 max-w-sm mx-auto mb-8">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Mail className="w-5 h-5 text-foreground" />
                        <span className="font-body text-sm text-foreground">Check Your Inbox</span>
                      </div>
                      <p className="font-body text-xs text-muted-foreground">
                        A confirmation email has been sent to <span className="text-foreground">{formData.email}</span>. 
                        All communication about your booking will be via email.
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-3 italic">
                        Don't forget to check your spam folder!
                      </p>
                    </div>

                    {/* What happens next */}
                    <div className="max-w-sm mx-auto text-left mb-8 space-y-3">
                      <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">What happens next:</p>
                      <div className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                        <span className="font-body text-sm text-muted-foreground">I'll review your request and reach out via email</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                        <span className="font-body text-sm text-muted-foreground">We'll discuss your vision and schedule a session</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-foreground mt-0.5 flex-shrink-0" />
                        <span className="font-body text-sm text-muted-foreground">You'll receive a secure link to your customer portal</span>
                      </div>
                    </div>

                    <button
                      onClick={handleClose}
                      className="px-8 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              {currentStep <= 5 && currentStep !== 2 && (
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  <button
                    onClick={currentStep === 1 ? handleClose : prevStep}
                    className="flex items-center gap-2 px-6 py-3 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {currentStep === 1 ? "Cancel" : "Back"}
                  </button>

                  {currentStep < 5 ? (
                    <button
                      onClick={nextStep}
                      disabled={isSendingOtp}
                      className="flex items-center gap-2 px-6 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      {isSendingOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-8 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Request
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Back button only for step 2 */}
              {currentStep === 2 && (
                <div className="flex justify-start mt-8 pt-6 border-t border-border">
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-2 px-6 py-3 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BookingWizard;
