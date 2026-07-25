import Link from "next/link";
import { 
  FolderOpen, 
  Wallet, 
  Clock, 
  Share2, 
  TrendingUp, 
  Wrench, 
  Target, 
  History, 
  ArrowUpRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function DashboardHome() {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Welcome back to <span className="text-primary">NexAce CRM</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here is your multi-tenant workspace status and operations overview for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/projects">
              <FolderOpen className="w-4 h-4 mr-2" /> Open Projects
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/team">Team Directory</Link>
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +2 this week
              </p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <FolderOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Retainers</p>
              <p className="text-2xl font-bold text-foreground">$42,800</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +8.4% vs last month
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground">4 Timesheets</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" /> 12h avg review time
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referrals Value</p>
              <p className="text-2xl font-bold text-foreground">$3,500</p>
              <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 2 Hired candidates
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <Share2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 span) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Projects Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" /> Active Sprints & Projects
                </CardTitle>
                <CardDescription>Real-time delivery progress across teams</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects" className="gap-1 text-primary">
                  Sprint Board <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">NexAce CRM Implementation</p>
                  <p className="text-xs text-muted-foreground">Client: Internal Workspace | Target: Aug 15</p>
                </div>
                <Badge color="primary">Sprint 2</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">Client Portal Integration</p>
                  <p className="text-xs text-muted-foreground">Client: Ziqsy | Target: Sep 1</p>
                </div>
                <Badge color="info">Design Phase</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">Website Redesign</p>
                  <p className="text-xs text-muted-foreground">Client: Acme Retail | Target: Jul 30</p>
                </div>
                <Badge color="success">Testing</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Strategic OKRs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-rose-500" /> Strategic OKRs (Q3)
                </CardTitle>
                <CardDescription>Company-wide objectives and key results</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/goals" className="gap-1 text-primary">
                  Manage OKRs <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Scale tenant capacity to 500 teams</span>
                  <span className="text-xs font-bold text-primary">65% Progress</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[65%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Achieve &gt;95% client satisfaction score</span>
                  <span className="text-xs font-bold text-emerald-500">92% Progress</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span) */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-sky-500" /> Audit Trail Log
              </CardTitle>
              <CardDescription>Recent system events & approvals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>Admin</strong> approved timesheet for <em>Design Phase</em>.</p>
                  <p className="text-[11px] text-muted-foreground">10 minutes ago</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>Sarah Jenkins</strong> requested time off for <em>Summer Break</em>.</p>
                  <p className="text-[11px] text-muted-foreground">2 hours ago</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>System</strong> updated billing configuration for tenant <em>Ziqsy</em>.</p>
                  <p className="text-[11px] text-muted-foreground">1 day ago</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>Marcus Wu</strong> joined the <em>Development</em> department.</p>
                  <p className="text-[11px] text-muted-foreground">3 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
