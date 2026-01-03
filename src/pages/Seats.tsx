import { MainLayout } from '@/components/layout/MainLayout';
import { SeatsTable } from '@/components/seats/SeatsTable';
import { kpiData } from '@/lib/mockData';
import { Monitor, Layers, Users } from 'lucide-react';

export default function Seats() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Seat-Based Asset Management</h1>
            <p className="text-muted-foreground mt-1">
              In BPOs, the seat is the asset — manage workstations, agents, and equipment per seat
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50">
              <Monitor className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{kpiData.totalSeats} Seats</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50">
              <Layers className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">{kpiData.activeSeats} Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50">
              <Users className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">{kpiData.bufferSeats} Buffer</span>
            </div>
          </div>
        </div>

        {/* Seats Table */}
        <SeatsTable />
      </div>
    </MainLayout>
  );
}
