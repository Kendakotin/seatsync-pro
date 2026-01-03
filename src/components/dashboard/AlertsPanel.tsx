import { AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { alerts } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const alertIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const alertStyles = {
  critical: 'border-l-destructive bg-destructive/5',
  warning: 'border-l-warning bg-warning/5',
  info: 'border-l-primary bg-primary/5',
};

const alertIconStyles = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
};

export function AlertsPanel() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Active Alerts</h3>
        <span className="text-xs text-muted-foreground">{alerts.length} total</span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alertIcons[alert.type];
          return (
            <div
              key={alert.id}
              className={cn(
                'p-3 rounded-lg border-l-4 border border-border/50 cursor-pointer hover:border-border transition-colors animate-fade-in',
                alertStyles[alert.type]
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', alertIconStyles[alert.type])} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm text-foreground">{alert.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{alert.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  {alert.seatId && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[10px] font-mono text-primary">{alert.seatId}</span>
                      <ExternalLink className="w-3 h-3 text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
