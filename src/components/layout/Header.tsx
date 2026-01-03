import { Bell, Search, User, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { alerts } from '@/lib/mockData';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalAlerts = alerts.filter(a => a.type === 'critical').length;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-6">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search seats, assets, agents..."
          className="w-full h-10 pl-10 pr-4 bg-secondary/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {/* Time display */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-secondary">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {criticalAlerts > 0 && (
            <span className="alert-badge">{criticalAlerts}</span>
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium">IT Admin</p>
            <p className="text-xs text-muted-foreground">ILG Manila</p>
          </div>
        </div>
      </div>
    </header>
  );
}
