import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  bytesToGb,
  formatCpu,
  formatGb,
  isAwaitingIntuneSync,
  sanitizeUserString,
} from '@/lib/intuneInventoryFormat';
import { parseBarcodeData, formatMacAddress } from '@/lib/barcodeParser';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, HardDrive, Monitor, Headphones, Filter, Edit, Trash2, RefreshCw, Cloud, Loader2, ExternalLink, ScanBarcode, Shield, Lock, Usb } from 'lucide-react';
import { TableCardToggle, DataCard, DataCardField, DataCardHeader, useTableCardView, ViewMode } from '@/components/ui/table-card-toggle';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  purchase_date: string | null;
  purchase_cost: number | null;
  assigned_agent: string | null;
  site: string | null;
  floor: string | null;
  image_version: string | null;
  notes: string | null;
  created_at: string;
  hostname: string | null;
  cpu: string | null;
  ram_gb: number | null;
  disk_type: string | null;
  disk_space_gb: number | null;
  last_user_login: string | null;
  logged_in_user: string | null;
  user_profile_count: number | null;
  specs: Record<string, unknown> | null;
};

const statusColors: Record<string, string> = {
  Available: 'status-buffer',
  'In Use': 'status-active',
  'For Repair': 'status-repair',
  Repair: 'status-repair',
  Down: 'status-down',
  Reserved: 'status-reserved',
  EOL: 'status-down',
};

const emptyAsset = {
  asset_tag: '',
  asset_type: 'Workstation',
  brand: '',
  model: '',
  serial_number: '',
  mac_address: '',
  status: 'Available',
  site: '',
  floor: '',
  assigned_agent: '',
  antivirus_status: 'Active',
  encryption_status: false,
  usb_policy_applied: false,
  warranty_expiry: '',
  purchase_date: '',
  purchase_cost: '',
  image_version: '',
  hostname: '',
  notes: '',
};

