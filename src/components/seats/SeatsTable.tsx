import { useState, useMemo } from 'react';
import { seats, type Seat, type SeatStatus, type Shift } from '@/lib/mockData';
import { Search, Filter, Download, ChevronDown, Monitor, User, Shield, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusStyles: Record<SeatStatus, string> = {
  active: 'status-active',
  buffer: 'status-buffer',
  reserved: 'status-reserved',
  down: 'status-down',
  repair: 'status-repair',
};

const statusLabels: Record<SeatStatus, string> = {
  active: 'Active',
  buffer: 'Buffer',
  reserved: 'Reserved',
  down: 'Down',
  repair: 'For Repair',
};

const shiftLabels: Record<Shift, string> = {
  day: 'Day',
  night: 'Night',
  graveyard: 'Graveyard',
};

export function SeatsTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SeatStatus | 'all'>('all');
  const [shiftFilter, setShiftFilter] = useState<Shift | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredSeats = useMemo(() => {
    return seats.filter(seat => {
      const matchesSearch = search === '' || 
        seat.seatId.toLowerCase().includes(search.toLowerCase()) ||
        seat.account.toLowerCase().includes(search.toLowerCase()) ||
        seat.agent?.toLowerCase().includes(search.toLowerCase()) ||
        seat.pcAssetTag.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || seat.status === statusFilter;
      const matchesShift = shiftFilter === 'all' || seat.shift === shiftFilter;

      return matchesSearch && matchesStatus && matchesShift;
    });
  }, [search, statusFilter, shiftFilter]);

  const statusCounts = useMemo(() => {
    return seats.reduce((acc, seat) => {
      acc[seat.status] = (acc[seat.status] || 0) + 1;
      return acc;
    }, {} as Record<SeatStatus, number>);
  }, []);

  return (
    <div className="space-y-4">
      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(statusLabels) as SeatStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              statusFilter === status
                ? cn(statusStyles[status], 'ring-2 ring-offset-2 ring-offset-background ring-current')
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            )}
          >
            {statusLabels[status]} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by seat ID, agent, account, or asset tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-secondary/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 h-10 rounded-lg border text-sm transition-colors',
                showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/50 border-border hover:bg-secondary'
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
            </button>
            <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-secondary/50 border border-border hover:bg-secondary text-sm transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Shift</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as Shift | 'all')}
                className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Shifts</option>
                {(Object.keys(shiftLabels) as Shift[]).map((shift) => (
                  <option key={shift} value={shift}>{shiftLabels[shift]}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="table-header text-left p-4">Seat ID</th>
                <th className="table-header text-left p-4">Status</th>
                <th className="table-header text-left p-4">Account / Program</th>
                <th className="table-header text-left p-4">Agent</th>
                <th className="table-header text-left p-4">Shift</th>
                <th className="table-header text-left p-4">PC Asset</th>
                <th className="table-header text-center p-4">Security</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeats.slice(0, 20).map((seat, index) => (
                <tr
                  key={seat.id}
                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer animate-fade-in"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono text-sm text-primary">{seat.seatId}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn('status-badge', statusStyles[seat.status])}>
                      {statusLabels[seat.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium">{seat.account}</p>
                      <p className="text-xs text-muted-foreground">{seat.program}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    {seat.agent ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{seat.agent}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      seat.shift === 'day' && 'bg-warning/20 text-warning',
                      seat.shift === 'night' && 'bg-blue-500/20 text-blue-400',
                      seat.shift === 'graveyard' && 'bg-purple-500/20 text-purple-400'
                    )}>
                      {shiftLabels[seat.shift]}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-mono text-xs">{seat.pcAssetTag}</p>
                      <p className="text-[10px] text-muted-foreground">{seat.imageVersion}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      {seat.antivirusStatus ? (
                        <Shield className="w-4 h-4 text-success" />
                      ) : (
                        <Shield className="w-4 h-4 text-destructive" />
                      )}
                      {seat.encryptionStatus ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min(20, filteredSeats.length)} of {filteredSeats.length} seats
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-md bg-secondary/50 text-sm hover:bg-secondary transition-colors">
              Previous
            </button>
            <button className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
