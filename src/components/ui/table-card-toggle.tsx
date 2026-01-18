import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { useIsMobile } from "@/hooks/use-mobile";

export type ViewMode = "table" | "card";

interface TableCardToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function TableCardToggle({ viewMode, onViewModeChange, className }: TableCardToggleProps) {
  const isMobile = useIsMobile();

  // Auto-switch to card view on mobile by default
  React.useEffect(() => {
    if (isMobile && viewMode === "table") {
      onViewModeChange("card");
    }
  }, [isMobile]);

  return (
    <div className={cn("flex items-center gap-1 bg-secondary/50 rounded-lg p-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange("table")}
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === "table" && "bg-background shadow-sm"
        )}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Table</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewModeChange("card")}
        className={cn(
          "h-8 px-3 gap-2",
          viewMode === "card" && "bg-background shadow-sm"
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline text-xs">Cards</span>
      </Button>
    </div>
  );
}

interface DataCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DataCard({ children, className, onClick }: DataCardProps) {
  return (
    <div 
      className={cn(
        "glass-card p-4 space-y-3 hover:bg-muted/30 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface DataCardFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function DataCardField({ label, value, className }: DataCardFieldProps) {
  return (
    <div className={cn("flex justify-between items-start gap-2", className)}>
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value || "—"}</span>
    </div>
  );
}

interface DataCardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DataCardHeader({ title, subtitle, badge, icon, actions }: DataCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && (
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{title}</span>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="shrink-0 flex items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}

export function useTableCardView(defaultMode: ViewMode = "table") {
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultMode);
  const isMobile = useIsMobile();

  // Set initial mode based on screen size
  React.useEffect(() => {
    if (isMobile) {
      setViewMode("card");
    }
  }, []);

  return { viewMode, setViewMode, isMobile };
}
