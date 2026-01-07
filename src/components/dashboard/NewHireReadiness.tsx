import { useNewHires } from '@/hooks/useDashboardData';
import { UserPlus, Calendar, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const statusStyles = {
  Ready: 'status-active',
  'In Progress': 'status-repair',
  Pending: 'status-buffer',
  Blocked: 'status-down',
};

export function NewHireReadiness() {
  const { data: newHires, isLoading } = useNewHires();

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Group new hires by date and calculate readiness
  const groupedHires = newHires?.reduce((acc, hire) => {
    const date = hire.hire_date;
    if (!acc[date]) {
      acc[date] = {
        date,
        hires: [],
        account: (hire.accounts as any)?.client_name || 'Unknown',
        program: (hire.accounts as any)?.program_name || 'Unknown',
      };
    }
    acc[date].hires.push(hire);
    return acc;
  }, {} as Record<string, { date: string; hires: typeof newHires; account: string; program: string }>);

  const hireBatches = Object.values(groupedHires || {}).map(batch => {
    const total = batch.hires.length;
    const ready = batch.hires.filter(h => h.status === 'Ready').length;
    const blocked = batch.hires.filter(h => h.status === 'Blocked').length;
    const pending = total - ready;
    
    let status: 'Ready' | 'In Progress' | 'Blocked' = 'In Progress';
    if (ready === total) status = 'Ready';
    else if (blocked > 0) status = 'Blocked';

    return {
      ...batch,
      total,
      ready,
      pending,
      status,
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">New Hire Readiness</h3>
        <UserPlus className="w-5 h-5 text-primary" />
      </div>
      <div className="space-y-3">
        {hireBatches.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming hires</p>
          </div>
        ) : (
          hireBatches.map((batch) => {
            const progress = (batch.ready / batch.total) * 100;
            return (
              <div
                key={batch.date}
                className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-fade-in"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {format(new Date(batch.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <span className={cn('status-badge', statusStyles[batch.status])}>
                    {batch.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {batch.account} - {batch.program}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-success font-medium">{batch.ready}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-foreground">{batch.total}</span>
                    <span className="text-muted-foreground">seats ready</span>
                  </div>
                  {batch.pending > 0 && (
                    <div className="flex items-center gap-1 text-warning">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs">{batch.pending} pending</span>
                    </div>
                  )}
                </div>
                <div className="progress-bar mt-2">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      batch.status === 'Ready' ? 'bg-success' : batch.status === 'Blocked' ? 'bg-destructive' : 'bg-warning'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
