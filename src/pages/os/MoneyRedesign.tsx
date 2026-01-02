import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  DollarSign, CreditCard, Receipt, TrendingUp, AlertCircle,
  ArrowUpRight, ArrowDownRight, Calendar, Clock, CheckCircle,
  FileText, Download, RefreshCw, ChevronRight, Sparkles,
  Building2, Palette, Eye, Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = 'studio' | 'artist';

interface DepositItem {
  id: string;
  client: string;
  amount: number;
  status: 'pending' | 'paid' | 'refunded';
  dueDate: string;
  booking: string;
}

interface PayoutItem {
  id: string;
  artist: string;
  amount: number;
  sessions: number;
  status: 'pending' | 'processing' | 'completed';
  date: string;
}

interface DisputeItem {
  id: string;
  client: string;
  amount: number;
  reason: string;
  status: 'open' | 'under_review' | 'resolved';
  date: string;
}

export default function MoneyRedesign() {
  const [viewMode, setViewMode] = useState<ViewMode>('studio');
  const [activeTab, setActiveTab] = useState('deposits');
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingDeposits: 0,
    pendingPayouts: 0,
    thisMonthRevenue: 0,
    activeDisputes: 0
  });

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Calculate stats
      const confirmedBookings = bookings?.filter(b => b.deposit_paid) || [];
      const pendingBookings = bookings?.filter(b => !b.deposit_paid && b.status !== 'cancelled') || [];

      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.deposit_amount || 0), 0);
      const pendingAmount = pendingBookings.reduce((sum, b) => sum + (b.deposit_amount || 0), 0);

      setStats({
        totalRevenue,
        pendingDeposits: pendingAmount,
        pendingPayouts: Math.round(totalRevenue * 0.6),
        thisMonthRevenue: totalRevenue,
        activeDisputes: 0
      });

      // Mock deposits
      setDeposits(pendingBookings.slice(0, 10).map(b => ({
        id: b.id,
        client: b.name || 'Client',
        amount: b.deposit_amount || 200,
        status: 'pending' as const,
        dueDate: 'Jan 5, 2026',
        booking: b.tattoo_description?.substring(0, 30) || 'Tattoo session'
      })));

      // Mock payouts
      setPayouts([
        { id: '1', artist: 'Ferunda', amount: 2400, sessions: 8, status: 'pending', date: 'Jan 15' },
        { id: '2', artist: 'Alex', amount: 1800, sessions: 6, status: 'processing', date: 'Jan 15' },
      ]);

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Studio View
  const StudioView = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              <span>+12% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Deposits</p>
                <p className="text-2xl font-bold">${stats.pendingDeposits.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{deposits.length} awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold">${stats.pendingPayouts.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Next payout: Jan 15</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Disputes</p>
                <p className="text-2xl font-bold">{stats.activeDisputes}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-success mt-2">No active disputes ✓</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="deposits">Deposits & Payments</TabsTrigger>
          <TabsTrigger value="payouts">Close Period</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="forecast">Cashflow Forecast</TabsTrigger>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pending Deposits</CardTitle>
                <Button size="sm" className="gradient-primary text-white">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Request All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">{deposit.client}</TableCell>
                      <TableCell className="text-muted-foreground">{deposit.booking}</TableCell>
                      <TableCell>${deposit.amount}</TableCell>
                      <TableCell>{deposit.dueDate}</TableCell>
                      <TableCell>
                        <Badge className="bg-warning/10 text-warning">Pending</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Send Reminder
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Payout Period: Jan 1-15, 2026</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" className="gradient-primary text-white">
                    Close Period
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artist</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net Payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">{payout.artist}</TableCell>
                      <TableCell>{payout.sessions}</TableCell>
                      <TableCell>${payout.amount}</TableCell>
                      <TableCell className="text-muted-foreground">40%</TableCell>
                      <TableCell className="font-semibold">${Math.round(payout.amount * 0.6)}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          payout.status === 'pending' && "bg-warning/10 text-warning",
                          payout.status === 'processing' && "bg-info/10 text-info",
                          payout.status === 'completed' && "bg-success/10 text-success"
                        )}>
                          {payout.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Artist Statements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {payouts.map((payout) => (
                  <Card key={payout.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
                            {payout.artist[0]}
                          </div>
                          <div>
                            <p className="font-medium">{payout.artist}</p>
                            <p className="text-xs text-muted-foreground">Jan 2026</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{payout.sessions}</p>
                          <p className="text-[10px] text-muted-foreground">Sessions</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">${payout.amount}</p>
                          <p className="text-[10px] text-muted-foreground">Gross</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-success">${Math.round(payout.amount * 0.6)}</p>
                          <p className="text-[10px] text-muted-foreground">Net</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cashflow Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Expected Revenue (Next 30 days)</p>
                    <p className="text-sm text-muted-foreground">Based on confirmed bookings</p>
                  </div>
                  <p className="text-2xl font-bold text-success">$8,400</p>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Expected Payouts</p>
                    <p className="text-sm text-muted-foreground">Artist commissions</p>
                  </div>
                  <p className="text-2xl font-bold text-destructive">-$5,040</p>
                </div>
                <Separator />
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div>
                    <p className="font-medium">Net Cash Position</p>
                    <p className="text-sm text-muted-foreground">After all obligations</p>
                  </div>
                  <p className="text-2xl font-bold">$3,360</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-2 text-success" />
                <p>No active disputes</p>
                <p className="text-sm">Keep up the great work!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Artist View (simplified)
  const ArtistView = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Earnings Preview</p>
                <p className="text-2xl font-bold">${Math.round(stats.pendingPayouts * 0.6).toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Current period</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next Payout</p>
                <p className="text-2xl font-bold">Jan 15</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">In 13 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessions This Period</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">+2 from last period</p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statement Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <span>Gross Revenue</span>
              <span className="font-medium">$2,400</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <span>Studio Commission (40%)</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
              <span className="font-medium text-destructive">-$960</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
              <span className="font-medium">Your Net Earnings</span>
              <span className="font-bold text-success">$1,440</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Past Statements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Past Statements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { period: 'Dec 16-31, 2025', amount: 1680, status: 'paid' },
              { period: 'Dec 1-15, 2025', amount: 1200, status: 'paid' },
              { period: 'Nov 16-30, 2025', amount: 1920, status: 'paid' },
            ].map((statement, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-medium">{statement.period}</p>
                  <Badge className="bg-success/10 text-success text-[10px] mt-1">Paid</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold">${statement.amount}</p>
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Restricted Access Notice */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Lock className="h-5 w-5" />
            <div>
              <p className="font-medium">Studio-only features</p>
              <p className="text-sm">Global rules, commission settings, and disputes are managed by studio admins.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-success" />
            Money
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'studio' ? 'Studio finances and payroll' : 'Your earnings and statements'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-muted/50 flex gap-1">
            <Button
              variant={viewMode === 'studio' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('studio')}
              className="h-8"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Studio
            </Button>
            <Button
              variant={viewMode === 'artist' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('artist')}
              className="h-8"
            >
              <Palette className="h-4 w-4 mr-2" />
              Artist
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFinanceData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'studio' ? <StudioView /> : <ArtistView />}
    </div>
  );
}
