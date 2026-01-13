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
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
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
  userId?: string | null;
  userDisplayName?: string | null;
  userPrincipalName?: string | null;
  physicalMemoryInBytes?: number | null;
  totalStorageSpaceInBytes?: number | null;
  freeStorageSpaceInBytes?: number | null;
  processorArchitecture?: number | string | null;
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

/**
 * Sanitize user string - filters out UUIDs to prevent showing GUIDs as user names
 */
function sanitizeUserString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isUuid(trimmed)) return null;
  return trimmed;
}

/**
 * Sanitize text field - removes HTML tags, limits length, and trims whitespace.
 * This prevents XSS and database overflow from malicious/malformed external data.
 */
function sanitizeText(value: unknown, maxLength = 255): string | null {
  if (typeof value !== 'string') return null;
  // Remove HTML tags and dangerous characters
  const cleaned = value
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous chars
    .substring(0, maxLength)
    .trim();
  return cleaned || null;
}

/**
 * Validate and sanitize a numeric value - ensures it's a positive number
 */
function sanitizeNumber(value: unknown, min = 0): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || num < min) return null;
  return num;
}

/**
 * Validate UUID format
 */
function validateUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return UUID_RE.test(value) ? value : null;
}

function bytesToGb(bytes?: number | null): number | null {
  if (!bytes || bytes <= 0) return null;
  return bytes / (1024 ** 3);
}

function roundGb(gb: number): number {
  const rounded = Math.round(gb * 10) / 10;
  return Number.isInteger(rounded) ? rounded : rounded;
}

function normalizeArchitecture(arch: unknown): string | null {
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
  if (!s) return null;
  if (s.toLowerCase() === 'unknown') return null;
  return s;
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

  // Request physicalMemoryInBytes and processorArchitecture directly from the main endpoint.
  // These fields are available in beta for Windows devices on many tenants.
  let url = `${GRAPH_BASE}/deviceManagement/managedDevices?` +
    `$select=id,deviceName,serialNumber,operatingSystem,osVersion,lastSyncDateTime,` +
    `totalStorageSpaceInBytes,freeStorageSpaceInBytes,` +
    `userId,userDisplayName,userPrincipalName,` +
    `manufacturer,model,complianceState,isEncrypted,azureADDeviceId,enrolledDateTime,managedDeviceOwnerType,` +
    `physicalMemoryInBytes,processorArchitecture`;

  const devices: ManagedDevice[] = [];

  // Handle paging via @odata.nextLink
  while (url) {
    const data = await graphGet<{ value: any[]; '@odata.nextLink'?: string }>(accessToken, url);

    for (const d of data.value || []) {
      devices.push({
        ...d,
        physicalMemoryInBytes: typeof d.physicalMemoryInBytes === 'number' ? d.physicalMemoryInBytes : null,
        processorArchitecture: d.processorArchitecture ?? null,
        totalStorageSpaceInBytes: typeof d.totalStorageSpaceInBytes === 'number' ? d.totalStorageSpaceInBytes : null,
        freeStorageSpaceInBytes: typeof d.freeStorageSpaceInBytes === 'number' ? d.freeStorageSpaceInBytes : null,
      });
    }

    url = data['@odata.nextLink'] || '';
  }

  console.log(`Fetched ${devices.length} devices from Intune`);
  return devices;
}

async function getManagedDeviceDetail(accessToken: string, id: string): Promise<ManagedDevice> {
  const select =
    'id,deviceName,serialNumber,operatingSystem,osVersion,lastSyncDateTime,' +
    'totalStorageSpaceInBytes,freeStorageSpaceInBytes,' +
    'userId,userDisplayName,userPrincipalName,' +
    'manufacturer,model,complianceState,isEncrypted,azureADDeviceId,enrolledDateTime,managedDeviceOwnerType,' +
    'physicalMemoryInBytes,processorArchitecture';

  const url = `${GRAPH_BASE}/deviceManagement/managedDevices/${id}?$select=${select}`;

  try {
    return await graphGet<ManagedDevice>(accessToken, url);
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
    console.warn(`Failed to resolve user ${userId}:`, (e as Error).message);
    return null;
  }
}

/**
 * Validate and sanitize a device object from the Graph API.
 * Returns null if the device is invalid (missing required fields).
 */
