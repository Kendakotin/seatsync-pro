import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Shield,
  CheckCircle,
  Building2,
  HardDrive,
  Users,
  FileCheck,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  performed_by: string | null;
  performed_at: string | null;
  created_at: string;
};

const reportTemplates = [
  {
    id: 'iso27001',
    name: 'ISO 27001 Compliance',
    description: 'Information security management system compliance report',
    icon: Shield,
    color: 'text-blue-400',
  },
  {
    id: 'soc2',
    name: 'SOC 2 Report',
    description: 'Service Organization Control 2 audit report',
    icon: CheckCircle,
    color: 'text-success',
  },
  {
    id: 'pci-dss',
    name: 'PCI-DSS Compliance',
    description: 'Payment Card Industry Data Security Standard report',
    icon: Shield,
    color: 'text-warning',
  },
  {
    id: 'asset-inventory',
    name: 'Asset Inventory',
    description: 'Complete hardware and software asset list',
    icon: HardDrive,
    color: 'text-primary',
  },
  {
    id: 'seat-compliance',
    name: 'Seat Compliance Matrix',
    description: 'Per-account seat compliance and security status',
    icon: Users,
    color: 'text-purple-400',
  },
  {
    id: 'license-usage',
    name: 'License Usage Report',
    description: 'Software license utilization and compliance',
    icon: FileCheck,
    color: 'text-cyan-400',
  },
];

export default function Reports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['report_stats'],
    queryFn: async () => {
      const [hardware, licenses, accounts, incidents] = await Promise.all([
        supabase.from('hardware_assets').select('id', { count: 'exact' }),
        supabase.from('software_licenses').select('id', { count: 'exact' }),
        supabase.from('accounts').select('id', { count: 'exact' }),
        supabase.from('security_incidents').select('id', { count: 'exact' }),
      ]);
      return {
        hardware: hardware.count || 0,
        licenses: licenses.count || 0,
        accounts: accounts.count || 0,
        incidents: incidents.count || 0,
      };
    },
  });

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performed_by?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const handleGenerateReport = (reportId: string) => {
    // In a real app, this would trigger report generation
    console.log('Generating report:', reportId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit & Reports</h1>
          <p className="text-muted-foreground mt-1">
            One-click reports for ISO 27001, SOC 2, PCI-DSS, and client audits
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <HardDrive className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats?.hardware || 0}</div>
            <div className="text-xs text-muted-foreground">Hardware Assets</div>
          </div>
          <div className="glass-card p-4 text-center">
            <FileCheck className="w-6 h-6 text-success mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats?.licenses || 0}</div>
            <div className="text-xs text-muted-foreground">Licenses</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Building2 className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats?.accounts || 0}</div>
            <div className="text-xs text-muted-foreground">Accounts</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Shield className="w-6 h-6 text-warning mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats?.incidents || 0}</div>
            <div className="text-xs text-muted-foreground">Incidents</div>
          </div>
        </div>

        {/* Report Templates */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTemplates.map((report) => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="glass-card hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Icon className={`w-5 h-5 ${report.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{report.name}</CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">{report.description}</CardDescription>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => handleGenerateReport(report.id)}
                    >
                      <Download className="w-4 h-4" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Audit Logs */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Audit Trail</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="hardware_asset">Hardware</SelectItem>
                <SelectItem value="software_license">License</SelectItem>
                <SelectItem value="account">Account</SelectItem>
                <SelectItem value="seat">Seat</SelectItem>
                <SelectItem value="security_incident">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="table-header">Action</TableHead>
                  <TableHead className="table-header">Entity Type</TableHead>
                  <TableHead className="table-header">Performed By</TableHead>
                  <TableHead className="table-header">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No audit logs found. Actions will be recorded here.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 border-border/30">
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>
                        <span className="status-badge status-buffer">{log.entity_type}</span>
                      </TableCell>
                      <TableCell>{log.performed_by || 'System'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.performed_at
                          ? format(new Date(log.performed_at), 'MMM dd, yyyy HH:mm')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
