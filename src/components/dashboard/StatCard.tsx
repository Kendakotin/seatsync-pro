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
    <div className="stat-card animate-slide-up p-3 md:p-4">
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="kpi-label text-[10px] md:text-xs truncate">{title}</p>
          <p className={cn('kpi-value mt-0.5 md:mt-1 text-lg md:text-2xl', variantStyles[variant])}>{value}</p>
          {subtitle && (
            <p className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-1 md:mt-2">
              {trend === 'up' && <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-success" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-destructive" />}
              {trend === 'neutral' && <Minus className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />}
              <span className={cn(
                'text-[10px] md:text-xs font-medium truncate',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={cn('w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shrink-0', iconBgStyles[variant])}>
          <div className="[&>svg]:w-4 [&>svg]:h-4 md:[&>svg]:w-6 md:[&>svg]:h-6">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
