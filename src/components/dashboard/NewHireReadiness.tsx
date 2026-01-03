import { newHires } from '@/lib/mockData';
import { UserPlus, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusStyles = {
  ready: 'status-active',
  'in-progress': 'status-repair',
  blocked: 'status-down',
};

const statusLabels = {
  ready: 'Ready',
  'in-progress': 'In Progress',
  blocked: 'Blocked',
};

export function NewHireReadiness() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">New Hire Readiness</h3>
        <UserPlus className="w-5 h-5 text-primary" />
      </div>
      <div className="space-y-3">
        {newHires.map((hire) => {
          const progress = (hire.seatsReady / hire.requiredSeats) * 100;
          return (
            <div
              key={hire.id}
              className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-fade-in"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{hire.hiringDate}</span>
                </div>
                <span className={cn('status-badge', statusStyles[hire.status])}>
                  {statusLabels[hire.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {hire.account} - {hire.program}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-success font-medium">{hire.seatsReady}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground">{hire.requiredSeats}</span>
                  <span className="text-muted-foreground">seats ready</span>
                </div>
                {hire.seatsPending > 0 && (
                  <div className="flex items-center gap-1 text-warning">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-xs">{hire.seatsPending} pending</span>
                  </div>
                )}
              </div>
              <div className="progress-bar mt-2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    hire.status === 'ready' ? 'bg-success' : hire.status === 'blocked' ? 'bg-destructive' : 'bg-warning'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
