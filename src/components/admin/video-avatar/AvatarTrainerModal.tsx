import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Upload, 
  Video, 
  CheckCircle, 
  AlertTriangle,
  ChevronRight,
  Camera,
  Square,
  Circle,
  FileVideo
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CameraRecorder from "./CameraRecorder";

interface AvatarTrainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  workspaceId?: string;
  artistId?: string;
}

type Step = "upload" | "consent" | "processing" | "complete";
type InputMethod = "upload" | "record";

const CONSENT_SCRIPT = `I, hereby consent to the creation of an AI avatar using my likeness and voice. I understand that this avatar may be used to generate video messages on my behalf. I confirm that I am the person in this recording and I have the legal authority to grant this consent.`;

const TRAINING_STAGES = [
  { key: "uploading", label: "Uploading video...", maxProgress: 15, icon: "📤", eta: "~30 sec" },
  { key: "consent", label: "Uploading consent...", maxProgress: 25, icon: "📝", eta: "~10 sec" },
  { key: "profile", label: "Creating profile...", maxProgress: 35, icon: "👤", eta: "~5 sec" },
  { key: "analyzing", label: "Analyzing facial features...", maxProgress: 50, icon: "🔍", eta: "~2 min" },
  { key: "extracting", label: "Extracting voice patterns...", maxProgress: 65, icon: "🎙️", eta: "~2 min" },
  { key: "training", label: "Training neural model...", maxProgress: 85, icon: "🧠", eta: "~5 min" },
  { key: "finalizing", label: "Finalizing avatar...", maxProgress: 95, icon: "✨", eta: "~30 sec" },
  { key: "complete", label: "Avatar ready!", maxProgress: 100, icon: "🎉", eta: "" },
];

