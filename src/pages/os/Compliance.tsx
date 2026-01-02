import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Lock,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Bell,
  Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Policy {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'draft' | 'archived';
  lastUpdated: string;
  acceptanceRate: number;
  requiredFor: string[];
}

interface ComplianceCheck {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending';
  lastChecked: string;
  details: string;
}

export default function Compliance() {
  const [policies] = useState<Policy[]>([
    {
      id: '1',
      name: 'Deposit & Cancellation Policy',
      description: 'Rules for deposits, cancellations, and refunds',
      category: 'Financial',
      status: 'active',
      lastUpdated: '2024-01-15',
      acceptanceRate: 98,
      requiredFor: ['booking_confirmation'],
    },
    {
      id: '2',
      name: 'Aftercare Instructions',
      description: 'Post-tattoo care requirements and liability',
      category: 'Health & Safety',
      status: 'active',
      lastUpdated: '2024-01-10',
      acceptanceRate: 100,
      requiredFor: ['session_start'],
    },
    {
      id: '3',
      name: 'Design Rights & Ownership',
      description: 'Intellectual property and design usage rights',
      category: 'Legal',
      status: 'active',
      lastUpdated: '2024-01-05',
      acceptanceRate: 95,
      requiredFor: ['design_approval'],
    },
    {
      id: '4',
      name: 'Age Verification',
      description: 'Minimum age requirements and ID verification',
      category: 'Legal',
      status: 'active',
      lastUpdated: '2024-01-01',
      acceptanceRate: 100,
      requiredFor: ['booking_confirmation'],
    },
    {
      id: '5',
      name: 'Privacy & Data Policy',
      description: 'How client data is collected, stored, and used',
      category: 'Privacy',
      status: 'draft',
      lastUpdated: '2024-01-20',
      acceptanceRate: 0,
      requiredFor: ['account_creation'],
    },
  ]);

  const [complianceChecks] = useState<ComplianceCheck[]>([
    { id: '1', name: 'All policies have required fields', status: 'passed', lastChecked: '1 hour ago', details: 'All 4 active policies are complete' },
    { id: '2', name: 'Client consent tracking', status: 'passed', lastChecked: '1 hour ago', details: '156 consents recorded this month' },
    { id: '3', name: 'Policy version control', status: 'passed', lastChecked: '1 hour ago', details: 'All versions properly tracked' },
    { id: '4', name: 'GDPR compliance', status: 'pending', lastChecked: '2 days ago', details: 'Awaiting privacy policy approval' },
    { id: '5', name: 'Age verification checks', status: 'passed', lastChecked: '1 hour ago', details: '100% compliance rate' },
  ]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      archived: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      passed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
    return <Badge className={`${styles[status]} text-xs`}>{status}</Badge>;
  };

  const getCheckIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const overallScore = Math.round(
    (complianceChecks.filter(c => c.status === 'passed').length / complianceChecks.length) * 100
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance Center
          </h1>
          <p className="text-muted-foreground">Manage policies, consents, and compliance checks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Compliance Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Compliance Score</p>
                  <p className="text-3xl font-bold text-green-400">{overallScore}%</p>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <Progress value={overallScore} className="mt-4 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500/70" />
                <div>
                  <p className="text-2xl font-bold">{policies.filter(p => p.status === 'active').length}</p>
                  <p className="text-xs text-muted-foreground">Active Policies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-purple-500/70" />
                <div>
                  <p className="text-2xl font-bold">156</p>
                  <p className="text-xs text-muted-foreground">Consents This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-500/70" />
                <div>
                  <p className="text-2xl font-bold">{complianceChecks.filter(c => c.status === 'pending').length}</p>
                  <p className="text-xs text-muted-foreground">Pending Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies" className="gap-2">
            <FileText className="h-4 w-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="checks" className="gap-2">
            <Shield className="h-4 w-4" />
            Compliance Checks
          </TabsTrigger>
          <TabsTrigger value="consents" className="gap-2">
            <Users className="h-4 w-4" />
            Consent Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Policy Library</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{policy.name}</h3>
                            {getStatusBadge(policy.status)}
                            <Badge variant="outline" className="text-xs">{policy.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{policy.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Updated: {policy.lastUpdated}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {policy.acceptanceRate}% acceptance
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {policy.status === 'active' && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Required for:</span>
                            <div className="flex gap-1">
                              {policy.requiredFor.map((req) => (
                                <Badge key={req} variant="secondary" className="text-xs">
                                  {req.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Compliance Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complianceChecks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border"
                  >
                    {getCheckIcon(check.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{check.name}</h3>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{check.details}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{check.lastChecked}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Consent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border"
                  >
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Client #{100 + i} accepted Deposit Policy</p>
                      <p className="text-xs text-muted-foreground">
                        {i} hour{i > 1 ? 's' : ''} ago • IP: 192.168.1.{i}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">v2.1</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
