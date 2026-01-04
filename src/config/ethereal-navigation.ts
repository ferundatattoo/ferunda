import {
  LayoutDashboard,
  Inbox,
  GitBranch,
  Users,
  Palette,
  DollarSign,
  Rocket,
  Brain,
  Settings,
  Building2,
  UsersRound,
  Activity,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
  moduleKey: string; // Key to check access
  badge?: number;
  children?: NavItem[];
  isAddon?: boolean;
  hasProFeatures?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

// Main navigation structure for ETHEREAL OS
// Simplified: 23 modules → 6 main spaces
export const etherealNavigation: NavSection[] = [
  {
    // Core - Always Free
    items: [
      {
        key: 'command-center',
        label: 'Command Center',
        icon: LayoutDashboard,
        route: '/os',
        moduleKey: 'command-center',
      },
      {
        key: 'inbox',
        label: 'Inbox',
        icon: Inbox,
        route: '/os/inbox',
        moduleKey: 'inbox',
      },
      {
        key: 'operations',
        label: 'Operations',
        icon: GitBranch,
        route: '/os/operations',
        moduleKey: 'operations',
        // Consolidates: Pipeline, Calendar, Waitlist
      },
      {
        key: 'clients',
        label: 'Clients',
        icon: Users,
        route: '/os/clients',
        moduleKey: 'clients',
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        key: 'creative',
        label: 'Creative Studio',
        icon: Palette,
        route: '/os/creative',
        moduleKey: 'creative-lite',
        hasProFeatures: true, // Has PRO features (AI Design, Body Atlas, AR)
      },
      {
        key: 'money',
        label: 'Money',
        icon: DollarSign,
        route: '/os/money',
        moduleKey: 'money-lite',
        hasProFeatures: true, // Has PRO features (Revenue AI, Causal, Finbots)
      },
    ],
  },
  {
    label: 'Premium',
    items: [
      {
        key: 'growth',
        label: 'Growth',
        icon: Rocket,
        route: '/os/growth',
        moduleKey: 'growth',
        isAddon: true,
        // Consolidates: Marketing, Social Growth
      },
      {
        key: 'ai-center',
        label: 'AI Center',
        icon: Brain,
        route: '/os/ai',
        moduleKey: 'ai-lite', // Base access is free (chat, vision, basic realtime)
        hasProFeatures: true, // Has PRO features (AR Live, Deep Reasoning, Marketing Gen)
        // PRO gated inside: ai-center (addon), ar-live (pro)
      },
    ],
  },
  {
    label: 'Studio',
    items: [
      {
        key: 'team',
        label: 'Team',
        icon: UsersRound,
        route: '/os/artists',
        moduleKey: 'team',
      },
      {
        key: 'enterprise',
        label: 'Enterprise',
        icon: Building2,
        route: '/os/enterprise',
        moduleKey: 'enterprise',
        isAddon: true,
      },
    ],
  },
  {
    items: [
      {
        key: 'diagnostics',
        label: 'Diagnostics',
        icon: Activity,
        route: '/os/diagnostics',
        moduleKey: 'diagnostics',
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: Settings,
        route: '/os/settings',
        moduleKey: 'settings',
      },
    ],
  },
];

// Brand configuration
export const BRAND = {
  name: 'ETHEREAL',
  tagline: 'AI-Powered Studio OS',
  version: '1.0.0',
} as const;

// Module to PRO feature mapping (for showing upgrade prompts)
export const proFeatures: Record<string, string[]> = {
  'creative-lite': ['creative-pro', 'ar-live'],
  'money-lite': ['money-pro'],
  'ai-lite': ['ai-center', 'ar-live'], // AI Center has PRO features
};

// Addon pricing (displayed in upgrade modals)
export const addonPricing: Record<string, { solo: number; studio: number }> = {
  'creative-pro': { solo: 19, studio: 29 },
  'money-pro': { solo: 29, studio: 49 },
  'growth': { solo: 39, studio: 69 },
  'ai-center': { solo: 49, studio: 99 },
  'enterprise': { solo: 0, studio: 99 }, // Only for studios
};

export default etherealNavigation;