export default function Hardware() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [hardwareInfoFilter, setHardwareInfoFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBulkScannerOpen, setIsBulkScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'search' | 'newAsset' | 'editAsset'>('search');
  const [bulkScannedTags, setBulkScannedTags] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<HardwareAsset | null>(null);
  const { viewMode, setViewMode } = useTableCardView("table");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newAsset, setNewAsset] = useState(emptyAsset);
  const [editAsset, setEditAsset] = useState(emptyAsset);

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
      const { error } = await supabase.from('hardware_assets').insert([{
        ...asset,
        purchase_cost: asset.purchase_cost ? parseFloat(asset.purchase_cost) : null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware_assets'] });
      setIsDialogOpen(false);
      setNewAsset(emptyAsset);
      toast.success('Hardware asset added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add asset: ' + error.message);
    },
  });

  const updateAsset = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editAsset }) => {
      const { error } = await supabase
        .from('hardware_assets')
        .update({
          ...data,
          purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware_assets'] });
      setIsEditDialogOpen(false);
      setSelectedAsset(null);
      toast.success('Asset updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update asset: ' + error.message);
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hardware_assets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware_assets'] });
      toast.success('Asset deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete asset: ' + error.message);
    },
  });

  const syncIntune = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('intune-sync');
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(`Synced ${data.devices_synced} devices from Intune`);
        queryClient.invalidateQueries({ queryKey: ['hardware_assets'] });
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      toast.error('Intune sync failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditClick = (asset: HardwareAsset) => {
    setSelectedAsset(asset);
    setEditAsset({
      asset_tag: asset.asset_tag,
      asset_type: asset.asset_type,
      brand: asset.brand || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      mac_address: (asset as any).mac_address || '',
      status: asset.status || 'Available',
      site: asset.site || '',
      floor: asset.floor || '',
      assigned_agent: asset.assigned_agent || '',
      antivirus_status: asset.antivirus_status || 'Active',
      encryption_status: asset.encryption_status || false,
      usb_policy_applied: asset.usb_policy_applied || false,
      warranty_expiry: asset.warranty_expiry || '',
      purchase_date: asset.purchase_date || '',
      purchase_cost: asset.purchase_cost?.toString() || '',
      image_version: asset.image_version || '',
      hostname: asset.hostname || '',
      notes: asset.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const filteredAssets = assets.filter((asset) => {
    // If bulk scan filter is active, use exact matching on asset tags
    let matchesSearch = true;
    if (bulkScannedTags.length > 0) {
      matchesSearch = bulkScannedTags.some(tag => 
        asset.asset_tag.toLowerCase() === tag.toLowerCase() ||
        asset.serial_number?.toLowerCase() === tag.toLowerCase()
      );
    } else if (searchQuery) {
      matchesSearch =
        asset.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.assigned_agent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.logged_in_user?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesType = typeFilter === 'all' || asset.asset_type === typeFilter;
    
    // Hardware info filter
    let matchesHardwareInfo = true;
    if (hardwareInfoFilter === 'missing_cpu') {
      matchesHardwareInfo = !asset.cpu;
    } else if (hardwareInfoFilter === 'missing_ram') {
      matchesHardwareInfo = !asset.ram_gb;
    } else if (hardwareInfoFilter === 'missing_any') {
      matchesHardwareInfo = !asset.cpu || !asset.ram_gb || !asset.disk_space_gb;
    } else if (hardwareInfoFilter === 'has_all') {
      matchesHardwareInfo = !!asset.cpu && !!asset.ram_gb && !!asset.disk_space_gb;
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesHardwareInfo;
  });

  const assetTypes = ['Workstation', 'Headset', 'Monitor', 'Thin Client', 'IP Phone', 'UPS', 'Switch', 'Mobile', 'Other'];

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

  const AssetForm = ({ asset, setAsset, onSubmit, isLoading, submitLabel, onScanAssetTag }: {
    asset: typeof newAsset;
    setAsset: React.Dispatch<React.SetStateAction<typeof newAsset>>;
    onSubmit: () => void;
    isLoading: boolean;
    submitLabel: string;
    onScanAssetTag?: () => void;
  }) => (
    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="asset_tag">Asset Tag *</Label>
          <div className="flex gap-2">
            <Input
              id="asset_tag"
              value={asset.asset_tag}
              onChange={(e) => setAsset({ ...asset, asset_tag: e.target.value })}
              placeholder="SZ-WKS-001"
              className="flex-1"
            />
            {onScanAssetTag && (
              <Button type="button" variant="outline" size="icon" onClick={onScanAssetTag} title="Scan barcode">
                <ScanBarcode className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset_type">Type *</Label>
          <Select
            value={asset.asset_type}
            onValueChange={(value) => setAsset({ ...asset, asset_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {assetTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
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
            value={asset.brand}
            onChange={(e) => setAsset({ ...asset, brand: e.target.value })}
            placeholder="Dell"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={asset.model}
            onChange={(e) => setAsset({ ...asset, model: e.target.value })}
            placeholder="OptiPlex 7090"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="serial">Serial Number</Label>
          <Input
            id="serial"
            value={asset.serial_number}
            onChange={(e) => setAsset({ ...asset, serial_number: e.target.value })}
            placeholder="SN12345678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mac_address">MAC Address</Label>
          <Input
            id="mac_address"
            value={asset.mac_address}
            onChange={(e) => setAsset({ ...asset, mac_address: formatMacAddress(e.target.value) })}
            placeholder="AA:BB:CC:DD:EE:FF"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={asset.status}
            onValueChange={(value) => setAsset({ ...asset, status: value })}
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
              <SelectItem value="EOL">End of Life</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hostname">Hostname</Label>
          <Input
            id="hostname"
            value={asset.hostname || ''}
            onChange={(e) => setAsset({ ...asset, hostname: e.target.value })}
            placeholder="PC-OFFICE-001"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="site">Site</Label>
          <Input
            id="site"
            value={asset.site}
            onChange={(e) => setAsset({ ...asset, site: e.target.value })}
            placeholder="ILG Manila"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="floor">Floor</Label>
          <Input
            id="floor"
            value={asset.floor}
            onChange={(e) => setAsset({ ...asset, floor: e.target.value })}
            placeholder="Floor 2"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assigned_agent">Assigned To</Label>
          <Input
            id="assigned_agent"
            value={asset.assigned_agent}
            onChange={(e) => setAsset({ ...asset, assigned_agent: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image_version">Image Version</Label>
          <Input
            id="image_version"
            value={asset.image_version}
            onChange={(e) => setAsset({ ...asset, image_version: e.target.value })}
            placeholder="v2024.01"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
          <Input
            id="warranty_expiry"
            type="date"
            value={asset.warranty_expiry}
            onChange={(e) => setAsset({ ...asset, warranty_expiry: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase_date">Purchase Date</Label>
          <Input
            id="purchase_date"
            type="date"
            value={asset.purchase_date}
            onChange={(e) => setAsset({ ...asset, purchase_date: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="purchase_cost">Purchase Cost ($)</Label>
          <Input
            id="purchase_cost"
            type="number"
            step="0.01"
            value={asset.purchase_cost}
            onChange={(e) => setAsset({ ...asset, purchase_cost: e.target.value })}
            placeholder="1200.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="antivirus_status">Antivirus Status</Label>
          <Select
            value={asset.antivirus_status}
            onValueChange={(value) => setAsset({ ...asset, antivirus_status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Outdated">Outdated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="encryption"
            checked={asset.encryption_status}
            onCheckedChange={(checked) => setAsset({ ...asset, encryption_status: !!checked })}
          />
          <Label htmlFor="encryption" className="text-sm">Encryption Enabled</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="usb_policy"
            checked={asset.usb_policy_applied}
            onCheckedChange={(checked) => setAsset({ ...asset, usb_policy_applied: !!checked })}
          />
          <Label htmlFor="usb_policy" className="text-sm">USB Policy Applied</Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={asset.notes}
          onChange={(e) => setAsset({ ...asset, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => { setIsDialogOpen(false); setIsEditDialogOpen(false); }}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!asset.asset_tag || isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </div>
  );

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setScannerTarget('search');
              setIsScannerOpen(true);
            }}>
              <ScanBarcode className="w-4 h-4 mr-2" />
              Scan
            </Button>
            <Button variant="outline" onClick={() => setIsBulkScannerOpen(true)}>
              <ScanBarcode className="w-4 h-4 mr-2" />
              Bulk Scan
            </Button>
            <Button variant="outline" onClick={syncIntune} disabled={isSyncing}>
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 mr-2" />
              )}
              Sync Intune
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Hardware Asset</DialogTitle>
                </DialogHeader>
                <AssetForm
                  asset={newAsset}
                  setAsset={setNewAsset}
                  onSubmit={() => createAsset.mutate(newAsset)}
                  isLoading={createAsset.isPending}
                  submitLabel="Add Asset"
                  onScanAssetTag={() => {
                    setScannerTarget('newAsset');
                    setIsScannerOpen(true);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Barcode Scanner */}
        <BarcodeScanner
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          onScan={(result) => {
            if (scannerTarget === 'newAsset') {
              // Parse barcode data and auto-fill fields
              const parsed = parseBarcodeData(result);
              setNewAsset((prev) => ({
                ...prev,
                asset_tag: parsed.asset_tag || prev.asset_tag || result,
                brand: parsed.brand || prev.brand,
                model: parsed.model || prev.model,
                serial_number: parsed.serial_number || prev.serial_number,
                mac_address: parsed.mac_address || prev.mac_address,
                status: parsed.status || prev.status,
                asset_type: parsed.asset_type || prev.asset_type,
                hostname: parsed.hostname || prev.hostname || '',
              }));
              toast.success('Barcode parsed - fields auto-filled');
            } else if (scannerTarget === 'editAsset') {
              // Parse barcode data and auto-fill fields
              const parsed = parseBarcodeData(result);
              setEditAsset((prev) => ({
                ...prev,
                asset_tag: parsed.asset_tag || prev.asset_tag || result,
                brand: parsed.brand || prev.brand,
                model: parsed.model || prev.model,
                serial_number: parsed.serial_number || prev.serial_number,
                mac_address: parsed.mac_address || prev.mac_address,
                status: parsed.status || prev.status,
                asset_type: parsed.asset_type || prev.asset_type,
                hostname: parsed.hostname || prev.hostname || '',
              }));
              toast.success('Barcode parsed - fields auto-filled');
            } else {
              setSearchQuery(result);
            }
            setIsScannerOpen(false);
          }}
        />

        {/* Bulk Barcode Scanner */}
        <BarcodeScanner
          open={isBulkScannerOpen}
          onOpenChange={setIsBulkScannerOpen}
          onScan={() => {}}
          bulkMode={true}
          onBulkScan={(results) => {
            setBulkScannedTags(results);
            // Join all scanned tags for search
            setSearchQuery(results.join(' '));
          }}
        />

        {/* Bulk Scan Filter Badge */}
        {bulkScannedTags.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium">Bulk scan filter active:</span>
            <Badge variant="secondary">{bulkScannedTags.length} assets</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBulkScannedTags([]);
                setSearchQuery('');
              }}
              className="ml-auto h-7"
            >
              Clear filter
            </Button>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Hardware Asset</DialogTitle>
            </DialogHeader>
            <AssetForm
              asset={editAsset}
              setAsset={setEditAsset}
              onSubmit={() => selectedAsset && updateAsset.mutate({ id: selectedAsset.id, data: editAsset })}
              isLoading={updateAsset.isPending}
              submitLabel="Save Changes"
              onScanAssetTag={() => {
                setScannerTarget('editAsset');
                setIsScannerOpen(true);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by asset tag, brand, model, serial, or agent..."
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
              <SelectItem value="EOL">End of Life</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {assetTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={hardwareInfoFilter} onValueChange={setHardwareInfoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Hardware Info" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="missing_any">Missing Any Info</SelectItem>
              <SelectItem value="missing_cpu">Missing CPU</SelectItem>
              <SelectItem value="missing_ram">Missing RAM</SelectItem>
              <SelectItem value="has_all">Complete Info</SelectItem>
            </SelectContent>
          </Select>
          <TableCardToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ['hardware_assets'] })}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Assets Display */}
        {isLoading ? (
          <div className="glass-card p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            No hardware assets found. Add your first asset or sync from Intune.
          </div>
        ) : viewMode === "card" ? (
          /* Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const specs = asset.specs as Record<string, unknown> | null;
              const freeDiskGb = specs?.free_disk_gb as number | undefined;
              const cpuFromSpecs = formatCpu({
                rawCpu: specs?.cpu,
                processorArchitecture: specs?.processor_architecture,
                processorCount: specs?.processor_count,
                processorCoreCount: specs?.processor_core_count,
              });
              const cpuDisplay = asset.cpu || cpuFromSpecs || '-';
              const ramFromBytes = bytesToGb(specs?.physical_memory_bytes);
              const ramDisplay = asset.ram_gb
                ? `${asset.ram_gb} GB`
                : ramFromBytes
                  ? `${formatGb(ramFromBytes)} GB`
                  : (specs?.ram as string) || '-';
              const diskType = asset.disk_type || 'SSD';
              const diskSpace = asset.disk_space_gb;
              const diskDisplay = specs?.storage as string;
              const primaryUserDisplay = asset.logged_in_user || asset.assigned_agent || '-';
              const hostnameDisplay = asset.hostname || (specs?.hostname as string) || '-';

              return (
                <DataCard key={asset.id}>
                  <DataCardHeader
                    title={<span className="font-mono">{asset.asset_tag}</span>}
                    subtitle={hostnameDisplay}
                    badge={
                      <span className={`status-badge text-[10px] ${statusColors[asset.status || 'Available'] || 'status-buffer'}`}>
                        {asset.status}
                      </span>
                    }
                    icon={getAssetIcon(asset.asset_type)}
                    actions={
                      <div className="flex gap-1">
                        {specs?.synced_via === 'device-agent' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary"
                            onClick={() => navigate(`/device-registrations?search=${encodeURIComponent(asset.asset_tag)}`)}
                            title="View device registration"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditClick(asset)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this asset?')) {
                              deleteAsset.mutate(asset.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    }
                  />
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <DataCardField label="Type" value={asset.asset_type} />
                    <DataCardField label="Brand/Model" value={`${asset.brand || ''} ${asset.model || ''}`.trim() || '-'} />
                    <DataCardField label="Serial" value={<span className="font-mono text-xs">{asset.serial_number || '-'}</span>} />
                    <DataCardField label="CPU" value={<span className="text-xs truncate max-w-[150px] block">{cpuDisplay}</span>} />
                    <DataCardField label="RAM" value={ramDisplay} />
                    <DataCardField 
                      label="Disk" 
                      value={diskSpace 
                        ? `${diskType} ${diskSpace}GB${freeDiskGb !== undefined ? ` (Free: ${freeDiskGb}GB)` : ''}`
                        : diskDisplay || '-'
                      } 
                    />
                    <DataCardField label="Primary User" value={primaryUserDisplay} />
                    <DataCardField 
                      label="Last Login" 
                      value={asset.last_user_login 
                        ? new Date(asset.last_user_login).toLocaleDateString()
                        : '-'
                      } 
                    />
                  </div>
                  <div className="flex gap-1 pt-2 border-t border-border/50">
                    {asset.antivirus_status === 'Active' && (
                      <Badge variant="outline" className="text-success border-success/30 text-[10px]">
                        <Shield className="w-3 h-3 mr-1" /> AV
                      </Badge>
                    )}
                    {asset.encryption_status && (
                      <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">
                        <Lock className="w-3 h-3 mr-1" /> ENC
                      </Badge>
                    )}
                    {asset.usb_policy_applied && (
                      <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">
                        <Usb className="w-3 h-3 mr-1" /> USB
                      </Badge>
                    )}
                  </div>
                </DataCard>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="glass-card overflow-hidden">
            <Table stickyFirstColumn>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead sticky className="table-header bg-secondary/95 backdrop-blur-sm">Asset Tag</TableHead>
                  <TableHead className="table-header">Hostname</TableHead>
                  <TableHead className="table-header hidden sm:table-cell">Type</TableHead>
                  <TableHead className="table-header hidden md:table-cell">Brand/Model</TableHead>
                  <TableHead className="table-header hidden lg:table-cell">Serial</TableHead>
                  <TableHead className="table-header hidden lg:table-cell">CPU</TableHead>
                  <TableHead className="table-header hidden md:table-cell">RAM</TableHead>
                  <TableHead className="table-header hidden lg:table-cell">Disk</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header hidden xl:table-cell">Primary User</TableHead>
                  <TableHead className="table-header hidden xl:table-cell">Last Login</TableHead>
                  <TableHead className="table-header hidden xl:table-cell">Profiles</TableHead>
                  <TableHead className="table-header hidden sm:table-cell">Security</TableHead>
                  <TableHead className="table-header w-[80px] md:w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => {
                  const specs = asset.specs as Record<string, unknown> | null;
                  const freeDiskGb = specs?.free_disk_gb as number | undefined;
                  const cpuFromSpecs = formatCpu({
                    rawCpu: specs?.cpu,
                    processorArchitecture: specs?.processor_architecture,
                    processorCount: specs?.processor_count,
                    processorCoreCount: specs?.processor_core_count,
                  });
                  const cpuDisplay = asset.cpu || cpuFromSpecs || '-';
                  const ramFromBytes = bytesToGb(specs?.physical_memory_bytes);
                  const ramDisplay = asset.ram_gb
                    ? `${asset.ram_gb} GB`
                    : ramFromBytes
                      ? `${formatGb(ramFromBytes)} GB`
                      : (specs?.ram as string) || '-';
                  const diskType = asset.disk_type || 'SSD';
                  const diskSpace = asset.disk_space_gb;
                  const diskDisplay = specs?.storage as string;
                  const primaryUserDisplay = asset.logged_in_user || asset.assigned_agent || '-';
                  const hostnameDisplay = asset.hostname || (specs?.hostname as string) || '-';
                  
                  return (
                    <TableRow key={asset.id} className="hover:bg-muted/30 border-border/30">
                      <TableCell sticky className="font-mono text-xs md:text-sm font-medium bg-card/95 backdrop-blur-sm">{asset.asset_tag}</TableCell>
                      <TableCell className="text-xs md:text-sm">
                        {hostnameDisplay}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          {getAssetIcon(asset.asset_type)}
                          <span className="hidden md:inline">{asset.asset_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {asset.brand} {asset.model}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground hidden lg:table-cell">
                        {asset.serial_number || '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate hidden lg:table-cell" title={cpuDisplay}>
                        {cpuDisplay}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm hidden md:table-cell">
                        {ramDisplay}
                      </TableCell>
                      <TableCell className="text-xs hidden lg:table-cell">
                        {diskSpace 
                          ? (
                            <div>
                              <span>{diskType} {diskSpace}GB</span>
                              {freeDiskGb !== undefined && (
                                <span className="text-muted-foreground block">
                                  Free: {freeDiskGb}GB
                                </span>
                              )}
                            </div>
                          )
                          : diskDisplay 
                            ? diskDisplay 
                            : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`status-badge text-[10px] md:text-xs ${statusColors[asset.status || 'Available'] || 'status-buffer'}`}>
                          {asset.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm max-w-[150px] truncate hidden xl:table-cell" title={primaryUserDisplay}>
                        {primaryUserDisplay}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden xl:table-cell">
                        {asset.last_user_login 
                          ? new Date(asset.last_user_login).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        {asset.user_profile_count ?? '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-1">
                          {asset.antivirus_status === 'Active' && (
                            <Badge variant="outline" className="text-success border-success/30 text-[10px] md:text-xs">
                              AV
                            </Badge>
                          )}
                          {asset.encryption_status && (
                            <Badge variant="outline" className="text-primary border-primary/30 text-[10px] md:text-xs">
                              ENC
                            </Badge>
                          )}
                          {asset.usb_policy_applied && (
                            <Badge variant="outline" className="text-warning border-warning/30 text-[10px] md:text-xs hidden md:inline-flex">
                              USB
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 md:gap-1">
                          {specs?.synced_via === 'device-agent' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 md:h-8 md:w-8 text-primary hover:text-primary"
                              onClick={() => navigate(`/device-registrations?search=${encodeURIComponent(asset.asset_tag)}`)}
                              title="View device registration"
                            >
                              <ExternalLink className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8"
                            onClick={() => handleEditClick(asset)}
                          >
                            <Edit className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this asset?')) {
                                deleteAsset.mutate(asset.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {['Available', 'In Use', 'For Repair', 'Down', 'Reserved', 'EOL'].map((status) => {
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
