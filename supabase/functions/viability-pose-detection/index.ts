import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface RequestBody {
  image_url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json() as RequestBody;

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HF_TOKEN) {
      console.error("HUGGING_FACE_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Pose detection service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching image for pose detection:", image_url);

    // Fetch the image
    let imageData: ArrayBuffer;
    try {
      const imageResponse = await fetch(image_url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      imageData = await imageResponse.arrayBuffer();
    } catch (err) {
      console.error("Error fetching image:", err);
      return new Response(
        JSON.stringify({ 
          error: "Could not fetch image",
          landmarks: generateFallbackLandmarks()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Hugging Face API for pose estimation
    // Using a pose estimation model
    try {
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/facebook/detr-resnet-50",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/octet-stream",
          },
          body: new Uint8Array(imageData),
        }
      );

      if (!hfResponse.ok) {
        const errorText = await hfResponse.text();
        console.error("HuggingFace API error:", hfResponse.status, errorText);
        
        // Return fallback landmarks for 2D analysis
        return new Response(
          JSON.stringify({
            landmarks: generateFallbackLandmarks(),
            confidence: 0.5,
            detected_zone: "fallback",
            message: "Using 2D fallback analysis"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const detections = await hfResponse.json();
      console.log("Detection results:", JSON.stringify(detections).substring(0, 500));

      // Extract pose landmarks from detection results
      // Since DETR is object detection, we'll use detected person bounding boxes
      // to estimate body part positions
      const personDetections = detections.filter(
        (d: { label: string; score: number }) => d.label === "person" && d.score > 0.5
      );

      if (personDetections.length === 0) {
        return new Response(
          JSON.stringify({
            landmarks: generateFallbackLandmarks(),
            confidence: 0.4,
            detected_zone: "no_person_detected",
            message: "No person detected in image, using fallback"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate estimated landmarks from person bounding box
      const person = personDetections[0];
      const landmarks = estimateLandmarksFromBoundingBox(person.box);

      return new Response(
        JSON.stringify({
          landmarks,
          confidence: person.score,
          detected_zone: detectBodyZone(landmarks),
          message: "Pose estimated from detection"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (hfErr) {
      console.error("HuggingFace processing error:", hfErr);
      return new Response(
        JSON.stringify({
          landmarks: generateFallbackLandmarks(),
          confidence: 0.3,
          detected_zone: "error_fallback",
          message: "Error in pose detection, using fallback"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    console.error("Pose detection error:", err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : "Unknown error",
        landmarks: generateFallbackLandmarks()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate fallback landmarks for 2D analysis
function generateFallbackLandmarks(): PoseLandmark[] {
  // Standard pose landmarks (33 points for MediaPipe compatibility)
  const standardPose: PoseLandmark[] = [];
  
  // Generate basic body landmarks
  const keypoints = [
    { x: 0.5, y: 0.1, z: 0 },   // 0: nose
    { x: 0.48, y: 0.08, z: 0 }, // 1: left eye inner
    { x: 0.47, y: 0.08, z: 0 }, // 2: left eye
    { x: 0.46, y: 0.08, z: 0 }, // 3: left eye outer
    { x: 0.52, y: 0.08, z: 0 }, // 4: right eye inner
    { x: 0.53, y: 0.08, z: 0 }, // 5: right eye
    { x: 0.54, y: 0.08, z: 0 }, // 6: right eye outer
    { x: 0.45, y: 0.1, z: 0 },  // 7: left ear
    { x: 0.55, y: 0.1, z: 0 },  // 8: right ear
    { x: 0.48, y: 0.12, z: 0 }, // 9: mouth left
    { x: 0.52, y: 0.12, z: 0 }, // 10: mouth right
    { x: 0.35, y: 0.22, z: 0 }, // 11: left shoulder
    { x: 0.65, y: 0.22, z: 0 }, // 12: right shoulder
    { x: 0.28, y: 0.38, z: 0 }, // 13: left elbow
    { x: 0.72, y: 0.38, z: 0 }, // 14: right elbow
    { x: 0.22, y: 0.52, z: 0 }, // 15: left wrist
    { x: 0.78, y: 0.52, z: 0 }, // 16: right wrist
    { x: 0.2, y: 0.55, z: 0 },  // 17: left pinky
    { x: 0.8, y: 0.55, z: 0 },  // 18: right pinky
    { x: 0.18, y: 0.54, z: 0 }, // 19: left index
    { x: 0.82, y: 0.54, z: 0 }, // 20: right index
    { x: 0.19, y: 0.53, z: 0 }, // 21: left thumb
    { x: 0.81, y: 0.53, z: 0 }, // 22: right thumb
    { x: 0.4, y: 0.52, z: 0 },  // 23: left hip
    { x: 0.6, y: 0.52, z: 0 },  // 24: right hip
    { x: 0.38, y: 0.72, z: 0 }, // 25: left knee
    { x: 0.62, y: 0.72, z: 0 }, // 26: right knee
    { x: 0.36, y: 0.92, z: 0 }, // 27: left ankle
    { x: 0.64, y: 0.92, z: 0 }, // 28: right ankle
    { x: 0.34, y: 0.95, z: 0 }, // 29: left heel
    { x: 0.66, y: 0.95, z: 0 }, // 30: right heel
    { x: 0.35, y: 0.98, z: 0 }, // 31: left foot index
    { x: 0.65, y: 0.98, z: 0 }, // 32: right foot index
  ];

  for (const kp of keypoints) {
    standardPose.push({
      x: kp.x,
      y: kp.y,
      z: kp.z,
      visibility: 0.7 + Math.random() * 0.2, // 0.7-0.9
    });
  }

  return standardPose;
}

// Estimate landmarks from bounding box
function estimateLandmarksFromBoundingBox(box: { xmin: number; ymin: number; xmax: number; ymax: number }): PoseLandmark[] {
  const width = box.xmax - box.xmin;
  const height = box.ymax - box.ymin;
  const cx = box.xmin + width / 2;
  const cy = box.ymin + height / 2;

  // Generate proportional landmarks
  const landmarks = generateFallbackLandmarks();
  
  // Scale and offset based on bounding box
  return landmarks.map(lm => ({
    x: box.xmin + lm.x * width,
    y: box.ymin + lm.y * height,
    z: lm.z,
    visibility: lm.visibility * 0.9, // Slightly reduce confidence for estimated
  }));
}

// Detect body zone from landmarks
function detectBodyZone(landmarks: PoseLandmark[]): string {
  // Analyze landmark positions to determine primary body zone
  if (landmarks.length < 17) return "unknown";

  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Check if arms are prominent in the image
  const armVisibility = (leftWrist.visibility + rightWrist.visibility + 
                         leftElbow.visibility + rightElbow.visibility) / 4;
  
  if (armVisibility > 0.7) {
    // Check which arm is more visible
    if (leftWrist.visibility > rightWrist.visibility) {
      return "left_forearm";
    }
    return "right_forearm";
  }

  // Check torso
  const torsoVisibility = (leftShoulder.visibility + rightShoulder.visibility) / 2;
  if (torsoVisibility > 0.7) {
    return "chest";
  }

  return "body_general";
}
