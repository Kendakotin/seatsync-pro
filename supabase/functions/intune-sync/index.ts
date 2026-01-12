import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Azure AD / Microsoft Graph configuration
const TENANT_ID = Deno.env.get('AZURE_TENANT_ID');
const CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
const CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ManagedDevice {
  id: string;
  deviceName?: string | null;
  managedDeviceOwnerType?: string | null;
  enrolledDateTime?: string | null;
  lastSyncDateTime?: string | null;
  operatingSystem?: string | null;
  osVersion?: string | null;
  complianceState?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  serialNumber?: string | null;

  // Primary user assignment on the device (NOT a display field)
  userId?: string | null;

  // These can be present but may be empty depending on tenant permissions.
  userDisplayName?: string | null;
  userPrincipalName?: string | null;

  // Hardware (per requested mapping)
  processorArchitecture?: number | string | null;
  processorCount?: number | null;
  processorCoreCount?: number | null;
  physicalMemoryInBytes?: number | null;
  totalStorageSpaceInBytes?: number | null;
  freeStorageSpaceInBytes?: number | null;

  isEncrypted?: boolean | null;
  azureADDeviceId?: string | null;
}

interface GraphUser {
  id: string;
  displayName?: string | null;
  userPrincipalName?: string | null;
}

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function sanitizeUserString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isUuid(trimmed)) return null;
  return trimmed;
}

function bytesToGb(bytes?: number | null): number | null {
  if (!bytes || bytes <= 0) return null;
  return bytes / (1024 ** 3);
}

function roundGb(gb: number): number {
  // Memory is almost always whole GB, disks often have decimals.
  const rounded = Math.round(gb * 10) / 10;
  return Number.isInteger(rounded) ? rounded : rounded;
}

function mapArchitecture(arch: ManagedDevice['processorArchitecture']): string | null {
  // https://learn.microsoft.com/en-us/graph/api/resources/intune-devices-manageddevicearchitecture?view=graph-rest-beta
  if (arch === null || arch === undefined) return null;

  if (typeof arch === 'number') {
    switch (arch) {
      case 0:
        return null;
      case 1:
        return 'x86';
      case 2:
        return 'x64';
      case 3:
        return 'ARM';
      case 4:
        return 'ARM64';
      default:
        return `Arch(${arch})`;
    }
  }

  const s = String(arch).trim();
  if (!s || s.toLowerCase() === 'unknown') return null;
  return s;
}

function formatCpu(device: ManagedDevice): string | null {
  const arch = mapArchitecture(device.processorArchitecture);
  const parts: string[] = [];
  if (arch) parts.push(arch);
  if (device.processorCount && device.processorCount > 0) parts.push(`${device.processorCount} CPU`);
  if (device.processorCoreCount && device.processorCoreCount > 0) parts.push(`${device.processorCoreCount} cores`);
  return parts.length ? parts.join(' · ') : null;
}

