import { useState, useRef } from "react";
import { 
  Upload, 
  Video, 
  Mic2, 
  CheckCircle, 
  AlertTriangle,
  X,
  ChevronRight,
  Camera,
  Square,
  Circle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarTrainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Step = "upload" | "consent" | "processing" | "complete";

const CONSENT_SCRIPT = `I, hereby consent to the creation of an AI avatar using my likeness and voice. I understand that this avatar may be used to generate video messages on my behalf. I confirm that I am the person in this recording and I have the legal authority to grant this consent.`;

const AvatarTrainerModal = ({ open, onOpenChange, onComplete }: AvatarTrainerModalProps) => {
  const [step, setStep] = useState<Step>("upload");
  const [avatarName, setAvatarName] = useState("");
  const [trainingVideo, setTrainingVideo] = useState<File | null>(null);
  const [consentRecording, setConsentRecording] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        toast.error("Video file must be under 500MB");
        return;
      }
      setTrainingVideo(file);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      streamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
    } catch (error) {
      toast.error("Could not access webcam. Please check permissions.");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setConsentRecording(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleNextStep = async () => {
    if (step === "upload" && trainingVideo && avatarName) {
      await startWebcam();
      setStep("consent");
    } else if (step === "consent" && consentRecording) {
      stopWebcam();
      setStep("processing");
      await processAvatar();
    }
  };

  const processAvatar = async () => {
    try {
      // Upload training video
      const trainingPath = `training/${Date.now()}-${trainingVideo!.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-samples')
        .upload(trainingPath, trainingVideo!);

      if (uploadError) throw uploadError;

      setProcessingProgress(30);

      // Upload consent video
      const consentPath = `consent/${Date.now()}-consent.webm`;
      const { error: consentError } = await supabase.storage
        .from('voice-samples')
        .upload(consentPath, consentRecording!);

      if (consentError) throw consentError;

      setProcessingProgress(50);

      // Get public URLs
      const { data: trainingUrl } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(trainingPath);

      const { data: consentUrl } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(consentPath);

      // Create avatar record
      const { error: insertError } = await supabase
        .from('ai_avatar_clones')
        .insert({
          display_name: avatarName,
          training_video_url: trainingUrl.publicUrl,
          consent_video_url: consentUrl.publicUrl,
          status: 'training',
          training_progress: 0
        });

      if (insertError) throw insertError;

      setProcessingProgress(70);

      // Simulate processing (TODO: Connect to HeyGen API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingProgress(100);

      setStep("complete");
    } catch (error) {
      console.error("Error processing avatar:", error);
      toast.error("Failed to create avatar. Please try again.");
      setStep("upload");
    }
  };

  const handleClose = () => {
    stopWebcam();
    setStep("upload");
    setAvatarName("");
    setTrainingVideo(null);
    setConsentRecording(null);
    setProcessingProgress(0);
    onOpenChange(false);
    if (step === "complete") {
      onComplete();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-iron-dark border-border/50">
        <DialogHeader>
          <DialogTitle className="font-gothic text-xl tracking-wide">
            {step === "upload" && "Step 1: Upload Training Video"}
            {step === "consent" && "Step 2: Record Consent"}
            {step === "processing" && "Processing Your Avatar"}
            {step === "complete" && "Avatar Created!"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Avatar Name
                </label>
                <Input
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                  placeholder="e.g., Ferunda - Professional"
                  className="bg-ink-black border-border/50"
                />
              </div>

              <div
                onClick={() => videoInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                  trainingVideo
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-border/50 hover:border-needle-blue/50"
                )}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                
                {trainingVideo ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div className="text-left">
                      <p className="text-foreground font-medium">{trainingVideo.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(trainingVideo.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-1">
                      Upload 2-5 mins of you speaking at the camera
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or click to browse
                    </p>
                  </>
                )}
              </div>

              <div className="bg-ink-black rounded-lg p-4 border border-border/30">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Video className="w-4 h-4 text-needle-blue" />
                  Video Requirements
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Look directly at the camera</li>
                  <li>• Good lighting, plain background</li>
                  <li>• Speak naturally at normal pace</li>
                  <li>• Include varied expressions (smiling, serious, etc.)</li>
                </ul>
              </div>

              <Button
                onClick={handleNextStep}
                disabled={!trainingVideo || !avatarName}
                className="w-full bg-needle-blue hover:bg-needle-blue/90"
              >
                Next: Record Consent
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Consent */}
          {step === "consent" && (
            <div className="space-y-6">
              <div className="bg-gothic-gold/10 border border-gothic-gold/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-gothic-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gothic-gold">Legal Requirement</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    For safety and legal compliance, you must record yourself reading the consent script below.
                  </p>
                </div>
              </div>

              {/* Webcam Preview */}
              <div className="relative rounded-xl overflow-hidden bg-ink-black aspect-video">
                <video
                  ref={webcamRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-sm">
                    <Circle className="w-3 h-3 fill-current animate-pulse" />
                    REC {formatTime(recordingTime)}
                  </div>
                )}
                {consentRecording && !isRecording && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </div>
                )}
              </div>

              {/* Consent Script */}
              <div className="bg-ink-black rounded-lg p-4 border border-border/30">
                <h4 className="font-medium text-foreground mb-2">
                  Please read aloud:
                </h4>
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  "{CONSENT_SCRIPT}"
                </p>
              </div>

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-4">
                {!isRecording && !consentRecording && (
                  <Button
                    onClick={startRecording}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Circle className="w-4 h-4 mr-2 fill-current" />
                    Start Recording
                  </Button>
                )}
                {isRecording && (
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                  >
                    <Square className="w-4 h-4 mr-2 fill-current" />
                    Stop Recording
                  </Button>
                )}
                {consentRecording && !isRecording && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConsentRecording(null);
                        setRecordingTime(0);
                      }}
                    >
                      Re-record
                    </Button>
                    <Button
                      onClick={handleNextStep}
                      className="bg-needle-blue hover:bg-needle-blue/90"
                    >
                      Create Avatar
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-needle-blue/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Camera className="w-10 h-10 text-needle-blue" />
              </div>
              
              <h3 className="font-gothic text-xl text-foreground mb-2">
                Creating Your Avatar
              </h3>
              <p className="text-muted-foreground mb-6">
                This may take a few minutes...
              </p>

              <div className="max-w-xs mx-auto space-y-2">
                <Progress value={processingProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {processingProgress < 30 && "Uploading training video..."}
                  {processingProgress >= 30 && processingProgress < 50 && "Uploading consent video..."}
                  {processingProgress >= 50 && processingProgress < 70 && "Creating avatar profile..."}
                  {processingProgress >= 70 && processingProgress < 100 && "Processing neural model..."}
                  {processingProgress === 100 && "Complete!"}
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              
              <h3 className="font-gothic text-xl text-foreground mb-2">
                Avatar Created Successfully!
              </h3>
              <p className="text-muted-foreground mb-6">
                Your avatar "{avatarName}" is now being trained. This typically takes 15-30 minutes.
              </p>

              <Button
                onClick={handleClose}
                className="bg-needle-blue hover:bg-needle-blue/90"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarTrainerModal;
