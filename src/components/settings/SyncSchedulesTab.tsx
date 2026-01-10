import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Settings,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface SyncSchedule {
  id: string;
  name: string;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  entity_type: string;
  action: string;
  performed_by: string | null;
  performed_at: string;
  details: {
    devices_fetched?: number;
    devices_synced?: number;
    errors?: number;
    timestamp?: string;
  };
}

const cronPresets = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 2 hours', value: '0 */2 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Weekly (Sunday midnight)', value: '0 0 * * 0' },
];

function getCronLabel(cronExpression: string): string {
  const preset = cronPresets.find((p) => p.value === cronExpression);
  return preset?.label || cronExpression;
}

export function SyncSchedulesTab() {
  const queryClient = useQueryClient();
  const [editingSchedule, setEditingSchedule] = useState<SyncSchedule | null>(null);
  const [selectedCron, setSelectedCron] = useState('');
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Fetch sync schedules
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['sync-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_schedules')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as SyncSchedule[];
    },
  });

  // Fetch sync history from audit logs
  const { data: syncHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['sync-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'intune_sync')
        .order('performed_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as SyncLog[];
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SyncSchedule>;
    }) => {
      const { error } = await supabase
        .from('sync_schedules')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-schedules'] });
      toast.success('Schedule updated successfully');
      setEditingSchedule(null);
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });

  // Toggle schedule enabled/disabled
  const toggleSchedule = async (schedule: SyncSchedule) => {
    updateScheduleMutation.mutate({
      id: schedule.id,
      updates: { enabled: !schedule.enabled },
    });
  };

  // Manual sync trigger
  const triggerManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('intune-sync');
      if (error) throw error;
      
      toast.success(
        `Sync completed: ${data.devices_synced} devices synced, ${data.errors} errors`
      );
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['sync-schedules'] });
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Save schedule changes
  const saveScheduleChanges = () => {
    if (!editingSchedule || !selectedCron) return;
    updateScheduleMutation.mutate({
      id: editingSchedule.id,
      updates: { cron_expression: selectedCron },
    });
  };

  return (
    <div className="space-y-6">
      {/* Sync Schedules Card */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Sync Schedules
            </CardTitle>
            <CardDescription>
              Configure automatic synchronization with external systems
            </CardDescription>
          </div>
          <Button
            onClick={triggerManualSync}
            disabled={isManualSyncing}
            className="gap-2"
          >
            {isManualSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Sync Now
          </Button>
        </CardHeader>
        <CardContent>
          {schedulesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules?.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                        {schedule.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {getCronLabel(schedule.cron_expression)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {schedule.last_run_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(schedule.last_run_at), {
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={() => toggleSchedule(schedule)}
                        />
                        <Badge
                          variant={schedule.enabled ? 'default' : 'secondary'}
                          className={schedule.enabled ? 'bg-success' : ''}
                        >
                          {schedule.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSchedule(schedule);
                              setSelectedCron(schedule.cron_expression);
                            }}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Sync Schedule</DialogTitle>
                            <DialogDescription>
                              Configure the synchronization frequency
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Schedule Name</Label>
                              <Input
                                value={
                                  editingSchedule?.name
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (l) => l.toUpperCase()) || ''
                                }
                                disabled
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Sync Frequency</Label>
                              <Select
                                value={selectedCron}
                                onValueChange={setSelectedCron}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cronPresets.map((preset) => (
                                    <SelectItem key={preset.value} value={preset.value}>
                                      {preset.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Custom Cron Expression</Label>
                              <Input
                                value={selectedCron}
                                onChange={(e) => setSelectedCron(e.target.value)}
                                placeholder="0 */6 * * *"
                                className="font-mono"
                              />
                              <p className="text-xs text-muted-foreground">
                                Format: minute hour day month weekday
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={saveScheduleChanges}
                              disabled={updateScheduleMutation.isPending}
                            >
                              {updateScheduleMutation.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              )}
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {schedules?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No sync schedules configured
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sync History Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Sync History
          </CardTitle>
          <CardDescription>Recent synchronization activity and results</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Devices Fetched</TableHead>
                  <TableHead>Devices Synced</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory?.map((log) => {
                  const details = log.details || {};
                  const hasErrors = (details.errors || 0) > 0;
                  const isSuccess = details.devices_synced !== undefined && !hasErrors;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {format(new Date(log.performed_at), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.performed_at), 'h:mm:ss a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {details.devices_fetched ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-success">
                          {details.devices_synced ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono ${
                            hasErrors ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          {details.errors ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isSuccess ? (
                          <div className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">Success</span>
                          </div>
                        ) : hasErrors ? (
                          <div className="flex items-center gap-1 text-warning">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Partial</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm">Unknown</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {syncHistory?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sync history available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
