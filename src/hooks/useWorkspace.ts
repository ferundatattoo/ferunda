import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkspaceType = "solo" | "studio";
export type WorkspaceRole = "owner" | "admin" | "manager" | "artist" | "assistant";
export type WizardType = "identity" | "solo_setup" | "studio_setup" | "artist_join" | "staff_join";

export interface WorkspaceContext {
  workspaceId: string | null;
  workspaceType: WorkspaceType | null;
  role: WorkspaceRole | null;
  artistId: string | null;
  permissions: Record<string, boolean>;
  needsOnboarding: boolean;
  wizardType: WizardType | null;
  currentStep: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useWorkspace(userId: string | null): WorkspaceContext {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [wizardType, setWizardType] = useState<WizardType | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const retryRef = useRef(0);

  const fetchWorkspaceData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setNeedsOnboarding(false);
      return;
    }

    setLoading(true);
    
    try {
      // IMPORTANT: don't inner-join workspace_settings here.
      const { data: memberships, error: membershipError } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, artist_id, permissions")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (membershipError) {
        console.error("Error fetching workspace memberships:", membershipError);
        if (retryRef.current < 2) {
          retryRef.current += 1;
          window.setTimeout(() => {
            fetchWorkspaceData();
          }, 600 * retryRef.current);
          return;
        }
        // Give up after retries
        setWorkspaceId(null);
        setRole(null);
        setArtistId(null);
        setWorkspaceType(null);
        setPermissions({});
        setNeedsOnboarding(false);
        setWizardType(null);
        setCurrentStep(null);
        setLoading(false);
        return;
      }

      retryRef.current = 0;

      const selectedWorkspaceId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("selectedWorkspaceId")
          : null;

      const selectedMembership =
        memberships?.find((m) => m.workspace_id === selectedWorkspaceId) ??
        memberships?.[0] ??
        null;

      if (selectedWorkspaceId && !selectedMembership) {
        window.localStorage.removeItem("selectedWorkspaceId");
      }

      if (selectedMembership) {
        setWorkspaceId(selectedMembership.workspace_id);
        setRole(selectedMembership.role as WorkspaceRole);
        setPermissions((selectedMembership.permissions as Record<string, boolean>) || {});

        // Fetch workspace type
        const { data: wsSettings } = await supabase
          .from("workspace_settings")
          .select("workspace_type")
          .eq("id", selectedMembership.workspace_id)
          .maybeSingle();

        const wsType = (wsSettings?.workspace_type as WorkspaceType) || null;
        setWorkspaceType(wsType);

        // IMPORTANT: workspace_members.artist_id has FK to studio_artists.id, NOT artist_profiles.id
        let resolvedArtistId = selectedMembership.artist_id;
        
        if (!resolvedArtistId && wsType === "solo") {
          // Check if studio_artist exists for this user in this workspace
          const { data: existingArtist } = await supabase
            .from("studio_artists")
            .select("id")
            .eq("user_id", userId)
            .eq("workspace_id", selectedMembership.workspace_id)
            .maybeSingle();

          if (existingArtist) {
            resolvedArtistId = existingArtist.id;
            // Update workspace_member with the correct artist_id
            await supabase
              .from("workspace_members")
              .update({ artist_id: existingArtist.id })
              .eq("user_id", userId)
              .eq("workspace_id", selectedMembership.workspace_id);
          } else {
            // Create studio_artist for solo workspace (includes required 'name' field)
            const { data: newArtist, error: createError } = await supabase
              .from("studio_artists")
              .insert({
                user_id: userId,
                workspace_id: selectedMembership.workspace_id,
                name: "Artista Principal",
                display_name: "Artista Principal",
                is_active: true
              })
              .select("id")
              .single();

            if (!createError && newArtist) {
              resolvedArtistId = newArtist.id;
              await supabase
                .from("workspace_members")
                .update({ artist_id: newArtist.id })
                .eq("user_id", userId)
                .eq("workspace_id", selectedMembership.workspace_id);
            } else {
              console.error("Failed to create studio_artist:", createError);
            }
          }
        }

        setArtistId(resolvedArtistId ?? null);

        // Check onboarding
        const { data: onboardingData } = await supabase
          .from("onboarding_progress")
          .select("wizard_type, current_step, completed_at")
          .eq("user_id", userId)
          .eq("workspace_id", selectedMembership.workspace_id)
          .maybeSingle();

        if (onboardingData && !onboardingData.completed_at) {
          setNeedsOnboarding(true);
          setWizardType(onboardingData.wizard_type as WizardType);
          setCurrentStep(onboardingData.current_step);
        } else {
          setNeedsOnboarding(false);
          setWizardType(null);
          setCurrentStep(null);
        }
      } else {
        setNeedsOnboarding(true);
        setWizardType("identity");
        setCurrentStep("workspace_type");
        setWorkspaceId(null);
        setRole(null);
        setArtistId(null);
        setWorkspaceType(null);
        setPermissions({});
      }
    } catch (err) {
      console.error("Error in fetchWorkspaceData:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  return {
    workspaceId,
    workspaceType,
    role,
    artistId,
    permissions,
    needsOnboarding,
    wizardType,
    currentStep,
    loading,
    refetch: fetchWorkspaceData,
  };
}

// Helper to check if user can access specific features
export function canAccess(role: WorkspaceRole | null, feature: string): boolean {
  if (!role) return false;

  const accessMatrix: Record<string, WorkspaceRole[]> = {
    // Full access features
    overview: ["owner", "admin", "manager", "artist", "assistant"],
    bookings: ["owner", "admin", "manager", "artist", "assistant"],
    inbox: ["owner", "admin", "manager", "artist", "assistant"],
    
    // Owner/Admin/Manager features
    clients: ["owner", "admin", "manager"],
    waitlist: ["owner", "admin", "manager"],
    availability: ["owner", "admin", "manager", "artist"],
    "calendar-sync": ["owner", "admin", "manager", "artist"],
    cities: ["owner", "admin"],
    templates: ["owner", "admin", "manager"],
    policies: ["owner", "admin"],
    services: ["owner", "admin"],
    workspace: ["owner", "admin"],
    marketing: ["owner", "admin"],
    gallery: ["owner", "admin", "manager"],
    security: ["owner", "admin"],
    "ai-assistant": ["owner", "admin"],
    conversations: ["owner", "admin", "manager"],
    
    // Artist-specific
    "my-schedule": ["artist"],
    "my-inquiries": ["artist"],
    "design-studio": ["owner", "admin", "manager", "artist"],
    healing: ["owner", "admin", "manager", "artist"],
    
    // Team management
    team: ["owner", "admin"],
  };

  return accessMatrix[feature]?.includes(role) || false;
}
