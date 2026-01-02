import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Filter,
  Download,
  Activity,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface ActionCatalogItem {
  id: string;
  action_key: string;
  display_name: string;
  description: string;
  category: string;
  risk_level: string;
  required_role: string;
  handler_type: string;
  is_active: boolean;
}

interface ActionExecution {
  id: string;
  action_key: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  duration_ms: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export default function ActionsMonitor() {
  const [catalog, setCatalog] = useState<ActionCatalogItem[]>([]);
  const [executions, setExecutions] = useState<ActionExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    pending: 0,
    avgDuration: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch catalog
      const { data: catalogData } = await supabase
        .from('action_catalog')
        .select('*')
        .order('category', { ascending: true });

      // Fetch recent executions
      const { data: executionsData } = await supabase
        .from('action_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setCatalog(catalogData || []);
      setExecutions(executionsData || []);

      // Calculate stats
      if (executionsData) {
        const successCount = executionsData.filter(e => e.status === 'success').length;
        const failedCount = executionsData.filter(e => e.status === 'failed').length;
        const pendingCount = executionsData.filter(e => ['pending', 'running'].includes(e.status)).length;
        const durations = executionsData
          .filter(e => e.duration_ms)
          .map(e => e.duration_ms as number);
        const avgDuration = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

        setStats({
          total: executionsData.length,
          success: successCount,
          failed: failedCount,
          pending: pendingCount,
          avgDuration,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'retrying':
        return <RotateCcw className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      retrying: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return <Badge className={`${colors[status] || ''} text-xs`}>{status}</Badge>;
  };

  const getRiskBadge = (risk: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-500/20 text-green-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-orange-500/20 text-orange-400',
      critical: 'bg-red-500/20 text-red-400',
    };
    return <Badge className={`${colors[risk]} text-xs`}>{risk}</Badge>;
  };

  const filteredExecutions = executions.filter(e => {
    const matchesSearch = e.action_key.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedCatalog = catalog.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ActionCatalogItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Actions Monitor</h1>
          <p className="text-muted-foreground">Capability layer & execution tracking</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary/70" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Executions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500/70" />
                <div>
                  <p className="text-2xl font-bold">{stats.success}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
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
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500/70" />
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
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
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500/70" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-500/70" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgDuration}ms</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="executions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="executions" className="gap-2">
            <Activity className="h-4 w-4" />
            Executions
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <Zap className="h-4 w-4" />
            Action Catalog
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por action key..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'success', 'failed', 'pending', 'running'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* Executions Table */}
          <Card>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExecutions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(execution.status)}
                          {getStatusBadge(execution.status)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {execution.action_key}
                      </TableCell>
                      <TableCell>
                        {execution.duration_ms ? `${execution.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        {execution.retry_count > 0 && (
                          <Badge variant="outline" className="text-orange-400">
                            {execution.retry_count} retries
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(execution.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-red-400 text-xs">
                        {execution.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExecutions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No executions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          {Object.entries(groupedCatalog).map(([category, actions]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg capitalize flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action Key</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Handler</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-mono text-sm">
                          {action.action_key}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{action.display_name}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getRiskBadge(action.risk_level)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{action.required_role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {action.handler_type}
                        </TableCell>
                        <TableCell>
                          {action.is_active ? (
                            <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-500/20 text-gray-400">Inactive</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