function validateDevice(device: any): ManagedDevice | null {
  // Device ID is required and must be a valid UUID
  const id = validateUuid(device?.id);
  if (!id) {
    console.warn('Skipping device with invalid or missing ID');
    return null;
  }

  // Validate numeric fields
  const physicalMemoryInBytes = sanitizeNumber(device.physicalMemoryInBytes, 0);
  const totalStorageSpaceInBytes = sanitizeNumber(device.totalStorageSpaceInBytes, 0);
  const freeStorageSpaceInBytes = sanitizeNumber(device.freeStorageSpaceInBytes, 0);

  const processorArchitecture =
    typeof device?.processorArchitecture === 'number'
      ? device.processorArchitecture
      : sanitizeText(device?.processorArchitecture, 50);

  return {
    id,
    deviceName: sanitizeText(device.deviceName, 255),
    managedDeviceOwnerType: sanitizeText(device.managedDeviceOwnerType, 50),
    enrolledDateTime: sanitizeText(device.enrolledDateTime, 50),
    lastSyncDateTime: sanitizeText(device.lastSyncDateTime, 50),
    operatingSystem: sanitizeText(device.operatingSystem, 100),
    osVersion: sanitizeText(device.osVersion, 50),
    complianceState: sanitizeText(device.complianceState, 50),
    model: sanitizeText(device.model, 100),
    manufacturer: sanitizeText(device.manufacturer, 100),
    serialNumber: sanitizeText(device.serialNumber, 100),
    userId: sanitizeText(device.userId, 100),
    userDisplayName: sanitizeText(device.userDisplayName, 255),
    userPrincipalName: sanitizeText(device.userPrincipalName, 255),
    physicalMemoryInBytes,
    totalStorageSpaceInBytes,
    freeStorageSpaceInBytes,
    processorArchitecture,
    isEncrypted: typeof device.isEncrypted === 'boolean' ? device.isEncrypted : null,
    azureADDeviceId: sanitizeText(device.azureADDeviceId, 100),
  };
}

