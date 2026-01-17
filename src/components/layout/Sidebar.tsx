import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  HardDrive,
  FileCheck,
  Building2,
  UserPlus,
  Wrench,
  Shield,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Users,
  Laptop,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Monitor, label: 'Seats', path: '/seats' },
  { icon: HardDrive, label: 'Hardware', path: '/hardware' },
  { icon: FileCheck, label: 'Licenses', path: '/licenses' },
  { icon: Building2, label: 'Accounts', path: '/accounts' },
  { icon: UserPlus, label: 'New Hires', path: '/new-hires' },
  { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
  { icon: Shield, label: 'Security', path: '/security' },
  { icon: Laptop, label: 'Device Agents', path: '/device-registrations' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Users, label: 'Users', path: '/users' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ isMobile = false, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // On mobile, always show expanded sidebar
  const isCollapsed = isMobile ? false : collapsed;

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <aside
      className={cn(
        'h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
        isMobile ? 'w-full' : 'fixed left-0 top-0 h-screen z-50',
        !isMobile && (isCollapsed ? 'w-16' : 'w-64')
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-sm">SZ IT Assets</span>
              <span className="text-[10px] text-muted-foreground">Marjone Yecla, Sr. IT Custodian</span>
            </div>
          )}
        </div>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-md hover:bg-sidebar-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                'nav-item',
                isActive && 'nav-item-active'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">System Status</span>
            </div>
            <p className="text-xs text-foreground font-medium">All Systems Operational</p>
          </div>
        </div>
      )}
    </aside>
  );
}
