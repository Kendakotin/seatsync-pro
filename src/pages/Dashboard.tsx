import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
import { NewHireReadiness } from '@/components/dashboard/NewHireReadiness';
import { ShiftOverview } from '@/components/dashboard/ShiftOverview';
import { kpiData, seats } from '@/lib/mockData';
import {
  Monitor,
  Zap,
  AlertTriangle,
  CheckCircle,
  Percent,
  DollarSign,
  Clock,
  FileCheck,
} from 'lucide-react';

export default function Dashboard() {
  const statusCounts = seats.reduce((acc, seat) => {
    acc[seat.status] = (acc[seat.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time visibility for IT & Operations</p>
        </div>

        {/* KPI Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            trendValue="+5 this week"
            variant="success"
          />
          <StatCard
            title="Down Seats"
            value={kpiData.downSeats}
            subtitle="Requires attention"
            icon={<AlertTriangle className="w-6 h-6 text-destructive" />}
            trend="down"
            trendValue="-2 from yesterday"
            variant="danger"
          />
          <StatCard
            title="Utilization"
            value={`${kpiData.utilizationRate}%`}
            subtitle="Seats in use"
            icon={<Percent className="w-6 h-6 text-primary" />}
            trend="up"
            trendValue="+1.2% this month"
            variant="primary"
          />
        </div>

        {/* Second Row - KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            trendValue="-0.3h improvement"
            variant="warning"
          />
          <StatCard
            title="Cost per Seat"
            value={`$${kpiData.costPerSeat}`}
            subtitle="Monthly average"
            icon={<DollarSign className="w-6 h-6 text-primary" />}
            trend="neutral"
            trendValue="On target"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