async function syncDevicesToDatabase(
  devices: ManagedDevice[],
  accessToken: string,
  supabase: any,
  performedBy: string,
): Promise<{ synced: number; errors: number; skipped: number }> {
  console.log(`Syncing ${devices.length} devices to database...`);

  let synced = 0;
  let errors = 0;
  let skipped = 0;

  const userCache = new Map<string, GraphUser | null>();

  for (const device of devices) {
    try {
      // Validate device first
      const validatedDevice = validateDevice(device);
      if (!validatedDevice) {
        skipped++;
        continue;
      }

      // Some tenants return incomplete hardware fields in the list call
      const isWindows = (validatedDevice.operatingSystem || '').toLowerCase().includes('windows');

      const needsDetail =
        validatedDevice.totalStorageSpaceInBytes === null ||
        (isWindows && (
          validatedDevice.physicalMemoryInBytes === null ||
          validatedDevice.physicalMemoryInBytes === 0 ||
          validatedDevice.processorArchitecture === null ||
          validatedDevice.processorArchitecture === undefined
        ));

      let detail = validatedDevice;
      if (needsDetail) {
        try {
          const rawDetail = await getManagedDeviceDetail(accessToken, validatedDevice.id);
          const validated = validateDevice(rawDetail);
          if (validated) {
            detail = validated;
          }
        } catch {
          // Use already validated device if detail fetch fails
        }
      }

      // Resolve managedDevices.userId -> /users/{userId}
      let userDisplayName: string | null = null;
      let userPrincipalName: string | null = null;

      const resolvedUserId = sanitizeUserString(detail.userId);
      if (resolvedUserId && isUuid(resolvedUserId)) {
        if (!userCache.has(resolvedUserId)) {
          userCache.set(resolvedUserId, await getUserById(accessToken, resolvedUserId));
        }
        const user = userCache.get(resolvedUserId);
        userDisplayName = sanitizeText(user?.displayName, 255);
        userPrincipalName = sanitizeText(user?.userPrincipalName, 255);
      }

      // Fallbacks (still never show GUIDs)
      userDisplayName = userDisplayName || sanitizeUserString(detail.userDisplayName);
      userPrincipalName = userPrincipalName || sanitizeUserString(detail.userPrincipalName);

      // Bytes -> GB conversion
      const ramGb = bytesToGb(detail.physicalMemoryInBytes);
      const diskGb = bytesToGb(detail.totalStorageSpaceInBytes);
      const freeDiskGb = bytesToGb(detail.freeStorageSpaceInBytes);

      const cpuArch = normalizeArchitecture(detail.processorArchitecture);

      const assetData = {
        asset_tag: `INTUNE-${detail.id.substring(0, 8).toUpperCase()}`,
        asset_type: detail.operatingSystem?.toLowerCase().includes('windows')
          ? 'Workstation'
          : detail.operatingSystem?.toLowerCase().includes('ios')
            ? 'Mobile'
            : detail.operatingSystem?.toLowerCase().includes('android')
              ? 'Mobile'
              : 'Other',
        brand: sanitizeText(detail.manufacturer, 100) || 'Unknown',
        model: sanitizeText(detail.model, 100) || 'Unknown',
        serial_number: sanitizeText(detail.serialNumber, 100),
        status: detail.complianceState === 'compliant'
          ? 'In Use'
          : detail.complianceState === 'noncompliant'
            ? 'For Repair'
            : 'Available',
        image_version: sanitizeText(detail.osVersion, 50),
        assigned_agent: userDisplayName,
        logged_in_user: userPrincipalName,
        antivirus_status: detail.complianceState === 'compliant' ? 'Active' : 'Inactive',
        encryption_status: !!detail.isEncrypted,
        hostname: sanitizeText(detail.deviceName, 255),
        cpu: cpuArch,
        ram_gb: ramGb ? Math.round(roundGb(ramGb)) : null,
        disk_type: 'SSD',
        disk_space_gb: diskGb ? roundGb(diskGb) : null,
        last_user_login: null,
        user_profile_count: null,
        notes:
          `Intune Device ID: ${detail.id}` +
          `\nAzure AD Device ID: ${sanitizeText(detail.azureADDeviceId, 100) || 'N/A'}` +
          `\nLast Sync: ${sanitizeText(detail.lastSyncDateTime, 50) || 'N/A'}` +
          `\nUser: ${userDisplayName || 'No User'}${userPrincipalName ? ` (${userPrincipalName})` : ''}`,
        specs: {
          intune_id: detail.id,
          azure_ad_device_id: sanitizeText(detail.azureADDeviceId, 100),
          os: sanitizeText(detail.operatingSystem, 100),
          os_version: sanitizeText(detail.osVersion, 50),
          last_sync: sanitizeText(detail.lastSyncDateTime, 50),
          enrolled_at: sanitizeText(detail.enrolledDateTime, 50),
          processor_architecture: detail.processorArchitecture ?? null,
          cpu: cpuArch,
          physical_memory_bytes: detail.physicalMemoryInBytes,
          ram_gb: ramGb ? Math.round(roundGb(ramGb)) : null,
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

  console.log(`Sync complete: ${synced} synced, ${errors} errors, ${skipped} skipped`);
  return { synced, errors, skipped };
}

/**
 * Authenticate the request and verify user has admin or operator role
 */
async function authenticateRequest(req: Request): Promise<{ userId: string; userEmail: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Missing or invalid authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create a client with the user's auth token to validate their session
  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
  
  if (claimsError || !claimsData?.claims?.sub) {
    console.error('Auth validation failed:', claimsError);
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userId = claimsData.claims.sub;
  const userEmail = claimsData.claims.email || 'unknown';

  // Check user role using service role client
  const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);
  const { data: roleData, error: roleError } = await serviceSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (roleError || !roleData) {
    console.error('Role check failed:', roleError);
    return new Response(
      JSON.stringify({ error: 'Forbidden - Unable to verify user role' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const allowedRoles = ['admin', 'operator'];
  if (!allowedRoles.includes(roleData.role)) {
    console.warn(`User ${userId} with role ${roleData.role} attempted to run intune-sync`);
    return new Response(
      JSON.stringify({ error: 'Forbidden - Insufficient permissions. Admin or operator role required.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return { userId, userEmail };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request and check user role
    const authResult = await authenticateRequest(req);
    if (authResult instanceof Response) {
      return authResult;
    }
    
    const { userId, userEmail } = authResult;
    console.log(`Intune sync initiated by user ${userEmail} (${userId})`);

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const accessToken = await getAccessToken();
    const devices = await listManagedDevices(accessToken);
    const result = await syncDevicesToDatabase(devices, accessToken, supabase, userId);

    // Log the sync action with user identity
    await supabase.from('audit_logs').insert({
      entity_type: 'intune_sync',
      action: 'sync',
      performed_by: userEmail,
      details: {
        devices_fetched: devices.length,
        devices_synced: result.synced,
        devices_skipped: result.skipped,
        errors: result.errors,
        timestamp: new Date().toISOString(),
        initiated_by_user_id: userId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Intune sync completed',
        devices_fetched: devices.length,
        devices_synced: result.synced,
        devices_skipped: result.skipped,
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