async function graphGet<T>(accessToken: string, url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph request failed (${response.status}): ${text}`);
  }

  return await response.json() as T;
}

async function getAccessToken(): Promise<string> {
  console.log('Fetching Microsoft Graph access token...');

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get access token:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  console.log('Successfully obtained access token');
  return data.access_token;
}

async function listManagedDevices(accessToken: string): Promise<ManagedDevice[]> {
  console.log('Fetching devices from Microsoft Intune (managedDevices)...');

  // REQUIRED FIX #1/#2: Use managedDevices and request the exact properties we map into our inventory.
  // IMPORTANT: processorArchitecture is an enum where 0 = unknown (do NOT treat it as falsy and overwrite).
  let url = `${GRAPH_BASE}/deviceManagement/managedDevices?` +
    `$select=id,deviceName,serialNumber,operatingSystem,osVersion,lastSyncDateTime,` +
    `processorArchitecture,processorCount,processorCoreCount,physicalMemoryInBytes,` +
    `totalStorageSpaceInBytes,freeStorageSpaceInBytes,` +
    `userId,userDisplayName,userPrincipalName,` +
    `manufacturer,model,complianceState,isEncrypted,azureADDeviceId,enrolledDateTime,managedDeviceOwnerType`;

  const devices: ManagedDevice[] = [];

  // Handle paging via @odata.nextLink
  // (Not the primary focus of this fix, but avoids silently missing devices.)
  while (url) {
    const data = await graphGet<{ value: ManagedDevice[]; '@odata.nextLink'?: string }>(accessToken, url);
    devices.push(...(data.value || []));
    url = data['@odata.nextLink'] || '';
  }

  console.log(`Fetched ${devices.length} devices from Intune`);
  return devices;
}

async function getManagedDeviceDetail(accessToken: string, id: string): Promise<ManagedDevice> {
  // REQUIRED FIX #1: support /managedDevices/{id}?$expand=users, with safe fallback.
  const select =
    'id,deviceName,serialNumber,operatingSystem,osVersion,lastSyncDateTime,' +
    'processorArchitecture,processorCount,processorCoreCount,physicalMemoryInBytes,' +
    'totalStorageSpaceInBytes,freeStorageSpaceInBytes,' +
    'userId,userDisplayName,userPrincipalName,' +
    'manufacturer,model,complianceState,isEncrypted,azureADDeviceId,enrolledDateTime,managedDeviceOwnerType';

  const withExpand = `${GRAPH_BASE}/deviceManagement/managedDevices/${id}?$select=${select}&$expand=users($select=id,displayName,userPrincipalName)`;

  try {
    return await graphGet<ManagedDevice & { users?: GraphUser[] }>(accessToken, withExpand);
  } catch (e) {
    // Some tenants/API versions don’t support $expand=users on managedDevices.
    // We still comply with the required flow by resolving user details via /users/{id}.
    const withoutExpand = `${GRAPH_BASE}/deviceManagement/managedDevices/${id}?$select=${select}`;
    return await graphGet<ManagedDevice>(accessToken, withoutExpand);
  }
}

async function getUserById(accessToken: string, userId: string): Promise<GraphUser | null> {
  const url = `${GRAPH_BASE}/users/${userId}?$select=id,displayName,userPrincipalName`;

  try {
    const user = await graphGet<GraphUser>(accessToken, url);
    return user;
  } catch (e) {
    // REQUIRED FIX #4 (permissions): Without User.Read.All / Directory.Read.All this can fail.
    // We must not fall back to showing GUIDs; return null and let the UI show "No User Logged In".
    console.warn(`Failed to resolve user ${userId}:`, (e as Error).message);
    return null;
  }
}

async function syncDevicesToDatabase(
  devices: ManagedDevice[],
  accessToken: string,
  supabase: any,
): Promise<{ synced: number; errors: number }> {
  console.log(`Syncing ${devices.length} devices to database...`);

  let synced = 0;
  let errors = 0;

  const userCache = new Map<string, GraphUser | null>();

  for (const device of devices) {
    try {
      // Some tenants return incomplete hardware fields in the list call (e.g., memory=0).
      // If key fields are missing/empty, request per-device detail.
      const needsDetail =
        device.physicalMemoryInBytes === null ||
        device.physicalMemoryInBytes === undefined ||
        device.physicalMemoryInBytes === 0 ||
        device.processorArchitecture === null ||
        device.processorArchitecture === undefined ||
        device.totalStorageSpaceInBytes === null ||
        device.totalStorageSpaceInBytes === undefined;

      const detail = needsDetail ? await getManagedDeviceDetail(accessToken, device.id) : device;

      // REQUIRED FIX #3: resolve managedDevices.userId -> /users/{userId} and display as Name + UPN.
      let userDisplayName: string | null = null;
      let userPrincipalName: string | null = null;

      const resolvedUserId = sanitizeUserString(detail.userId);
      if (resolvedUserId) {
        if (!userCache.has(resolvedUserId)) {
          userCache.set(resolvedUserId, await getUserById(accessToken, resolvedUserId));
        }
        const user = userCache.get(resolvedUserId);
        userDisplayName = sanitizeUserString(user?.displayName) || null;
        userPrincipalName = sanitizeUserString(user?.userPrincipalName) || null;
      }

      // Fallbacks (still never show GUIDs)
      userDisplayName = userDisplayName || sanitizeUserString(detail.userDisplayName);
      userPrincipalName = userPrincipalName || sanitizeUserString(detail.userPrincipalName);

      // REQUIRED FIX #2: bytes -> GB
      const ramGb = bytesToGb(detail.physicalMemoryInBytes);
      const diskGb = bytesToGb(detail.totalStorageSpaceInBytes);
      const freeDiskGb = bytesToGb(detail.freeStorageSpaceInBytes);

      const cpuFormatted = formatCpu(detail);

      const assetData = {
        asset_tag: `INTUNE-${detail.id.substring(0, 8).toUpperCase()}`,
        asset_type: detail.operatingSystem?.toLowerCase().includes('windows')
          ? 'Workstation'
          : detail.operatingSystem?.toLowerCase().includes('ios')
            ? 'Mobile'
            : detail.operatingSystem?.toLowerCase().includes('android')
              ? 'Mobile'
              : 'Other',
        brand: detail.manufacturer || 'Unknown',
        model: detail.model || 'Unknown',
        serial_number: detail.serialNumber || null,
        status: detail.complianceState === 'compliant'
          ? 'In Use'
          : detail.complianceState === 'noncompliant'
            ? 'For Repair'
            : 'Available',
        image_version: detail.osVersion || null,

        // Store Name and UPN separately (UI will render both).
        assigned_agent: userDisplayName,
        logged_in_user: userPrincipalName,

        antivirus_status: detail.complianceState === 'compliant' ? 'Active' : 'Inactive',
        encryption_status: !!detail.isEncrypted,

        hostname: detail.deviceName || null,

        cpu: cpuFormatted || 'unknown',
        ram_gb: ramGb ? Math.round(roundGb(ramGb)) : null,
        disk_type: 'SSD',
        disk_space_gb: diskGb ? roundGb(diskGb) : null,

        // We no longer use usersLoggedOn here to avoid showing GUIDs.
        last_user_login: null,
        user_profile_count: null,

        notes:
          `Intune Device ID: ${detail.id}` +
          `\nAzure AD Device ID: ${detail.azureADDeviceId || 'N/A'}` +
          `\nLast Sync: ${detail.lastSyncDateTime || 'N/A'}` +
          `\nUser: ${userDisplayName || 'No User'}${userPrincipalName ? ` (${userPrincipalName})` : ''}`,

        specs: {
          // Raw Intune fields for troubleshooting / UI fallbacks
          intune_id: detail.id,
          azure_ad_device_id: detail.azureADDeviceId,
          os: detail.operatingSystem,
          os_version: detail.osVersion,
          last_sync: detail.lastSyncDateTime,
          enrolled_at: detail.enrolledDateTime,

          processor_architecture: detail.processorArchitecture,
          processor_count: detail.processorCount,
          processor_core_count: detail.processorCoreCount,

          physical_memory_bytes: detail.physicalMemoryInBytes,
          total_storage_bytes: detail.totalStorageSpaceInBytes,
          free_storage_bytes: detail.freeStorageSpaceInBytes,
          free_disk_gb: freeDiskGb ? roundGb(freeDiskGb) : null,

          user_id: detail.userId,
          user_display_name: userDisplayName,
          user_principal_name: userPrincipalName,
        },
      };

      const { error } = await supabase
        .from('hardware_assets')
        .upsert(assetData, {
          onConflict: 'asset_tag',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Error syncing device ${detail.deviceName}:`, error);
        errors++;
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`Error processing device ${device.deviceName}:`, err);
      errors++;
    }
  }

  console.log(`Sync complete: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
      console.error('Missing Azure AD configuration');
      return new Response(
        JSON.stringify({
          error: 'Azure AD configuration missing. Please configure AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Permissions note (REQUIRED FIX #4):
    // - DeviceManagementManagedDevices.Read.All
    // - Device.Read.All
    // - User.Read.All
    // - Directory.Read.All

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const accessToken = await getAccessToken();
    const devices = await listManagedDevices(accessToken);
    const result = await syncDevicesToDatabase(devices, accessToken, supabase);

    await supabase.from('audit_logs').insert({
      entity_type: 'intune_sync',
      action: 'sync',
      performed_by: 'system',
      details: {
        devices_fetched: devices.length,
        devices_synced: result.synced,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Intune sync completed',
        devices_fetched: devices.length,
        devices_synced: result.synced,
        errors: result.errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in intune-sync function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
