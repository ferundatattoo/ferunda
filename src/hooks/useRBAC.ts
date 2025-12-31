import { useMemo } from 'react';
import { useWorkspace, canAccess } from './useWorkspace';

export type PortalRole = 'studio' | 'artist' | 'assistant' | 'client' | 'owner' | 'admin' | 'manager';

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

const ROLE_PERMISSIONS: Record<PortalRole, PortalPermissions> = {
  owner: {
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
  admin: {
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
  manager: {
    canAccessStudioPortal: true,
    canAccessArtistPortal: false,
    canAccessAssistantPortal: true,
    canAccessClientPortal: false,
    canAccessFinancePortal: true,
    canAccessMarketingPortal: true,
    canAccessAdminPortal: false,
    canManageBookings: true,
    canManageTeam: false,
    canManageFinances: true,
    canManageCampaigns: true,
    canViewAnalytics: true,
    canConfigureAgent: false,
    canManageClients: true,
    canManageSocialInbox: true,
    canApprovePayouts: false,
    canEditPricing: false,
  },
  studio: {
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
    canAccessStudioPortal: false,
    canAccessArtistPortal: true,
    canAccessAssistantPortal: false,
    canAccessClientPortal: false,
    canAccessFinancePortal: false,
    canAccessMarketingPortal: true,
    canAccessAdminPortal: false,
    canManageBookings: true,
    canManageTeam: false,
    canManageFinances: false,
    canManageCampaigns: true,
    canViewAnalytics: true,
    canConfigureAgent: false,
    canManageClients: false,
    canManageSocialInbox: true,
    canApprovePayouts: false,
    canEditPricing: false,
  },
  assistant: {
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
  client: {
    canAccessStudioPortal: false,
    canAccessArtistPortal: false,
    canAccessAssistantPortal: false,
    canAccessClientPortal: true,
    canAccessFinancePortal: false,
    canAccessMarketingPortal: false,
    canAccessAdminPortal: false,
    canManageBookings: false,
    canManageTeam: false,
    canManageFinances: false,
    canManageCampaigns: false,
    canViewAnalytics: false,
    canConfigureAgent: false,
    canManageClients: false,
    canManageSocialInbox: false,
    canApprovePayouts: false,
    canEditPricing: false,
  },
};

export function useRBAC(userId: string | null) {
  const workspace = useWorkspace(userId);
  
  const permissions = useMemo(() => {
    const role = (workspace.role as PortalRole) || 'client';
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.client;
  }, [workspace.role]);
  
  const checkAccess = (feature: keyof PortalPermissions): boolean => {
    return permissions[feature] || false;
  };
  
  const getHomeRoute = (): string => {
    const role = workspace.role as PortalRole;
    
    switch (role) {
      case 'owner':
      case 'admin':
      case 'studio':
        return '/studio';
      case 'manager':
        return '/studio';
      case 'artist':
        return '/artist';
      case 'assistant':
        return '/assistant';
      case 'client':
        return '/client';
      default:
        return '/';
    }
  };
  
  const roleStr = workspace.role || '';
  
  return {
    ...workspace,
    permissions,
    checkAccess,
    getHomeRoute,
    isStudio: ['owner', 'admin', 'studio', 'manager'].includes(roleStr),
    isArtist: roleStr === 'artist',
    isAssistant: roleStr === 'assistant',
    isClient: roleStr === 'client',
  };
}

export { canAccess };
