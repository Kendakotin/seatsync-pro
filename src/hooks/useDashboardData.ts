import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Account = Tables<'accounts'>;
type Seat = Tables<'seats'>;
type NewHire = Tables<'new_hires'>;
type SecurityIncident = Tables<'security_incidents'>;
type MaintenanceRecord = Tables<'maintenance_records'>;
type SoftwareLicense = Tables<'software_licenses'>;
type HardwareAsset = Tables<'hardware_assets'>;

export interface DashboardKPIs {
  totalSeats: number;
  activeSeats: number;
  bufferSeats: number;
  downSeats: number;
  reservedSeats: number;
  repairSeats: number;
  utilizationRate: number;
  complianceRate: number;
  assetReadinessRate: number;
  avgDowntimePer100Seats: number;
  costPerSeat: number;
  licenseComplianceRate: number;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  seatId?: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('client_name');
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useSeats() {
  return useQuery({
    queryKey: ['seats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seats')
        .select('*, accounts(client_name, program_name)')
        .order('seat_id');
      if (error) throw error;
      return data;
    },
  });
}

export function useNewHires() {
  return useQuery({
    queryKey: ['new_hires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('new_hires')
        .select('*, accounts(client_name, program_name)')
        .order('hire_date');
      if (error) throw error;
      return data;
    },
  });
}

export function useSecurityIncidents() {
  return useQuery({
    queryKey: ['security_incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_incidents')
        .select('*')
        .order('reported_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as SecurityIncident[];
    },
  });
}

export function useMaintenanceRecords() {
  return useQuery({
    queryKey: ['maintenance_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .order('reported_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as MaintenanceRecord[];
    },
  });
}

export function useSoftwareLicenses() {
  return useQuery({
    queryKey: ['software_licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('software_licenses')
        .select('*, accounts(client_name)')
        .order('software_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useHardwareAssets() {
  return useQuery({
    queryKey: ['hardware_assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hardware_assets')
        .select('*')
        .order('asset_tag');
      if (error) throw error;
      return data as HardwareAsset[];
    },
  });
}

export function useDashboardKPIs() {
  const { data: seats } = useSeats();
  const { data: accounts } = useAccounts();
  const { data: licenses } = useSoftwareLicenses();
  const { data: assets } = useHardwareAssets();
  const { data: maintenance } = useMaintenanceRecords();

  const kpis: DashboardKPIs = {
    totalSeats: seats?.length || 0,
    activeSeats: seats?.filter(s => s.status === 'Active').length || 0,
    bufferSeats: seats?.filter(s => s.status === 'Buffer').length || 0,
    downSeats: seats?.filter(s => s.status === 'Down').length || 0,
    reservedSeats: seats?.filter(s => s.status === 'Reserved').length || 0,
    repairSeats: seats?.filter(s => s.status === 'Repair').length || 0,
    utilizationRate: seats?.length ? 
      Math.round((seats.filter(s => s.status === 'Active').length / seats.length) * 1000) / 10 : 0,
    complianceRate: accounts?.length ? 
      Math.round(accounts.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / accounts.length * 10) / 10 : 0,
    assetReadinessRate: assets?.length ?
      Math.round((assets.filter(a => a.status === 'In Use' || a.status === 'Available').length / assets.length) * 1000) / 10 : 0,
    avgDowntimePer100Seats: maintenance?.length ?
      Math.round((maintenance.reduce((sum, m) => sum + (m.downtime_minutes || 0), 0) / (seats?.length || 1) * 100) / 60 * 10) / 10 : 0,
    costPerSeat: 245, // This would typically come from a settings table
    licenseComplianceRate: licenses?.length ?
      Math.round((licenses.filter(l => l.compliance_status === 'Compliant').length / licenses.length) * 1000) / 10 : 0,
  };

  return kpis;
}

export function useAlerts() {
  const { data: incidents } = useSecurityIncidents();
  const { data: maintenance } = useMaintenanceRecords();
  const { data: licenses } = useSoftwareLicenses();

  const alerts: Alert[] = [];

  // Add security incidents as alerts
  incidents?.forEach(incident => {
    const severity = incident.severity?.toLowerCase();
    alerts.push({
      id: `incident-${incident.id}`,
      type: severity === 'critical' || severity === 'high' ? 'critical' : severity === 'medium' ? 'warning' : 'info',
      title: incident.incident_type || 'Security Incident',
      description: incident.description || '',
      timestamp: formatTimestamp(incident.reported_at),
    });
  });

  // Add maintenance issues as alerts
  maintenance?.filter(m => m.status !== 'Resolved').forEach(record => {
    alerts.push({
      id: `maintenance-${record.id}`,
      type: record.priority === 'High' ? 'critical' : record.priority === 'Medium' ? 'warning' : 'info',
      title: record.issue_type || 'Maintenance Issue',
      description: record.description || '',
      timestamp: formatTimestamp(record.reported_at),
    });
  });

  // Add license warnings
  licenses?.filter(l => l.compliance_status !== 'Compliant').forEach(license => {
    alerts.push({
      id: `license-${license.id}`,
      type: license.compliance_status === 'Non-Compliant' ? 'critical' : 'warning',
      title: `License: ${license.software_name}`,
      description: `${license.used_seats}/${license.total_seats} seats used - ${license.compliance_status}`,
      timestamp: 'License Alert',
    });
  });

  return alerts.slice(0, 10);
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Real-time subscription hook for all dashboard data
export function useRealtimeDashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to seats changes
    const seatsChannel = supabase
      .channel('seats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, () => {
        queryClient.invalidateQueries({ queryKey: ['seats'] });
      })
      .subscribe();

    // Subscribe to accounts changes
    const accountsChannel = supabase
      .channel('accounts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
      })
      .subscribe();

    // Subscribe to new_hires changes
    const newHiresChannel = supabase
      .channel('new-hires-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'new_hires' }, () => {
        queryClient.invalidateQueries({ queryKey: ['new_hires'] });
      })
      .subscribe();

    // Subscribe to security_incidents changes
    const incidentsChannel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_incidents' }, () => {
        queryClient.invalidateQueries({ queryKey: ['security_incidents'] });
      })
      .subscribe();

    // Subscribe to maintenance_records changes
    const maintenanceChannel = supabase
      .channel('maintenance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_records' }, () => {
        queryClient.invalidateQueries({ queryKey: ['maintenance_records'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(seatsChannel);
      supabase.removeChannel(accountsChannel);
      supabase.removeChannel(newHiresChannel);
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(maintenanceChannel);
    };
  }, [queryClient]);
}
