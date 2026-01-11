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

interface IntuneDevice {
  id: string;
  deviceName: string;
  managedDeviceOwnerType: string;
  enrolledDateTime: string;
  lastSyncDateTime: string;
  operatingSystem: string;
  osVersion: string;
  complianceState: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  userDisplayName: string;
  userPrincipalName: string;
  isEncrypted: boolean;
  azureADDeviceId: string;
  // Hardware specs
  physicalMemoryInBytes?: number;
  totalStorageSpaceInBytes?: number;
  freeStorageSpaceInBytes?: number;
  processorArchitecture?: string;
  // User activity
  usersLoggedOn?: Array<{ userId: string; lastLogOnDateTime: string }>;
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

async function getIntuneDevices(accessToken: string): Promise<IntuneDevice[]> {
  console.log('Fetching devices from Microsoft Intune...');
  
  // Use beta endpoint with $select to get hardware details
  const graphUrl = 'https://graph.microsoft.com/beta/deviceManagement/managedDevices?$select=id,deviceName,managedDeviceOwnerType,enrolledDateTime,lastSyncDateTime,operatingSystem,osVersion,complianceState,model,manufacturer,serialNumber,userDisplayName,userPrincipalName,isEncrypted,azureADDeviceId,physicalMemoryInBytes,totalStorageSpaceInBytes,freeStorageSpaceInBytes,processorArchitecture,usersLoggedOn';
  
  const response = await fetch(graphUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to fetch Intune devices:', error);
    throw new Error(`Failed to fetch Intune devices: ${error}`);
  }

  const data = await response.json();
  console.log(`Fetched ${data.value?.length || 0} devices from Intune`);
  return data.value || [];
}

async function syncDevicesToDatabase(devices: IntuneDevice[], supabase: any): Promise<{ synced: number; errors: number }> {
  console.log(`Syncing ${devices.length} devices to database...`);
  
  let synced = 0;
  let errors = 0;

  for (const device of devices) {
    try {
      // Convert bytes to GB
      const ramGb = device.physicalMemoryInBytes 
        ? Math.round((device.physicalMemoryInBytes / (1024 * 1024 * 1024)) * 10) / 10 
        : null;
      const diskSpaceGb = device.totalStorageSpaceInBytes 
        ? Math.round((device.totalStorageSpaceInBytes / (1024 * 1024 * 1024)) * 10) / 10 
        : null;

      // Get logged on users info
      const usersLoggedOn = device.usersLoggedOn || [];
      const currentUser = usersLoggedOn.length > 0 ? usersLoggedOn[0].userId : null;
      const lastLoginTime = usersLoggedOn.length > 0 ? usersLoggedOn[0].lastLogOnDateTime : null;

      // Map Intune device to hardware_assets table structure
      const assetData = {
        asset_tag: `INTUNE-${device.id.substring(0, 8).toUpperCase()}`,
        asset_type: device.operatingSystem?.toLowerCase().includes('windows') ? 'Workstation' : 
                    device.operatingSystem?.toLowerCase().includes('ios') ? 'Mobile' :
                    device.operatingSystem?.toLowerCase().includes('android') ? 'Mobile' : 'Other',
        brand: device.manufacturer || 'Unknown',
        model: device.model || 'Unknown',
        serial_number: device.serialNumber || null,
        status: device.complianceState === 'compliant' ? 'In Use' : 
                device.complianceState === 'noncompliant' ? 'For Repair' : 'Available',
        image_version: device.osVersion || null,
        assigned_agent: device.userDisplayName || null,
        antivirus_status: device.complianceState === 'compliant' ? 'Active' : 'Inactive',
        encryption_status: device.isEncrypted || false,
        // New hardware spec columns
        cpu: device.processorArchitecture || null,
        ram_gb: ramGb,
        disk_type: 'SSD', // Intune doesn't provide disk type, default to SSD
        disk_space_gb: diskSpaceGb,
        last_user_login: lastLoginTime,
        logged_in_user: currentUser,
        user_profile_count: usersLoggedOn.length,
        notes: `Intune Device ID: ${device.id}\nAzure AD Device ID: ${device.azureADDeviceId || 'N/A'}\nLast Sync: ${device.lastSyncDateTime}\nUser: ${device.userPrincipalName || 'Unassigned'}`,
        specs: {
          os: device.operatingSystem,
          os_version: device.osVersion,
          enrollment_date: device.enrolledDateTime,
          last_sync: device.lastSyncDateTime,
          compliance_state: device.complianceState,
          intune_id: device.id,
          azure_ad_device_id: device.azureADDeviceId,
          physical_memory_bytes: device.physicalMemoryInBytes,
          total_storage_bytes: device.totalStorageSpaceInBytes,
          free_storage_bytes: device.freeStorageSpaceInBytes,
        },
      };

      // Upsert based on serial number or Intune ID in asset_tag
      const { error } = await supabase
        .from('hardware_assets')
        .upsert(assetData, {
          onConflict: 'asset_tag',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Error syncing device ${device.deviceName}:`, error);
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
    // Validate required environment variables
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
      console.error('Missing Azure AD configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Azure AD configuration missing. Please configure AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Microsoft Graph access token
    const accessToken = await getAccessToken();

    // Fetch devices from Intune
    const devices = await getIntuneDevices(accessToken);

    // Sync devices to database
    const result = await syncDevicesToDatabase(devices, supabase);

    // Log the sync operation
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in intune-sync function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
