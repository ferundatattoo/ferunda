import {
  LayoutDashboard,
  Inbox,
  Layers,
  Calendar,
  Users,
  Clock,
  Palette,
  DollarSign,
  Rocket,
  Brain,
  Settings,
  Building2,
  UsersRound,
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
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

// Main navigation structure for ETHEREAL OS
export const etherealNavigation: NavSection[] = [
  {
    // Core - Always visible
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
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        key: 'pipeline',
        label: 'Pipeline',
        icon: Layers,
        route: '/os/pipeline',
        moduleKey: 'pipeline',
      },
      {
        key: 'calendar',
        label: 'Calendar',
        icon: Calendar,
        route: '/os/calendar',
        moduleKey: 'calendar',
      },
      {
        key: 'waitlist',
        label: 'Waitlist',
        icon: Clock,
        route: '/os/waitlist',
        moduleKey: 'waitlist',
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
    label: 'Studio',
    items: [
      {
        key: 'creative',
        label: 'Creative Studio',
        icon: Palette,
        route: '/os/studio',
        moduleKey: 'creative-lite', // Base access
      },
      {
        key: 'money',
        label: 'Money',
        icon: DollarSign,
        route: '/os/money',
        moduleKey: 'money-lite', // Base access
      },
    ],
  },
  {
    label: 'Growth',
    items: [
      {
        key: 'growth',
        label: 'Growth',
        icon: Rocket,
        route: '/os/growth',
        moduleKey: 'growth',
      },
      {
        key: 'ai-center',
        label: 'AI Center',
        icon: Brain,
        route: '/os/intelligence',
        moduleKey: 'ai-center',
      },
    ],
  },
  {
    label: 'Team',
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
      },
    ],
  },
  {
    items: [
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
  'creative-lite': ['creative-pro'],
  'money-lite': ['money-pro'],
};

export default etherealNavigation;
