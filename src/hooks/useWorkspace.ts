import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkspaceType = "solo" | "studio";

// Simplified to 3 internal roles (client is separate entity)
export type WorkspaceRole = "studio" | "artist" | "assistant";

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

// Normalize legacy roles to the new 3-role system
export function normalizeRole(dbRole: string | null): WorkspaceRole {
  if (!dbRole) return "studio";
  
  const legacyMap: Record<string, WorkspaceRole> = {
    // Legacy roles → studio
    'owner': 'studio',
    'admin': 'studio',
    'manager': 'studio',
    // Direct mappings
    'studio': 'studio',
    'artist': 'artist',
    'assistant': 'assistant',
  };
  
  return legacyMap[dbRole.toLowerCase()] || 'studio';
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
        
        // Normalize the role from DB
        const normalizedRole = normalizeRole(selectedMembership.role);
        setRole(normalizedRole);
        setPermissions((selectedMembership.permissions as Record<string, boolean>) || {});

        // Fetch workspace type
        const { data: wsSettings } = await supabase
          .from("workspace_settings")
          .select("workspace_type")
          .eq("id", selectedMembership.workspace_id)
          .maybeSingle();

        const wsType = (wsSettings?.workspace_type as WorkspaceType) || null;
        setWorkspaceType(wsType);

        // For solo workspaces, the single user gets studio-level access
        if (wsType === "solo" && normalizedRole !== "studio") {
          setRole("studio");
        }

        // Resolve artist ID
        let resolvedArtistId = selectedMembership.artist_id;
        
        if (!resolvedArtistId && wsType === "solo") {
          const { data: existingArtist } = await supabase
            .from("studio_artists")
            .select("id")
            .eq("user_id", userId)
            .eq("workspace_id", selectedMembership.workspace_id)
            .maybeSingle();

          if (existingArtist) {
            resolvedArtistId = existingArtist.id;
            await supabase
              .from("workspace_members")
              .update({ artist_id: existingArtist.id })
              .eq("user_id", userId)
              .eq("workspace_id", selectedMembership.workspace_id);
          } else {
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
    // Universal access (all roles)
    overview: ["studio", "artist", "assistant"],
    bookings: ["studio", "artist", "assistant"],
    inbox: ["studio", "artist", "assistant"],
    
    // Studio only (full admin)
    clients: ["studio"],
    waitlist: ["studio"],
    team: ["studio"],
    workspace: ["studio"],
    policies: ["studio"],
    services: ["studio"],
    security: ["studio"],
    "ai-assistant": ["studio"],
    cities: ["studio"],
    templates: ["studio"],
    conversations: ["studio"],
    
    // Studio + Artist
    availability: ["studio", "artist"],
    "calendar-sync": ["studio", "artist"],
    "design-studio": ["studio", "artist"],
    healing: ["studio", "artist"],
    marketing: ["studio", "artist"],
    gallery: ["studio", "artist"],
    
    // Artist-specific views
    "my-schedule": ["artist"],
    "my-inquiries": ["artist"],
  };

  return accessMatrix[feature]?.includes(role) || false;
}
