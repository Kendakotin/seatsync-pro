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
import { Plus, Search, Shield, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type SecurityIncident = {
  id: string;
  incident_type: string;
  severity: string | null;
  description: string | null;
  status: string | null;
  reported_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
};

export default function Security() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newIncident, setNewIncident] = useState({
    incident_type: '',
    severity: 'Medium',
    description: '',
    reported_by: '',
    assigned_to: '',
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['security_incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('reported_at', { ascending: false });
      if (error) throw error;
      return data as SecurityIncident[];
    },
  });

  const createIncident = useMutation({
    mutationFn: async (incident: typeof newIncident) => {
      const { error } = await supabase.from('security_incidents').insert([incident]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security_incidents'] });
      setIsDialogOpen(false);
      setNewIncident({
        incident_type: '',
        severity: 'Medium',
        description: '',
        reported_by: '',
        assigned_to: '',
      });
      toast.success('Security incident reported');
    },
    onError: (error) => {
      toast.error(getSafeErrorMessage(error, 'Reporting incident'));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'Resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('security_incidents').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security_incidents'] });
      toast.success('Status updated');
    },
  });

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.incident_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const criticalCount = incidents.filter((i) => i.severity === 'Critical' && i.status === 'Open').length;
  const highCount = incidents.filter((i) => i.severity === 'High' && i.status === 'Open').length;
  const openCount = incidents.filter((i) => i.status === 'Open').length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved').length;

  const getSeverityIcon = (severity: string | null) => {
    switch (severity) {
      case 'Critical':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'High':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'Medium':
        return <Eye className="w-4 h-4 text-blue-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const incidentTypes = [
    'Unauthorized Access',
    'Data Breach',
    'Malware Detection',
    'Phishing Attempt',
    'Policy Violation',
    'USB Violation',
    'Screen Recording Disabled',
    'Encryption Failure',
    'DLP Alert',
    'Other',
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Security & Risk</h1>
            <p className="text-muted-foreground mt-1">
              Security incidents, patch levels, encryption status, and compliance
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" variant="destructive">
                <Plus className="w-4 h-4" />
                Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Report Security Incident</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="incident_type">Incident Type *</Label>
                    <Select
                      value={newIncident.incident_type}
                      onValueChange={(value) => setNewIncident({ ...newIncident, incident_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={newIncident.severity}
                      onValueChange={(value) => setNewIncident({ ...newIncident, severity: value })}
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
                    value={newIncident.description}
                    onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    placeholder="Describe the security incident..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reported_by">Reported By</Label>
                    <Input
                      id="reported_by"
                      value={newIncident.reported_by}
                      onChange={(e) => setNewIncident({ ...newIncident, reported_by: e.target.value })}
                      placeholder="Reporter name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assigned To</Label>
                    <Input
                      id="assigned_to"
                      value={newIncident.assigned_to}
                      onChange={(e) => setNewIncident({ ...newIncident, assigned_to: e.target.value })}
                      placeholder="Assignee name"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => createIncident.mutate(newIncident)}
                  disabled={!newIncident.incident_type || createIncident.isPending}
                >
                  {createIncident.isPending ? 'Reporting...' : 'Report Incident'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 border-l-4 border-l-destructive">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{criticalCount}</div>
                <div className="text-sm text-muted-foreground">Critical Open</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 border-l-4 border-l-warning">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{highCount}</div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{openCount}</div>
                <div className="text-sm text-muted-foreground">Total Open</div>
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
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Investigating">Investigating</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Incidents Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="table-header">Type</TableHead>
                <TableHead className="table-header">Severity</TableHead>
                <TableHead className="table-header">Description</TableHead>
                <TableHead className="table-header">Reported By</TableHead>
                <TableHead className="table-header">Date</TableHead>
                <TableHead className="table-header">Status</TableHead>
                <TableHead className="table-header">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading incidents...
                  </TableCell>
                </TableRow>
              ) : filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No security incidents found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((incident) => (
                  <TableRow key={incident.id} className="hover:bg-muted/30 border-border/30">
                    <TableCell className="font-medium">{incident.incident_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(incident.severity)}
                        <span
                          className={`status-badge ${
                            incident.severity === 'Critical'
                              ? 'status-down'
                              : incident.severity === 'High'
                              ? 'status-repair'
                              : incident.severity === 'Medium'
                              ? 'status-buffer'
                              : 'bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          {incident.severity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {incident.description || '-'}
                    </TableCell>
                    <TableCell>{incident.reported_by || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {incident.reported_at ? format(new Date(incident.reported_at), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`status-badge ${
                          incident.status === 'Open'
                            ? 'status-down'
                            : incident.status === 'Investigating'
                            ? 'status-repair'
                            : 'status-active'
                        }`}
                      >
                        {incident.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={incident.status || 'Open'}
                        onValueChange={(value) => updateStatus.mutate({ id: incident.id, status: value })}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Investigating">Investigating</SelectItem>
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
