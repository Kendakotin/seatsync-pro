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

  // Hardware - extracted from hardwareInformation in beta endpoint
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

// Use beta endpoint for hardware details (hardwareInformation is only in beta)
const GRAPH_BASE = 'https://graph.microsoft.com/beta';

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
  console.log('Fetching devices from Microsoft Intune (managedDevices - beta endpoint)...');

  // IMPORTANT: processorArchitecture, processorCount, physicalMemoryInBytes are NOT
  // direct properties on managedDevice. They exist inside hardwareInformation (beta only).
  // We fetch hardwareInformation and extract the relevant fields.
  let url = `${GRAPH_BASE}/deviceManagement/managedDevices?` +
    `$select=id,deviceName,serialNumber,operatingSystem,osVersion,lastSyncDateTime,` +
    `totalStorageSpaceInBytes,freeStorageSpaceInBytes,` +
    `userId,userDisplayName,userPrincipalName,` +
    `manufacturer,model,complianceState,isEncrypted,azureADDeviceId,enrolledDateTime,managedDeviceOwnerType,` +
    `hardwareInformation`;

  const devices: ManagedDevice[] = [];

  // Handle paging via @odata.nextLink
  while (url) {
    const data = await graphGet<{ value: any[]; '@odata.nextLink'?: string }>(accessToken, url);
    
    // Map hardwareInformation fields to flat structure
    for (const d of data.value || []) {
      const hw = d.hardwareInformation || {};
      devices.push({
        ...d,
        // Extract RAM from hardwareInformation (physicalMemoryInBytes is there in beta)
        physicalMemoryInBytes: hw.physicalMemoryInBytes ?? null,
        // Use totalStorageSpaceInBytes from root or hardwareInformation
        totalStorageSpaceInBytes: d.totalStorageSpaceInBytes ?? hw.totalStorageSpace ?? null,
        freeStorageSpaceInBytes: d.freeStorageSpaceInBytes ?? hw.freeStorageSpace ?? null,
      });
    }
    url = data['@odata.nextLink'] || '';
  }

  console.log(`Fetched ${devices.length} devices from Intune`);
  return devices;
}

async function getManagedDeviceDetail(accessToken: string, id: string): Promise<ManagedDevice> {
  // Use beta endpoint with hardwareInformation
  const select =
    'id,deviceName,serialNumber,operatingSystem,osVersion,lastSyncDateTime,' +
    'totalStorageSpaceInBytes,freeStorageSpaceInBytes,' +
    'userId,userDisplayName,userPrincipalName,' +
    'manufacturer,model,complianceState,isEncrypted,azureADDeviceId,enrolledDateTime,managedDeviceOwnerType,' +
    'hardwareInformation';

  const url = `${GRAPH_BASE}/deviceManagement/managedDevices/${id}?$select=${select}`;

  try {
    const d = await graphGet<any>(accessToken, url);
    const hw = d.hardwareInformation || {};
    
    return {
      ...d,
      physicalMemoryInBytes: hw.physicalMemoryInBytes ?? null,
      totalStorageSpaceInBytes: d.totalStorageSpaceInBytes ?? hw.totalStorageSpace ?? null,
      freeStorageSpaceInBytes: d.freeStorageSpaceInBytes ?? hw.freeStorageSpace ?? null,
    };
  } catch (e) {
    console.warn(`Failed to get device detail for ${id}:`, (e as Error).message);
    throw e;
  }
}

async function getUserById(accessToken: string, userId: string): Promise<GraphUser | null> {
  const url = `${GRAPH_BASE}/users/${userId}?$select=id,displayName,userPrincipalName`;

  try {
    const user = await graphGet<GraphUser>(accessToken, url);
    return user;
  } catch (e) {
    // Without User.Read.All / Directory.Read.All this can fail.
    // Return null and let the UI show "No User Logged In".
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
      // Some tenants return incomplete hardware fields in the list call.
      // If key fields are missing/empty, request per-device detail.
      const needsDetail =
        device.physicalMemoryInBytes === null ||
        device.physicalMemoryInBytes === undefined ||
        device.physicalMemoryInBytes === 0 ||
        device.totalStorageSpaceInBytes === null ||
        device.totalStorageSpaceInBytes === undefined;

      const detail = needsDetail ? await getManagedDeviceDetail(accessToken, device.id) : device;

      // Resolve managedDevices.userId -> /users/{userId} and display as Name + UPN.
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

      // Bytes -> GB conversion
      const ramGb = bytesToGb(detail.physicalMemoryInBytes);
      const diskGb = bytesToGb(detail.totalStorageSpaceInBytes);
      const freeDiskGb = bytesToGb(detail.freeStorageSpaceInBytes);

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

        // CPU info is not reliably available from Intune Graph API
        cpu: null,
        ram_gb: ramGb ? Math.round(roundGb(ramGb)) : null,
        disk_type: 'SSD',
        disk_space_gb: diskGb ? roundGb(diskGb) : null,

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

    // Required permissions:
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
