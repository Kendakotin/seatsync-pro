import { useAccounts } from '@/hooks/useDashboardData';
import { Building2, Users, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AccountsOverview() {
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Accounts Overview</h3>
        <span className="text-xs text-muted-foreground">{accounts?.length || 0} active</span>
      </div>
      <div className="space-y-3">
        {accounts?.map((account) => {
          const utilization = account.total_seats && account.total_seats > 0 
            ? (account.active_seats || 0) / account.total_seats * 100 
            : 0;
          return (
            <div
              key={account.id}
              className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-fade-in"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{account.client_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className={cn(
                    'w-4 h-4',
                    (account.compliance_score || 0) >= 98 ? 'text-success' : (account.compliance_score || 0) >= 95 ? 'text-warning' : 'text-destructive'
                  )} />
                  <span className="text-xs font-mono">{account.compliance_score || 0}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{account.program_name}</p>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{account.active_seats || 0}/{account.total_seats || 0} seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="progress-bar w-20">
                    <div className="progress-fill" style={{ width: `${utilization}%` }} />
                  </div>
                  <span className="font-mono text-primary">{utilization.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
