import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Search, Wrench, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorHandler';
import { format, formatDistanceToNow } from 'date-fns';

type MaintenanceRecord = {
  id: string;
  asset_id: string | null;
  seat_id: string | null;
  issue_type: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  reported_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  technician: string | null;
  downtime_minutes: number | null;
  repair_cost: number | null;
  created_at: string;
};

export default function Maintenance() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newRecord, setNewRecord] = useState({
    issue_type: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    technician: '',
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['maintenance_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .order('reported_at', { ascending: false });
      if (error) throw error;
      return data as MaintenanceRecord[];
    },
  });

  const createRecord = useMutation({
    mutationFn: async (record: typeof newRecord) => {
      const { error } = await supabase.from('maintenance_records').insert([record]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_records'] });
      setIsDialogOpen(false);
      setNewRecord({
        issue_type: '',
        description: '',
        priority: 'Medium',
        status: 'Open',
        technician: '',
      });
      toast.success('Maintenance record created');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error, 'Creating record'));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'Resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('maintenance_records').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_records'] });
      toast.success('Status updated');
    },
  });

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.issue_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.technician?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || record.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openCount = records.filter((r) => r.status === 'Open').length;
  const inProgressCount = records.filter((r) => r.status === 'In Progress').length;
  const resolvedCount = records.filter((r) => r.status === 'Resolved').length;
  const avgDowntime = records.length
    ? Math.round(records.reduce((acc, r) => acc + (r.downtime_minutes || 0), 0) / records.length)
    : 0;

  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case 'Critical':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'High':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'Medium':
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const issueTypes = [
    'Hardware Failure',
    'Software Issue',
    'Network Problem',
    'Power Issue',
    'Peripheral Failure',
    'Performance Issue',
    'Security Incident',
    'Other',
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Maintenance & SLA</h1>
            <p className="text-muted-foreground mt-1">
              Downtime tracking, MTTR metrics, and incident history
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Report Maintenance Issue</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue_type">Issue Type *</Label>
                    <Select
                      value={newRecord.issue_type}
                      onValueChange={(value) => setNewRecord({ ...newRecord, issue_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {issueTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newRecord.priority}
                      onValueChange={(value) => setNewRecord({ ...newRecord, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    placeholder="Describe the issue..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technician">Assigned Technician</Label>
                  <Input
                    id="technician"
                    value={newRecord.technician}
                    onChange={(e) => setNewRecord({ ...newRecord, technician: e.target.value })}
                    placeholder="Technician name"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createRecord.mutate(newRecord)}
                  disabled={!newRecord.issue_type || createRecord.isPending}
                >
                  {createRecord.isPending ? 'Creating...' : 'Create Record'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{openCount}</div>
                <div className="text-sm text-muted-foreground">Open Issues</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Wrench className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inProgressCount}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{resolvedCount}</div>
                <div className="text-sm text-muted-foreground">Resolved</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{avgDowntime}m</div>
                <div className="text-sm text-muted-foreground">Avg Downtime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search issues..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Records Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="table-header">Issue Type</TableHead>
                <TableHead className="table-header">Priority</TableHead>
                <TableHead className="table-header">Description</TableHead>
                <TableHead className="table-header">Technician</TableHead>
                <TableHead className="table-header">Reported</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading records...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No maintenance records found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 border-border/30">
                    <TableCell className="font-medium">{record.issue_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(record.priority)}
                        <span>{record.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {record.description || '-'}
                    </TableCell>
                    <TableCell>{record.technician || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.reported_at
                        ? formatDistanceToNow(new Date(record.reported_at), { addSuffix: true })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`status-badge ${
                          record.status === 'Open'
                            ? 'status-down'
                            : record.status === 'In Progress'
                            ? 'status-repair'
                            : 'status-active'
                        }`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={record.status || 'Open'}
                        onValueChange={(value) => updateStatus.mutate({ id: record.id, status: value })}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
