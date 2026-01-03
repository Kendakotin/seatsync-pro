import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, HardDrive, Monitor, Headphones, Filter } from 'lucide-react';
import { toast } from 'sonner';

type HardwareAsset = {
  id: string;
  asset_tag: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  antivirus_status: string | null;
  encryption_status: boolean | null;
  usb_policy_applied: boolean | null;
  warranty_expiry: string | null;
  assigned_agent: string | null;
  site: string | null;
  floor: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  Available: 'status-buffer',
  'In Use': 'status-active',
  'For Repair': 'status-repair',
  Down: 'status-down',
  Reserved: 'status-reserved',
};

export default function Hardware() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newAsset, setNewAsset] = useState({
    asset_tag: '',
    asset_type: 'Workstation',
    brand: '',
    model: '',
    serial_number: '',
    status: 'Available',
    site: '',
    floor: '',
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['hardware_assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hardware_assets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HardwareAsset[];
    },
  });

  const createAsset = useMutation({
    mutationFn: async (asset: typeof newAsset) => {
      const { error } = await supabase.from('hardware_assets').insert([asset]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware_assets'] });
      setIsDialogOpen(false);
      setNewAsset({
        asset_tag: '',
        asset_type: 'Workstation',
        brand: '',
        model: '',
        serial_number: '',
        status: 'Available',
        site: '',
        floor: '',
      });
      toast.success('Hardware asset added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add asset: ' + error.message);
    },
  });

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.assigned_agent?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const assetTypes = ['Workstation', 'Headset', 'Monitor', 'Thin Client', 'IP Phone', 'UPS', 'Switch'];

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'Headset':
        return <Headphones className="w-4 h-4" />;
      case 'Monitor':
        return <Monitor className="w-4 h-4" />;
      default:
        return <HardDrive className="w-4 h-4" />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hardware Assets</h1>
            <p className="text-muted-foreground mt-1">
              Track workstations, headsets, monitors, and all physical assets
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Hardware Asset</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset_tag">Asset Tag *</Label>
                    <Input
                      id="asset_tag"
                      value={newAsset.asset_tag}
                      onChange={(e) => setNewAsset({ ...newAsset, asset_tag: e.target.value })}
                      placeholder="SZ-WKS-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset_type">Type *</Label>
                    <Select
                      value={newAsset.asset_type}
                      onValueChange={(value) => setNewAsset({ ...newAsset, asset_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={newAsset.brand}
                      onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                      placeholder="Dell"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={newAsset.model}
                      onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                      placeholder="OptiPlex 7090"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serial">Serial Number</Label>
                    <Input
                      id="serial"
                      value={newAsset.serial_number}
                      onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                      placeholder="SN12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newAsset.status}
                      onValueChange={(value) => setNewAsset({ ...newAsset, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Use">In Use</SelectItem>
                        <SelectItem value="For Repair">For Repair</SelectItem>
                        <SelectItem value="Down">Down</SelectItem>
                        <SelectItem value="Reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="site">Site</Label>
                    <Input
                      id="site"
                      value={newAsset.site}
                      onChange={(e) => setNewAsset({ ...newAsset, site: e.target.value })}
                      placeholder="Main Building"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Floor</Label>
                    <Input
                      id="floor"
                      value={newAsset.floor}
                      onChange={(e) => setNewAsset({ ...newAsset, floor: e.target.value })}
                      placeholder="Floor 2"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createAsset.mutate(newAsset)}
                  disabled={!newAsset.asset_tag || createAsset.isPending}
                >
                  {createAsset.isPending ? 'Adding...' : 'Add Asset'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by asset tag, brand, model, or agent..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="In Use">In Use</SelectItem>
              <SelectItem value="For Repair">For Repair</SelectItem>
              <SelectItem value="Down">Down</SelectItem>
              <SelectItem value="Reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {assetTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assets Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="table-header">Asset Tag</TableHead>
                <TableHead className="table-header">Type</TableHead>
                <TableHead className="table-header">Brand/Model</TableHead>
                <TableHead className="table-header">Serial</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header">Location</TableHead>
                <TableHead className="table-header">Assigned To</TableHead>
                <TableHead className="table-header">Security</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading assets...
                  </TableCell>
                </TableRow>
              ) : filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hardware assets found. Add your first asset to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-muted/30 border-border/30">
                    <TableCell className="font-mono text-sm font-medium">{asset.asset_tag}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAssetIcon(asset.asset_type)}
                        {asset.asset_type}
                      </div>
                    </TableCell>
                    <TableCell>
                      {asset.brand} {asset.model}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {asset.serial_number || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`status-badge ${statusColors[asset.status || 'Available']}`}>
                        {asset.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {asset.site && asset.floor ? `${asset.site}, ${asset.floor}` : '-'}
                    </TableCell>
                    <TableCell>{asset.assigned_agent || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {asset.antivirus_status === 'Active' && (
                          <Badge variant="outline" className="text-success border-success/30 text-xs">
                            AV
                          </Badge>
                        )}
                        {asset.encryption_status && (
                          <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                            ENC
                          </Badge>
                        )}
                        {asset.usb_policy_applied && (
                          <Badge variant="outline" className="text-warning border-warning/30 text-xs">
                            USB
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Available', 'In Use', 'For Repair', 'Down', 'Reserved'].map((status) => {
            const count = assets.filter((a) => a.status === status).length;
            return (
              <div key={status} className="glass-card p-4 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
