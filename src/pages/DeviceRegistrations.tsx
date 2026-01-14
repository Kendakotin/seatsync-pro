import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Search, Download, RefreshCw, Copy } from "lucide-react";
import { format } from "date-fns";

interface RegisteredDevice {
  id: string;
  device_id: string;
  hostname: string | null;
  registration_key: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  last_sync_at: string | null;
  sync_count: number;
  notes: string | null;
  created_at: string;
}

const DeviceRegistrations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["registered-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registered_devices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RegisteredDevice[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("registered_devices")
        .update({
          status,
          approved_at: status === "approved" ? new Date().toISOString() : null,
          approved_by: status === "approved" ? "admin" : null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registered-devices"] });
      toast.success("Device status updated");
    },
    onError: (error) => {
      toast.error("Failed to update device: " + error.message);
    },
  });

  const filteredDevices = devices?.filter((device) => {
    const matchesSearch =
      device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.registration_key.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || device.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "revoked":
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadScript = () => {
    window.open("/scripts/DeviceAgent.ps1", "_blank");
  };

  const stats = {
    total: devices?.length || 0,
    pending: devices?.filter((d) => d.status === "pending").length || 0,
    approved: devices?.filter((d) => d.status === "approved").length || 0,
    rejected: devices?.filter((d) => d.status === "rejected").length || 0,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Device Registrations</h1>
            <p className="text-muted-foreground mt-1">
              Manage agent installations and approve device registrations
            </p>
          </div>
          <Button onClick={downloadScript} className="gap-2">
            <Download className="w-4 h-4" />
            Download Agent Script
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Installation Instructions</CardTitle>
            <CardDescription>Deploy the PowerShell agent to collect device inventory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Download the DeviceAgent.ps1 script using the button above</li>
              <li>Run as Administrator: <code className="bg-muted px-2 py-1 rounded">.\DeviceAgent.ps1 -Install</code></li>
              <li>The device will appear in the list below with "Pending" status</li>
              <li>Approve the device to allow inventory sync</li>
              <li>Inventory will sync automatically every 6 hours</li>
            </ol>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by device ID, hostname, or key..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 bg-background"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revoked">Revoked</option>
              </select>
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["registered-devices"] })}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
            ) : filteredDevices?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No devices found. Deploy the agent script to register devices.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Registration Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead>Sync Count</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices?.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-mono text-sm">{device.device_id}</TableCell>
                        <TableCell>{device.hostname || "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {device.registration_key.substring(0, 14)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(device.registration_key)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(device.status)}</TableCell>
                        <TableCell>
                          {device.last_sync_at
                            ? format(new Date(device.last_sync_at), "MMM d, HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell>{device.sync_count}</TableCell>
                        <TableCell>
                          {format(new Date(device.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {device.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => updateStatus.mutate({ id: device.id, status: "approved" })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => updateStatus.mutate({ id: device.id, status: "rejected" })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {device.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus.mutate({ id: device.id, status: "revoked" })}
                              >
                                Revoke
                              </Button>
                            )}
                            {(device.status === "rejected" || device.status === "revoked") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus.mutate({ id: device.id, status: "approved" })}
                              >
                                Re-approve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DeviceRegistrations;
