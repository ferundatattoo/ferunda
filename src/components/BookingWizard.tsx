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
  Trash2
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";

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
  // Honeypot fields - should never be filled by real users
  _hp_website: string;
  _hp_company: string;
};

const STEPS = [
  { id: 1, title: "Your Info", icon: User },
  { id: 2, title: "Your Vision", icon: Palette },
  { id: 3, title: "Details", icon: Ruler },
  { id: 4, title: "Confirm", icon: Check },
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

const BookingWizard = ({ isOpen, onClose, prefilledDate, prefilledCity }: BookingWizardProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fingerprint } = useDeviceFingerprint();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  
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
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    tattoo_description: "",
    placement: "",
    size: "",
    preferred_date: prefilledDate || "",
    reference_images: [],
    // Honeypot fields initialized empty
    _hp_website: "",
    _hp_company: "",
  });

  const validateStep = (step: number): boolean => {
    setErrors({});
    try {
      if (step === 1) {
        step1Schema.parse(formData);
      } else if (step === 2) {
        step2Schema.parse(formData);
      } else if (step === 3) {
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

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
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
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
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
      // Use centralized create-booking edge function for security
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-fingerprint-hash": sessionStorage.getItem('device_fingerprint') || '',
            "x-load-time": sessionStorage.getItem('page_load_time') || '0'
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
      setCurrentStep(5); // Success step
      
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
      _hp_website: "",
      _hp_company: "",
    });
    setCurrentStep(1);
    setTrackingCode(null);
    setErrors({});
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
              {currentStep <= 4 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between relative">
                    {/* Progress Line */}
                    <div className="absolute top-5 left-0 right-0 h-px bg-border" />
                    <div 
                      className="absolute top-5 left-0 h-px bg-foreground transition-all duration-500"
                      style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
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
                          <span className={`mt-2 font-body text-xs tracking-wider uppercase ${
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

                {/* Step 2: Tattoo Vision */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
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

                {/* Step 3: Details */}
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

                {/* Step 4: Review */}
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
                          <p className="font-body text-foreground">{formData.email}</p>
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
                  </motion.div>
                )}

                {/* Step 5: Success */}
                {currentStep === 5 && (
                  <motion.div
                    key="step5"
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
                    <p className="font-body text-muted-foreground mb-8 max-w-md mx-auto">
                      Thank you for your booking request. I'll review your submission and get back to you within 48 hours.
                    </p>

                    {/* Tracking Code */}
                    <div className="p-6 border border-border bg-card/50 max-w-sm mx-auto mb-8">
                      <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Your Tracking Code
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-display text-2xl text-foreground tracking-widest">
                          {trackingCode}
                        </span>
                        <button
                          onClick={copyTrackingCode}
                          className="p-2 hover:bg-accent transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <p className="font-body text-xs text-muted-foreground mt-2">
                        Save this code to check your booking status anytime
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <a
                        href={`/booking-status?code=${trackingCode}`}
                        className="px-6 py-3 border border-border text-foreground font-body text-sm tracking-[0.1em] uppercase hover:bg-accent transition-colors"
                      >
                        Track Status
                      </a>
                      <button
                        onClick={handleClose}
                        className="px-8 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              {currentStep <= 4 && (
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  <button
                    onClick={currentStep === 1 ? handleClose : prevStep}
                    className="flex items-center gap-2 px-6 py-3 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {currentStep === 1 ? "Cancel" : "Back"}
                  </button>

                  {currentStep < 4 ? (
                    <button
                      onClick={nextStep}
                      className="flex items-center gap-2 px-6 py-3 bg-foreground text-background font-body text-sm tracking-[0.2em] uppercase hover:bg-foreground/90 transition-colors"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
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
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BookingWizard;