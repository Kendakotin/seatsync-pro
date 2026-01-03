import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

const iconBgStyles = {
  default: 'bg-secondary',
  primary: 'bg-primary/20',
  success: 'bg-success/20',
  warning: 'bg-warning/20',
  danger: 'bg-destructive/20',
};

export function StatCard({ title, value, subtitle, icon, trend, trendValue, variant = 'default' }: StatCardProps) {
  return (
    <div className="stat-card animate-slide-up">
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="kpi-label">{title}</p>
          <p className={cn('kpi-value mt-1', variantStyles[variant])}>{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
              {trend === 'neutral' && <Minus className="w-4 h-4 text-muted-foreground" />}
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBgStyles[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