const AvatarTrainerModal = ({ 
  open, 
  onOpenChange, 
  onComplete,
  workspaceId,
  artistId 
}: AvatarTrainerModalProps) => {
  const [step, setStep] = useState<Step>("upload");
  const [inputMethod, setInputMethod] = useState<InputMethod>("record");
  const [avatarName, setAvatarName] = useState("");
  const [trainingVideo, setTrainingVideo] = useState<File | Blob | null>(null);
  const [trainingVideoName, setTrainingVideoName] = useState("");
  const [consentRecording, setConsentRecording] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [avatarId, setAvatarId] = useState<string | null>(null);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // File size limit: 100MB (reasonable for 2-5 min video)
      const MAX_SIZE_MB = 100;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`Video must be under ${MAX_SIZE_MB}MB. Try compressing or recording a shorter clip.`);
        return;
      }
      
      // Validate video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const loadPromise = new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          const durationSecs = Math.floor(video.duration);
          if (durationSecs < 120) {
            toast.error(`Video is ${Math.floor(durationSecs / 60)}:${(durationSecs % 60).toString().padStart(2, '0')} - minimum is 2 minutes`);
            reject();
          } else if (durationSecs > 300) {
            toast.error(`Video is ${Math.floor(durationSecs / 60)}:${(durationSecs % 60).toString().padStart(2, '0')} - maximum is 5 minutes`);
            reject();
          } else {
            resolve();
          }
        };
        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          toast.error("Could not read video file. Please try a different format.");
          reject();
        };
      });
      
      video.src = URL.createObjectURL(file);
      
      try {
        await loadPromise;
        setTrainingVideo(file);
        setTrainingVideoName(file.name);
        toast.success("Video validated successfully!");
      } catch {
        // Error already shown via toast
      }
    }
  };

  const handleCameraRecordingComplete = (blob: Blob) => {
    setTrainingVideo(blob);
    setTrainingVideoName("camera-recording.webm");
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

  const updateProcessingStage = (stageKey: string) => {
    const stage = TRAINING_STAGES.find(s => s.key === stageKey);
    if (stage) {
      setProcessingStage(stage.label);
      setProcessingProgress(stage.maxProgress);
    }
  };

  const pollTrainingProgress = useCallback((id: string) => {
    pollingRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from('ai_avatar_clones')
        .select('training_progress, status')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error polling progress:', error);
        return;
      }

      if (data) {
        // Map backend progress to our stages
        const progress = data.training_progress || 0;
        
        if (progress > 0) {
          setProcessingProgress(55 + (progress * 0.45)); // Scale 0-100 to 55-100
        }

        if (data.status === 'ready' || data.status === 'active') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setProcessingProgress(100);
          setProcessingStage("Complete!");
          setStep("complete");
        } else if (data.status === 'failed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          toast.error("Avatar training failed. Please try again.");
          setStep("upload");
        }
      }
    }, 3000);
  }, []);

  const processAvatar = async () => {
    try {
      updateProcessingStage("uploading");

      // Upload training video
      const trainingPath = `training/${Date.now()}-${trainingVideoName || 'video.webm'}`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-samples')
        .upload(trainingPath, trainingVideo!);

      if (uploadError) throw uploadError;

      updateProcessingStage("consent");

      // Upload consent video
      const consentPath = `consent/${Date.now()}-consent.webm`;
      const { error: consentError } = await supabase.storage
        .from('voice-samples')
        .upload(consentPath, consentRecording!);

      if (consentError) throw consentError;

      updateProcessingStage("profile");

      // Get public URLs
      const { data: trainingUrl } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(trainingPath);

      const { data: consentUrl } = supabase.storage
        .from('voice-samples')
        .getPublicUrl(consentPath);

      // Create avatar record
      const { data: avatarData, error: insertError } = await supabase
        .from('ai_avatar_clones')
        .insert({
          display_name: avatarName,
          training_video_url: trainingUrl.publicUrl,
          consent_video_url: consentUrl.publicUrl,
          status: 'training',
          training_progress: 0,
          workspace_id: workspaceId || null,
          artist_id: artistId || null
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      setAvatarId(avatarData.id);
      updateProcessingStage("analyzing");

      // Start polling for real progress
      pollTrainingProgress(avatarData.id);

      // Simulate initial stages while waiting for backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateProcessingStage("training");

    } catch (error) {
      console.error("Error processing avatar:", error);
      toast.error("Failed to create avatar. Please try again.");
      setStep("upload");
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }
  };

  const handleClose = () => {
    stopWebcam();
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    setStep("upload");
    setInputMethod("record");
    setAvatarName("");
    setTrainingVideo(null);
    setTrainingVideoName("");
    setConsentRecording(null);
    setProcessingProgress(0);
    setProcessingStage("");
    setAvatarId(null);
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

  const canProceedFromUpload = trainingVideo && avatarName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-iron-dark border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-gothic text-xl tracking-wide">
            {step === "upload" && "Step 1: Training Video"}
            {step === "consent" && "Step 2: Record Consent"}
            {step === "processing" && "Training Your Avatar"}
            {step === "complete" && "Avatar Created!"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: Upload or Record */}
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

              {/* Method selector */}
              <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as InputMethod)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="record" className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Record Now
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-2">
                    <FileVideo className="w-4 h-4" />
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="record" className="mt-4">
                  <CameraRecorder 
                    onRecordingComplete={handleCameraRecordingComplete}
                    minDuration={120}
                    maxDuration={300}
                  />
                  {trainingVideo && inputMethod === "record" && (
                    <div className="mt-4 flex items-center gap-2 text-green-500">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">Recording saved</span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="upload" className="mt-4">
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                      trainingVideo && inputMethod === "upload"
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
                    
                    {trainingVideo && inputMethod === "upload" ? (
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div className="text-left">
                          <p className="text-foreground font-medium">{trainingVideoName}</p>
                          <p className="text-sm text-muted-foreground">
                            {trainingVideo instanceof File 
                              ? `${(trainingVideo.size / 1024 / 1024).toFixed(2)} MB`
                              : 'Video ready'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-foreground font-medium mb-1">
                          Upload 2-5 minutes of you speaking
                        </p>
                        <p className="text-sm text-muted-foreground">
                          MP4 or WebM format • Max 100MB
                        </p>
                      </>
                    )}
                  </div>

                  <div className="mt-4 bg-ink-black rounded-lg p-4 border border-border/30">
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
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleNextStep}
                disabled={!canProceedFromUpload}
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
                  className="w-full h-full object-cover transform -scale-x-100"
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

          {/* Step 3: Processing with Real Progress */}
          {step === "processing" && (
            <div className="py-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-needle-blue/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl animate-pulse">
                    {TRAINING_STAGES.find(s => s.label === processingStage)?.icon || "🔄"}
                  </span>
                </div>
                
                <h3 className="font-gothic text-xl text-foreground mb-1">
                  Training Your Avatar
                </h3>
                <p className="text-muted-foreground text-sm">
                  {processingStage || "Initializing..."}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto space-y-4 mb-6">
                <Progress value={processingProgress} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(processingProgress)}% complete</span>
                  <span>
                    {TRAINING_STAGES.find(s => s.label === processingStage)?.eta || "Calculating..."}
                  </span>
                </div>
              </div>

              {/* Stage Checklist */}
              <div className="bg-ink-black rounded-lg p-4 border border-border/30 max-w-md mx-auto">
                <div className="space-y-2">
                  {TRAINING_STAGES.slice(0, -1).map((stage) => {
                    const currentStageIndex = TRAINING_STAGES.findIndex(s => s.label === processingStage);
                    const stageIndex = TRAINING_STAGES.indexOf(stage);
                    const isComplete = stageIndex < currentStageIndex;
                    const isCurrent = stageIndex === currentStageIndex;
                    
                    return (
                      <div 
                        key={stage.key}
                        className={cn(
                          "flex items-center gap-3 text-sm py-1 transition-opacity",
                          isComplete && "text-green-500",
                          isCurrent && "text-needle-blue font-medium",
                          !isComplete && !isCurrent && "text-muted-foreground/50"
                        )}
                      >
                        <span className="w-5 text-center">
                          {isComplete ? "✓" : isCurrent ? "→" : "○"}
                        </span>
                        <span>{stage.label.replace("...", "")}</span>
                        {isCurrent && (
                          <span className="ml-auto text-xs animate-pulse">
                            {stage.eta}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {processingProgress >= 35 && processingProgress < 100 && (
                <div className="text-center mt-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    Training takes about 10-15 minutes. You can close this dialog.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="gap-2"
                  >
                    Continue in Background
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && (
            <div className="py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              
              <h3 className="font-gothic text-xl text-foreground mb-2">
                Avatar Ready!
              </h3>
              <p className="text-muted-foreground mb-6">
                Your avatar "{avatarName}" has been created and is ready to use.
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
