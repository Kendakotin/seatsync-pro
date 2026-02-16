import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SyncSchedulesTab } from '@/components/settings/SyncSchedulesTab';
import { DepartmentMappingsTab } from '@/components/settings/DepartmentMappingsTab';
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Shield,
  Database,
  Users,
  Save,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [orgSettings, setOrgSettings] = useState({
    organization_name: 'SZ IT Assets',
    senior_custodian: 'Marjone Yecla',
    default_site: 'Main Building',
    timezone: 'Asia/Manila',
  });

  const [notifications, setNotifications] = useState({
    email_alerts: true,
    low_buffer_warning: true,
    license_expiry_warning: true,
    security_alerts: true,
    maintenance_reminders: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    enforce_encryption: true,
    usb_policy_default: true,
    require_antivirus: true,
    session_timeout: 30,
  });

  const handleSaveOrg = () => {
    toast.success('Organization settings saved');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification settings saved');
  };

  const handleSaveSecurity = () => {
    toast.success('Security settings saved');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            System configuration, role-based access, and integrations
          </p>
        </div>

        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="w-4 h-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Database className="w-4 h-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync Schedules
            </TabsTrigger>
            <TabsTrigger value="dept-mappings" className="gap-2">
              <GitBranch className="w-4 h-4" />
              Dept Mappings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Configure your organization's basic information and defaults
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="org_name">Organization Name</Label>
                    <Input
                      id="org_name"
                      value={orgSettings.organization_name}
                      onChange={(e) =>
                        setOrgSettings({ ...orgSettings, organization_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custodian">Senior IT Custodian</Label>
                    <Input
                      id="custodian"
                      value={orgSettings.senior_custodian}
                      onChange={(e) =>
                        setOrgSettings({ ...orgSettings, senior_custodian: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_site">Default Site</Label>
                    <Input
                      id="default_site"
                      value={orgSettings.default_site}
                      onChange={(e) =>
                        setOrgSettings({ ...orgSettings, default_site: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={orgSettings.timezone}
                      onChange={(e) => setOrgSettings({ ...orgSettings, timezone: e.target.value })}
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button onClick={handleSaveOrg} className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure when and how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via email
                      </p>
                    </div>
                    <Switch
                      checked={notifications.email_alerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, email_alerts: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Low Buffer Warning</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when buffer seats fall below threshold
                      </p>
                    </div>
                    <Switch
                      checked={notifications.low_buffer_warning}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, low_buffer_warning: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>License Expiry Warning</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert 30 days before license expiration
                      </p>
                    </div>
                    <Switch
                      checked={notifications.license_expiry_warning}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, license_expiry_warning: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Immediate notification for security incidents
                      </p>
                    </div>
                    <Switch
                      checked={notifications.security_alerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, security_alerts: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Reminders for scheduled maintenance
                      </p>
                    </div>
                    <Switch
                      checked={notifications.maintenance_reminders}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, maintenance_reminders: checked })
                      }
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications} className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Security Policies</CardTitle>
                <CardDescription>Configure default security settings for assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enforce Encryption</Label>
                      <p className="text-sm text-muted-foreground">
                        Require disk encryption on all workstations
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.enforce_encryption}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({ ...securitySettings, enforce_encryption: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>USB Policy Default</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable USB restrictions by default
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.usb_policy_default}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({ ...securitySettings, usb_policy_default: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Antivirus</Label>
                      <p className="text-sm text-muted-foreground">
                        Flag assets without active antivirus
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.require_antivirus}
                      onCheckedChange={(checked) =>
                        setSecuritySettings({ ...securitySettings, require_antivirus: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      className="w-32"
                      value={securitySettings.session_timeout}
                      onChange={(e) =>
                        setSecuritySettings({
                          ...securitySettings,
                          session_timeout: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button onClick={handleSaveSecurity} className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connect with external systems and tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">Active Directory</h4>
                        <p className="text-xs text-muted-foreground">User sync & authentication</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <SettingsIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">SCCM / Intune</h4>
                        <p className="text-xs text-muted-foreground">Device management sync</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-success/20">
                        <Users className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-medium">HRIS System</h4>
                        <p className="text-xs text-muted-foreground">New hire data feed</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>
                  <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-warning/20">
                        <Bell className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-medium">Helpdesk / Ticketing</h4>
                        <p className="text-xs text-muted-foreground">Incident sync</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync">
            <SyncSchedulesTab />
          </TabsContent>

          <TabsContent value="dept-mappings">
            <DepartmentMappingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
