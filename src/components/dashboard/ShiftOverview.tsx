import { useSeats } from '@/hooks/useDashboardData';
import { Sun, Moon, Sunrise, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ShiftOverview() {
  const { data: seats, isLoading } = useSeats();

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const shiftCounts = seats?.reduce((acc, seat) => {
    if (seat.status === 'Active') {
      const shift = seat.shift?.toLowerCase() || 'day';
      acc[shift] = (acc[shift] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const shifts = [
    { name: 'Day', key: 'day', icon: Sun, color: 'text-warning', bgColor: 'bg-warning/20' },
    { name: 'Night', key: 'night', icon: Moon, color: 'text-blue-400', bgColor: 'bg-blue-400/20' },
    { name: 'Graveyard', key: 'graveyard', icon: Sunrise, color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  ];

  const totalActive = Object.values(shiftCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="glass-card p-5">
      <h3 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Active by Shift</h3>
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {shifts.map((shift) => {
          const count = shiftCounts[shift.key] || 0;
          const percentage = totalActive > 0 ? ((count / totalActive) * 100).toFixed(0) : 0;
          return (
            <div key={shift.key} className="text-center p-2 md:p-3 rounded-lg bg-secondary/30">
              <div className={cn('w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl mx-auto flex items-center justify-center mb-1 md:mb-2', shift.bgColor)}>
                <shift.icon className={cn('w-4 h-4 md:w-5 md:h-5', shift.color)} />
              </div>
              <p className="text-lg md:text-2xl font-bold">{count}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{shift.name}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground mt-0.5 md:mt-1">{percentage}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
