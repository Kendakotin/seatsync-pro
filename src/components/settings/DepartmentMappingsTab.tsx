import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, GitBranch, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { getSafeErrorMessage } from '@/lib/errorHandler';

interface DepartmentMapping {
  id: string;
  department_pattern: string;
  account_id: string;
  created_at: string;
}

interface Account {
  id: string;
  client_name: string;
  program_name: string;
}

export function DepartmentMappingsTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<DepartmentMapping | null>(null);
  const [departmentPattern, setDepartmentPattern] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['department-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_account_mappings')
        .select('*')
        .order('department_pattern');
      if (error) throw error;
      return data as DepartmentMapping[];
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

  const createMapping = useMutation({
    mutationFn: async ({ department_pattern, account_id }: { department_pattern: string; account_id: string }) => {
      const { error } = await supabase
        .from('department_account_mappings')
        .insert({ department_pattern: department_pattern.trim(), account_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-mappings'] });
      resetForm();
      toast.success('Mapping added');
    },
    onError: (error) => toast.error(getSafeErrorMessage(error, 'Adding mapping')),
  });

  const updateMapping = useMutation({
    mutationFn: async ({ id, department_pattern, account_id }: { id: string; department_pattern: string; account_id: string }) => {
      const { error } = await supabase
        .from('department_account_mappings')
        .update({ department_pattern: department_pattern.trim(), account_id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-mappings'] });
      resetForm();
      toast.success('Mapping updated');
    },
    onError: (error) => toast.error(getSafeErrorMessage(error, 'Updating mapping')),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_account_mappings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-mappings'] });
      toast.success('Mapping deleted');
    },
    onError: (error) => toast.error(getSafeErrorMessage(error, 'Deleting mapping')),
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingMapping(null);
    setDepartmentPattern('');
    setSelectedAccountId('');
  };

  const openEdit = (mapping: DepartmentMapping) => {
    setEditingMapping(mapping);
    setDepartmentPattern(mapping.department_pattern);
    setSelectedAccountId(mapping.account_id);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!departmentPattern.trim() || !selectedAccountId) return;
    if (editingMapping) {
      updateMapping.mutate({ id: editingMapping.id, department_pattern: departmentPattern, account_id: selectedAccountId });
    } else {
      createMapping.mutate({ department_pattern: departmentPattern, account_id: selectedAccountId });
    }
  };

  const getAccountLabel = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    return account ? `${account.client_name} — ${account.program_name}` : accountId;
  };

  const isPending = createMapping.isPending || updateMapping.isPending;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Department → Account Mappings
            </CardTitle>
            <CardDescription>
              Map Azure AD department names to accounts for automatic seat assignment during Entra ID sync
            </CardDescription>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingMapping(null);
              setDepartmentPattern('');
              setSelectedAccountId('');
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Mapping
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 mb-4 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Department patterns are matched case-insensitively using substring matching. For example, a pattern of
              <span className="font-mono text-foreground"> "customer support"</span> will match departments containing
              that phrase, like "Customer Support Team" or "customer support - tier 1".
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Pattern</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <span className="font-mono text-sm bg-muted/50 px-2 py-1 rounded">
                        {mapping.department_pattern}
                      </span>
                    </TableCell>
                    <TableCell>{getAccountLabel(mapping.account_id)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(mapping)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMapping.mutate(mapping.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {mappings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No mappings configured. Add a mapping to enable automatic seat assignment during sync.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingMapping ? 'Edit Mapping' : 'Add Department Mapping'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept_pattern">Department Pattern</Label>
              <Input
                id="dept_pattern"
                value={departmentPattern}
                onChange={(e) => setDepartmentPattern(e.target.value)}
                placeholder="e.g. Customer Support"
              />
              <p className="text-xs text-muted-foreground">
                The Azure AD department value to match (case-insensitive substring)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.client_name} — {account.program_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSave} disabled={!departmentPattern.trim() || !selectedAccountId || isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingMapping ? 'Update' : 'Add'} Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
