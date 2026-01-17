import { Bell, Search, User, Clock, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user, userRole, signOut } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  const roleColors = {
    admin: 'bg-primary/20 text-primary',
    operator: 'bg-warning/20 text-warning',
    viewer: 'bg-secondary text-muted-foreground',
  };

  return (
    <header className="h-14 md:h-16 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-3 md:px-6 gap-2">
      {/* Left side - Menu button and Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        
        {/* Search */}
        <div className="relative flex-1 max-w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 md:h-10 pl-10 pr-4 bg-secondary/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        {/* Time display - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-secondary">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 md:w-10 md:h-10 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors">
          <Bell className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
        </button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 md:gap-3 hover:bg-secondary/50 p-1.5 md:p-2 rounded-lg transition-colors">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium">{displayName}</p>
                <div className="flex items-center gap-2">
                  {userRole && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColors[userRole]}`}>
                      {userRole}
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
