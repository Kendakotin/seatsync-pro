import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { Plus, Search, FileCheck, AlertTriangle, CheckCircle, XCircle, Cloud, Loader2, Edit, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type SoftwareLicense = {
  id: string;
  software_name: string;
  vendor: string | null;
  license_type: string | null;
  license_key: string | null;
  total_seats: number | null;
  used_seats: number | null;
  expiry_date: string | null;
  cost_per_seat: number | null;
  is_client_provided: boolean | null;
  compliance_status: string | null;
  notes: string | null;
  created_at: string;
};

export default function Licenses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const [newLicense, setNewLicense] = useState({
    software_name: '',
    vendor: '',
    license_type: 'Named',
    total_seats: 1,
    used_seats: 0,
    expiry_date: '',
    cost_per_seat: 0,
    is_client_provided: false,
  });

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['software_licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('software_licenses')
        .select('*')
        .order('software_name', { ascending: true });
      if (error) throw error;
      return data as SoftwareLicense[];
    },
  });

  const createLicense = useMutation({
    mutationFn: async (license: typeof newLicense) => {
      const { error } = await supabase.from('software_licenses').insert([{
        ...license,
        compliance_status: license.used_seats <= license.total_seats ? 'Compliant' : 'Non-Compliant',
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software_licenses'] });
      setIsDialogOpen(false);
      setNewLicense({
        software_name: '',
        vendor: '',
        license_type: 'Named',
        total_seats: 1,
        used_seats: 0,
        expiry_date: '',
        cost_per_seat: 0,
        is_client_provided: false,
      });
      toast.success('License added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add license: ' + error.message);
    },
  });

  const deleteLicense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('software_licenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['software_licenses'] });
      toast.success('License deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const syncEntraLicenses = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('license-sync');
      if (error) throw error;
      if (data.success) {
        toast.success(`Synced ${data.licenses_synced} licenses from Entra ID`);
        queryClient.invalidateQueries({ queryKey: ['software_licenses'] });
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      toast.error('License sync failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredLicenses = licenses.filter((license) => {
    const matchesSearch =
      license.software_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      license.vendor?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompliance = complianceFilter === 'all' || license.compliance_status === complianceFilter;
    return matchesSearch && matchesCompliance;
  });

  const getComplianceIcon = (status: string | null) => {
    switch (status) {
      case 'Compliant':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'Non-Compliant':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getUsagePercentage = (used: number | null, total: number | null) => {
    if (!total || total === 0) return 0;
    return Math.min(((used || 0) / total) * 100, 100);
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const totalCompliant = licenses.filter((l) => l.compliance_status === 'Compliant').length;
  const totalNonCompliant = licenses.filter((l) => l.compliance_status === 'Non-Compliant').length;
  const expiringSoon = licenses.filter((l) => isExpiringSoon(l.expiry_date)).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">License Compliance</h1>
            <p className="text-muted-foreground mt-1">
              Software and license tracking built for client and ISO audits
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={syncEntraLicenses} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 mr-2" />
              )}
              Sync Entra ID
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add License
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New License</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="software_name">Software Name *</Label>
                    <Input
                      id="software_name"
                      value={newLicense.software_name}
                      onChange={(e) => setNewLicense({ ...newLicense, software_name: e.target.value })}
                      placeholder="Microsoft Office 365"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      value={newLicense.vendor}
                      onChange={(e) => setNewLicense({ ...newLicense, vendor: e.target.value })}
                      placeholder="Microsoft"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license_type">License Type</Label>
                    <Select
                      value={newLicense.license_type}
                      onValueChange={(value) => setNewLicense({ ...newLicense, license_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Named">Named</SelectItem>
                        <SelectItem value="Concurrent">Concurrent</SelectItem>
                        <SelectItem value="Site">Site</SelectItem>
                        <SelectItem value="Volume">Volume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={newLicense.expiry_date}
                      onChange={(e) => setNewLicense({ ...newLicense, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total_seats">Total Seats</Label>
                    <Input
                      id="total_seats"
                      type="number"
                      value={newLicense.total_seats}
                      onChange={(e) => setNewLicense({ ...newLicense, total_seats: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="used_seats">Used Seats</Label>
                    <Input
                      id="used_seats"
                      type="number"
                      value={newLicense.used_seats}
                      onChange={(e) => setNewLicense({ ...newLicense, used_seats: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_per_seat">Cost per Seat ($)</Label>
                    <Input
                      id="cost_per_seat"
                      type="number"
                      step="0.01"
                      value={newLicense.cost_per_seat}
                      onChange={(e) => setNewLicense({ ...newLicense, cost_per_seat: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newLicense.is_client_provided}
                        onChange={(e) => setNewLicense({ ...newLicense, is_client_provided: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Client Provided</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createLicense.mutate(newLicense)}
                  disabled={!newLicense.software_name || createLicense.isPending}
                >
                  {createLicense.isPending ? 'Adding...' : 'Add License'}
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
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{licenses.length}</div>
                <div className="text-sm text-muted-foreground">Total Licenses</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalCompliant}</div>
                <div className="text-sm text-muted-foreground">Compliant</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalNonCompliant}</div>
                <div className="text-sm text-muted-foreground">Non-Compliant</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{expiringSoon}</div>
                <div className="text-sm text-muted-foreground">Expiring Soon</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by software name or vendor..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Compliance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Compliant">Compliant</SelectItem>
              <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Licenses Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="table-header">Software</TableHead>
                <TableHead className="table-header">Vendor</TableHead>
                <TableHead className="table-header">Type</TableHead>
                <TableHead className="table-header">Usage</TableHead>
                <TableHead className="table-header">Expiry</TableHead>
                <TableHead className="table-header">Cost/Seat</TableHead>
                <TableHead className="table-header">Source</TableHead>
                <TableHead className="table-header">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading licenses...
                  </TableCell>
                </TableRow>
              ) : filteredLicenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No licenses found. Add your first license to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLicenses.map((license) => (
                  <TableRow key={license.id} className="hover:bg-muted/30 border-border/30">
                    <TableCell className="font-medium">{license.software_name}</TableCell>
                    <TableCell className="text-muted-foreground">{license.vendor || '-'}</TableCell>
                    <TableCell>
                      <span className="status-badge status-buffer">{license.license_type}</span>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">
                          {license.used_seats} / {license.total_seats} seats
                        </div>
                        <Progress
                          value={getUsagePercentage(license.used_seats, license.total_seats)}
                          className="h-1.5"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {license.expiry_date ? (
                        <span
                          className={`text-sm ${
                            isExpired(license.expiry_date)
                              ? 'text-destructive'
                              : isExpiringSoon(license.expiry_date)
                              ? 'text-warning'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(new Date(license.expiry_date), 'MMM dd, yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>${license.cost_per_seat?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <span
                        className={`status-badge ${
                          license.is_client_provided ? 'status-reserved' : 'status-buffer'
                        }`}
                      >
                        {license.is_client_provided ? 'Client' : 'Company'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getComplianceIcon(license.compliance_status)}
                        <span className="text-sm">{license.compliance_status}</span>
                      </div>
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
