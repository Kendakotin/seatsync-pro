import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
import { NewHireReadiness } from '@/components/dashboard/NewHireReadiness';
import { ShiftOverview } from '@/components/dashboard/ShiftOverview';
import { useDashboardKPIs, useRealtimeDashboard } from '@/hooks/useDashboardData';
import {
  Monitor,
  Zap,
  AlertTriangle,
  CheckCircle,
  Percent,
  DollarSign,
  Clock,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const kpiData = useDashboardKPIs();
  const queryClient = useQueryClient();
  
  // Enable real-time subscriptions
  useRealtimeDashboard();

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Operations Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">Real-time visibility for IT & Operations</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* KPI Cards - Top Row */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="Total Seats"
            value={kpiData.totalSeats.toLocaleString()}
            subtitle={`${kpiData.activeSeats} active`}
            icon={<Monitor className="w-6 h-6 text-primary" />}
            variant="primary"
          />
          <StatCard
            title="Buffer Available"
            value={kpiData.bufferSeats}
            subtitle="Ready for hiring"
            icon={<Zap className="w-6 h-6 text-success" />}
            trend="up"
            trendValue={`${kpiData.reservedSeats} reserved`}
            variant="success"
          />
          <StatCard
            title="Down Seats"
            value={kpiData.downSeats + kpiData.repairSeats}
            subtitle="Requires attention"
            icon={<AlertTriangle className="w-6 h-6 text-destructive" />}
            trend="down"
            trendValue={`${kpiData.repairSeats} in repair`}
            variant="danger"
          />
          <StatCard
            title="Utilization"
            value={`${kpiData.utilizationRate}%`}
            subtitle="Seats in use"
            icon={<Percent className="w-6 h-6 text-primary" />}
            trend="up"
            trendValue="Real-time"
            variant="primary"
          />
        </div>

        {/* Second Row - KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="Compliance Rate"
            value={`${kpiData.complianceRate}%`}
            subtitle="Security compliance"
            icon={<CheckCircle className="w-6 h-6 text-success" />}
            variant="success"
          />
          <StatCard
            title="Asset Readiness"
            value={`${kpiData.assetReadinessRate}%`}
            subtitle="Deployment ready"
            icon={<FileCheck className="w-6 h-6 text-primary" />}
            variant="primary"
          />
          <StatCard
            title="Avg Downtime"
            value={`${kpiData.avgDowntimePer100Seats}h`}
            subtitle="Per 100 seats/week"
            icon={<Clock className="w-6 h-6 text-warning" />}
            trend="down"
            trendValue="Calculated"
            variant="warning"
          />
          <StatCard
            title="License Compliance"
            value={`${kpiData.licenseComplianceRate}%`}
            subtitle="Software licenses"
            icon={<DollarSign className="w-6 h-6 text-primary" />}
            trend="neutral"
            trendValue="Monitored"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <AlertsPanel />
            <AccountsOverview />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ShiftOverview />
            <NewHireReadiness />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
