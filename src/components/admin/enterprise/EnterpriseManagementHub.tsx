import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building2, Users, Key, Shield, CreditCard, BarChart3,
  Plus, Settings, Trash2, Copy, Eye, EyeOff, Loader2,
  Crown, User, Mail, Clock, Check, X, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
}

export function EnterpriseManagementHub() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    setLoading(true);
    try {
      // Get current user's organization
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id, organizations(*)')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (memberData?.organizations) {
        setOrganization(memberData.organizations as unknown as Organization);

        // Get members
        const { data: membersData } = await supabase
          .from('organization_members')
          .select('*')
          .eq('organization_id', memberData.organization_id)
          .order('joined_at', { ascending: false });

        setMembers(membersData || []);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail || !organization) return;

    try {
      const { data, error } = await supabase.functions.invoke('enterprise-manager', {
        body: {
          action: 'invite_member',
          organization_id: organization.id,
          email: inviteEmail,
          role: 'member'
        }
      });

      if (error) throw error;

      toast({
        title: 'Invitación enviada',
        description: `Se envió la invitación a ${inviteEmail}`
      });

      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la invitación',
        variant: 'destructive'
      });
    }
  };

  const generateApiKey = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase.functions.invoke('enterprise-manager', {
        body: {
          action: 'generate_api_key',
          organization_id: organization.id,
          name: `API Key ${new Date().toLocaleDateString()}`,
          scopes: ['read', 'write']
        }
      });

      if (error) throw error;

      setShowApiKey(data.api_key);
      toast({
        title: 'API Key generada',
        description: 'Guarda esta clave de forma segura'
      });
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  const usageMetrics = [
    { name: 'Usuarios', current: members.length, limit: 10, percentage: (members.length / 10) * 100 },
    { name: 'Workspaces', current: 3, limit: 5, percentage: 60 },
    { name: 'API Calls', current: 8420, limit: 10000, percentage: 84.2 },
    { name: 'Storage', current: 2.4, limit: 10, percentage: 24, unit: 'GB' }
  ];

  const plans = [
    { id: 'free', name: 'Free', price: '€0', features: ['1 Workspace', '3 Users', '1K API calls/mo'] },
    { id: 'pro', name: 'Pro', price: '€49', features: ['5 Workspaces', '10 Users', '10K API calls/mo', 'Priority Support'] },
    { id: 'enterprise', name: 'Enterprise', price: 'Custom', features: ['Unlimited Workspaces', 'Unlimited Users', 'Unlimited API calls', 'SSO/SAML', 'Dedicated Support'] }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {organization?.name || 'Organización'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tu organización y equipo
          </p>
        </div>
        <Badge className={
          organization?.plan === 'enterprise' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          organization?.plan === 'pro' ? 'bg-gradient-to-r from-primary to-ai' :
          'bg-slate-500'
        }>
          <Crown className="w-3 h-3 mr-1" />
          {organization?.plan?.toUpperCase() || 'FREE'}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="backdrop-blur-sm bg-white/60 border border-white/20">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipo
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Seguridad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Usage */}
            <Card className="lg:col-span-2 backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Uso del Plan</CardTitle>
                <CardDescription>Consumo actual vs límites</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {usageMetrics.map((metric, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {metric.current}{metric.unit || ''} / {metric.limit}{metric.unit || ''}
                      </span>
                    </div>
                    <Progress 
                      value={metric.percentage} 
                      className={`h-2 ${metric.percentage > 80 ? 'bg-destructive/20' : ''}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm">Miembros</span>
                  </div>
                  <span className="font-semibold">{members.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-ai" />
                    <span className="text-sm">Workspaces</span>
                  </div>
                  <span className="font-semibold">3</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-success" />
                    <span className="text-sm">API Keys</span>
                  </div>
                  <span className="font-semibold">2</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Miembros del Equipo</CardTitle>
                  <CardDescription>Gestiona los miembros de tu organización</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="email@ejemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={inviteMember}>
                    <Plus className="w-4 h-4 mr-2" />
                    Invitar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{member.user_id.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">Usuario {member.user_id.substring(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          Desde {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        member.role === 'owner' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        member.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        'bg-slate-50'
                      }>
                        {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                        {member.role}
                      </Badge>
                      {member.role !== 'owner' && (
                        <Button variant="ghost" size="icon">
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <Card className="backdrop-blur-sm bg-white/60 border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">API Keys</CardTitle>
                  <CardDescription>Gestiona el acceso programático a tu organización</CardDescription>
                </div>
                <Button onClick={generateApiKey}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showApiKey && (
                <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="font-medium text-warning">Guarda esta clave ahora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-white rounded font-mono text-sm">{showApiKey}</code>
                    <Button variant="outline" size="icon" onClick={() => {
                      navigator.clipboard.writeText(showApiKey);
                      toast({ title: 'Copiado al portapapeles' });
                    }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Esta clave no se mostrará de nuevo. Guárdala de forma segura.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {[
                  { name: 'Production API', prefix: 'ink_prod_8f2a...', created: '2025-12-15', last_used: 'Hace 2 horas' },
                  { name: 'Development', prefix: 'ink_dev_3b9c...', created: '2025-11-20', last_used: 'Hace 3 días' }
                ].map((key, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{key.prefix}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Último uso</p>
                        <p className="text-sm">{key.last_used}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <Card key={plan.id} className={`backdrop-blur-sm border-white/20 ${
                organization?.plan === plan.id ? 'bg-primary/5 border-primary/30' : 'bg-white/60'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {organization?.plan === plan.id && (
                      <Badge className="bg-primary">Actual</Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={organization?.plan === plan.id ? 'outline' : 'default'}
                    disabled={organization?.plan === plan.id}
                  >
                    {organization?.plan === plan.id ? 'Plan Actual' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">SSO / SAML</CardTitle>
                <CardDescription>Configura Single Sign-On para tu organización</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-2">SSO disponible en Enterprise</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Integra con Google Workspace, Microsoft Entra ID, Okta y más
                  </p>
                  <Button variant="outline">Upgrade a Enterprise</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/60 border-white/20">
              <CardHeader>
                <CardTitle className="text-lg">Audit Log</CardTitle>
                <CardDescription>Historial de actividad de la organización</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { action: 'member_invited', user: 'Admin', time: 'Hace 2 horas' },
                    { action: 'api_key_created', user: 'Admin', time: 'Hace 1 día' },
                    { action: 'settings_updated', user: 'Owner', time: 'Hace 3 días' }
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{log.action.replace('_', ' ')}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
