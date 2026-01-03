import { useMemo } from 'react';
import { useWorkspace, canAccess, normalizeRole, WorkspaceRole } from './useWorkspace';

// Re-export for backwards compatibility
export type PortalRole = WorkspaceRole;

export interface PortalPermissions {
  // Portal access
  canAccessStudioPortal: boolean;
  canAccessArtistPortal: boolean;
  canAccessAssistantPortal: boolean;
  canAccessClientPortal: boolean;
  canAccessFinancePortal: boolean;
  canAccessMarketingPortal: boolean;
  canAccessAdminPortal: boolean;
  
  // Features
  canManageBookings: boolean;
  canManageTeam: boolean;
  canManageFinances: boolean;
  canManageCampaigns: boolean;
  canViewAnalytics: boolean;
  canConfigureAgent: boolean;
  canManageClients: boolean;
  canManageSocialInbox: boolean;
  canApprovePayouts: boolean;
  canEditPricing: boolean;
}

// Simplified to 3 roles (client is separate entity, not workspace member)
const ROLE_PERMISSIONS: Record<WorkspaceRole, PortalPermissions> = {
  studio: {
    // Full access - studio owners/admins/managers
    canAccessStudioPortal: true,
    canAccessArtistPortal: true,
    canAccessAssistantPortal: true,
    canAccessClientPortal: false,
    canAccessFinancePortal: true,
    canAccessMarketingPortal: true,
    canAccessAdminPortal: true,
    canManageBookings: true,
    canManageTeam: true,
    canManageFinances: true,
    canManageCampaigns: true,
    canViewAnalytics: true,
    canConfigureAgent: true,
    canManageClients: true,
    canManageSocialInbox: true,
    canApprovePayouts: true,
    canEditPricing: true,
  },
  artist: {
    // Artist access - their own bookings, finances, marketing
    canAccessStudioPortal: false,
    canAccessArtistPortal: true,
    canAccessAssistantPortal: false,
    canAccessClientPortal: false,
    canAccessFinancePortal: true, // Can see their own finances
    canAccessMarketingPortal: true,
    canAccessAdminPortal: false,
    canManageBookings: true, // Their own bookings
    canManageTeam: false,
    canManageFinances: false, // Can't approve general payouts
    canManageCampaigns: true,
    canViewAnalytics: true, // Their own analytics
    canConfigureAgent: false,
    canManageClients: false,
    canManageSocialInbox: true,
    canApprovePayouts: false,
    canEditPricing: false,
  },
  assistant: {
    // Assistant access - day-to-day operations
    canAccessStudioPortal: false,
    canAccessArtistPortal: false,
    canAccessAssistantPortal: true,
    canAccessClientPortal: false,
    canAccessFinancePortal: false,
    canAccessMarketingPortal: false,
    canAccessAdminPortal: false,
    canManageBookings: true,
    canManageTeam: false,
    canManageFinances: false,
    canManageCampaigns: false,
    canViewAnalytics: false,
    canConfigureAgent: false,
    canManageClients: true,
    canManageSocialInbox: true,
    canApprovePayouts: false,
    canEditPricing: false,
  },
};

export function useRBAC(userId: string | null) {
  const workspace = useWorkspace(userId);
  
  const permissions = useMemo(() => {
    // Normalize the role (handles legacy roles like owner/admin/manager)
    const normalizedRole = normalizeRole(workspace.role);
    return ROLE_PERMISSIONS[normalizedRole];
  }, [workspace.role]);
  
  const checkAccess = (feature: keyof PortalPermissions): boolean => {
    return permissions[feature] || false;
  };
  
  const getHomeRoute = (): string => {
    const role = workspace.role;
    
    switch (role) {
      case 'studio':
        return '/studio';
      case 'artist':
        return '/artist';
      case 'assistant':
        return '/assistant';
      default:
        return '/';
    }
  };
  
  const roleStr: string = workspace.role || '';
  
  return {
    ...workspace,
    permissions,
    checkAccess,
    getHomeRoute,
    isStudio: roleStr === 'studio',
    isArtist: roleStr === 'artist',
    isAssistant: roleStr === 'assistant',
    // Legacy compatibility
    isClient: false, // Clients are separate entities, not workspace members
  };
}

export { canAccess, normalizeRole };
