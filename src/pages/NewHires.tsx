import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Search, UserPlus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type NewHire = {
  id: string;
  employee_name: string;
  employee_id: string | null;
  hire_date: string;
  account_id: string | null;
  pc_imaged: boolean | null;
  software_installed: boolean | null;
  headset_issued: boolean | null;
  account_access_provisioned: boolean | null;
  status: string | null;
  notes: string | null;
  created_at: string;
};

type Account = {
  id: string;
  client_name: string;
  program_name: string;
};

export default function NewHires() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newHire, setNewHire] = useState({
    employee_name: '',
    employee_id: '',
    hire_date: '',
    account_id: '',
    status: 'Pending',
  });

  const { data: newHires = [], isLoading } = useQuery({
    queryKey: ['new_hires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('new_hires')
        .select('*')
        .order('hire_date', { ascending: true });
      if (error) throw error;
      return data as NewHire[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, client_name, program_name')
        .eq('status', 'Active');
      if (error) throw error;
      return data as Account[];
    },
  });

  const createNewHire = useMutation({
    mutationFn: async (hire: typeof newHire) => {
      const { error } = await supabase.from('new_hires').insert([{
        ...hire,
        account_id: hire.account_id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new_hires'] });
      setIsDialogOpen(false);
      setNewHire({
        employee_name: '',
        employee_id: '',
        hire_date: '',
        account_id: '',
        status: 'Pending',
      });
      toast.success('New hire added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add new hire: ' + error.message);
    },
  });

  const updateHireStatus = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: boolean }) => {
      const { error } = await supabase
        .from('new_hires')
        .update({ [field]: value })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new_hires'] });
    },
  });

  const filteredHires = newHires.filter((hire) => {
    const matchesSearch =
      hire.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hire.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || hire.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getReadinessStatus = (hire: NewHire) => {
    const checks = [hire.pc_imaged, hire.software_installed, hire.headset_issued, hire.account_access_provisioned];
    const completed = checks.filter(Boolean).length;
    if (completed === 4) return { label: 'Ready', color: 'status-active', icon: CheckCircle };
    if (completed > 0) return { label: 'In Progress', color: 'status-repair', icon: Clock };
    return { label: 'Pending', color: 'status-down', icon: AlertCircle };
  };

  const readyCount = newHires.filter((h) => getReadinessStatus(h).label === 'Ready').length;
  const inProgressCount = newHires.filter((h) => getReadinessStatus(h).label === 'In Progress').length;
  const pendingCount = newHires.filter((h) => getReadinessStatus(h).label === 'Pending').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">New Hire Readiness</h1>
            <p className="text-muted-foreground mt-1">
              Track hiring batches, seat provisioning, and onboarding status
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add New Hire
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Hire</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_name">Employee Name *</Label>
                    <Input
                      id="employee_name"
                      value={newHire.employee_name}
                      onChange={(e) => setNewHire({ ...newHire, employee_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      value={newHire.employee_id}
                      onChange={(e) => setNewHire({ ...newHire, employee_id: e.target.value })}
                      placeholder="EMP001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Hire Date *</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={newHire.hire_date}
                      onChange={(e) => setNewHire({ ...newHire, hire_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_id">Account</Label>
                    <Select
                      value={newHire.account_id}
                      onValueChange={(value) => setNewHire({ ...newHire, account_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.client_name} - {account.program_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createNewHire.mutate(newHire)}
                  disabled={!newHire.employee_name || !newHire.hire_date || createNewHire.isPending}
                >
                  {createNewHire.isPending ? 'Adding...' : 'Add New Hire'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{newHires.length}</div>
                <div className="text-sm text-muted-foreground">Total New Hires</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{readyCount}</div>
                <div className="text-sm text-muted-foreground">Ready</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{inProgressCount}</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or employee ID..."
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
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Ready">Ready</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* New Hires Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="table-header">Employee</TableHead>
                <TableHead className="table-header">Hire Date</TableHead>
                <TableHead className="table-header text-center">PC Imaged</TableHead>
                <TableHead className="table-header text-center">Software</TableHead>
                <TableHead className="table-header text-center">Headset</TableHead>
                <TableHead className="table-header text-center">Access</TableHead>
                <TableHead className="table-header">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading new hires...
                  </TableCell>
                </TableRow>
              ) : filteredHires.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No new hires found. Add your first new hire to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredHires.map((hire) => {
                  const readiness = getReadinessStatus(hire);
                  const StatusIcon = readiness.icon;
                  return (
                    <TableRow key={hire.id} className="hover:bg-muted/30 border-border/30">
                      <TableCell>
                        <div>
                          <div className="font-medium">{hire.employee_name}</div>
                          <div className="text-xs text-muted-foreground">{hire.employee_id || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(hire.hire_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={hire.pc_imaged || false}
                          onCheckedChange={(checked) =>
                            updateHireStatus.mutate({ id: hire.id, field: 'pc_imaged', value: !!checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={hire.software_installed || false}
                          onCheckedChange={(checked) =>
                            updateHireStatus.mutate({ id: hire.id, field: 'software_installed', value: !!checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={hire.headset_issued || false}
                          onCheckedChange={(checked) =>
                            updateHireStatus.mutate({ id: hire.id, field: 'headset_issued', value: !!checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={hire.account_access_provisioned || false}
                          onCheckedChange={(checked) =>
                            updateHireStatus.mutate({ id: hire.id, field: 'account_access_provisioned', value: !!checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="w-4 h-4" />
                          <span className={`status-badge ${readiness.color}`}>{readiness.label}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
