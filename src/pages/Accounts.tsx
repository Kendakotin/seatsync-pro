import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Building2, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorHandler';
import { format } from 'date-fns';

type Account = {
  id: string;
  client_name: string;
  program_name: string;
  status: string | null;
  total_seats: number | null;
  active_seats: number | null;
  compliance_score: number | null;
  approved_image_version: string | null;
  go_live_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function Accounts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newAccount, setNewAccount] = useState({
    client_name: '',
    program_name: '',
    status: 'Active',
    total_seats: 0,
    active_seats: 0,
    approved_image_version: '',
    go_live_date: '',
    notes: '',
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('client_name', { ascending: true });
      if (error) throw error;
      return data as Account[];
    },
  });

  const createAccount = useMutation({
    mutationFn: async (account: typeof newAccount) => {
      const { error } = await supabase.from('accounts').insert([account]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setIsDialogOpen(false);
      setNewAccount({
        client_name: '',
        program_name: '',
        status: 'Active',
        total_seats: 0,
        active_seats: 0,
        approved_image_version: '',
        go_live_date: '',
        notes: '',
      });
      toast.success('Account added successfully');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error, 'Adding account'));
    },
  });

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.program_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSeats = accounts.reduce((acc, a) => acc + (a.total_seats || 0), 0);
  const activeSeats = accounts.reduce((acc, a) => acc + (a.active_seats || 0), 0);
  const avgCompliance = accounts.length
    ? Math.round(accounts.reduce((acc, a) => acc + (a.compliance_score || 0), 0) / accounts.length)
    : 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Account Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage client programs, required software stacks, and compliance
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Account</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      value={newAccount.client_name}
                      onChange={(e) => setNewAccount({ ...newAccount, client_name: e.target.value })}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program_name">Program Name *</Label>
                    <Input
                      id="program_name"
                      value={newAccount.program_name}
                      onChange={(e) => setNewAccount({ ...newAccount, program_name: e.target.value })}
                      placeholder="Customer Support"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newAccount.status}
                      onValueChange={(value) => setNewAccount({ ...newAccount, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Onboarding">Onboarding</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="go_live_date">Go-Live Date</Label>
                    <Input
                      id="go_live_date"
                      type="date"
                      value={newAccount.go_live_date}
                      onChange={(e) => setNewAccount({ ...newAccount, go_live_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_seats">Total Seats</Label>
                    <Input
                      id="total_seats"
                      type="number"
                      value={newAccount.total_seats}
                      onChange={(e) => setNewAccount({ ...newAccount, total_seats: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="active_seats">Active Seats</Label>
                    <Input
                      id="active_seats"
                      type="number"
                      value={newAccount.active_seats}
                      onChange={(e) => setNewAccount({ ...newAccount, active_seats: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approved_image_version">Approved Image Version</Label>
                  <Input
                    id="approved_image_version"
                    value={newAccount.approved_image_version}
                    onChange={(e) => setNewAccount({ ...newAccount, approved_image_version: e.target.value })}
                    placeholder="v2024.01.15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newAccount.notes}
                    onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createAccount.mutate(newAccount)}
                  disabled={!newAccount.client_name || !newAccount.program_name || createAccount.isPending}
                >
                  {createAccount.isPending ? 'Adding...' : 'Add Account'}
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
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{accounts.length}</div>
                <div className="text-sm text-muted-foreground">Total Accounts</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalSeats.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Seats</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{activeSeats.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Active Seats</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <CheckCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{avgCompliance}%</div>
                <div className="text-sm text-muted-foreground">Avg Compliance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by client or program name..."
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
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Onboarding">Onboarding</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
              <SelectItem value="Terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Accounts Grid */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            No accounts found. Add your first account to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((account) => (
              <Card key={account.id} className="glass-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{account.client_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{account.program_name}</p>
                    </div>
                    <span
                      className={`status-badge ${
                        account.status === 'Active'
                          ? 'status-active'
                          : account.status === 'Onboarding'
                          ? 'status-buffer'
                          : account.status === 'On Hold'
                          ? 'status-repair'
                          : 'status-down'
                      }`}
                    >
                      {account.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Seats</div>
                      <div className="font-medium">
                        {account.active_seats} / {account.total_seats}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Go-Live</div>
                      <div className="font-medium">
                        {account.go_live_date
                          ? format(new Date(account.go_live_date), 'MMM dd, yyyy')
                          : '-'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Compliance</span>
                      <span
                        className={`font-medium ${
                          (account.compliance_score || 0) >= 90
                            ? 'text-success'
                            : (account.compliance_score || 0) >= 70
                            ? 'text-warning'
                            : 'text-destructive'
                        }`}
                      >
                        {account.compliance_score}%
                      </span>
                    </div>
                    <Progress value={account.compliance_score || 0} className="h-2" />
                  </div>
                  {account.approved_image_version && (
                    <div className="text-xs text-muted-foreground">
                      Image: {account.approved_image_version}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
