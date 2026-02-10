import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TENANT_ID = Deno.env.get('AZURE_TENANT_ID');
const CLIENT_ID = Deno.env.get('AZURE_CLIENT_ID');
const CLIENT_SECRET = Deno.env.get('AZURE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// Friendly names for common Microsoft SKU part numbers
const SKU_FRIENDLY_NAMES: Record<string, string> = {
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
  'ENTERPRISEPACK': 'Office 365 E3',
  'ENTERPRISEPREMIUM': 'Office 365 E5',
  'DESKLESSPACK': 'Office 365 F3',
  'SPE_E3': 'Microsoft 365 E3',
  'SPE_E5': 'Microsoft 365 E5',
  'SPE_F1': 'Microsoft 365 F1',
  'SPB': 'Microsoft 365 Business Premium',
  'SMB_BUSINESS': 'Microsoft 365 Apps for Business',
  'SMB_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'SMB_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
  'OFFICESUBSCRIPTION': 'Microsoft 365 Apps for Enterprise',
  'EXCHANGESTANDARD': 'Exchange Online Plan 1',
  'EXCHANGEENTERPRISE': 'Exchange Online Plan 2',
  'EMS': 'Enterprise Mobility + Security E3',
  'EMSPREMIUM': 'Enterprise Mobility + Security E5',
  'ATP_ENTERPRISE': 'Microsoft Defender for Office 365 Plan 1',
  'THREAT_INTELLIGENCE': 'Microsoft Defender for Office 365 Plan 2',
  'INTUNE_A': 'Microsoft Intune Plan 1',
  'IDENTITY_THREAT_PROTECTION': 'Microsoft 365 E5 Security',
  'AAD_PREMIUM': 'Azure AD Premium P1',
  'AAD_PREMIUM_P2': 'Azure AD Premium P2',
  'POWER_BI_STANDARD': 'Power BI (free)',
  'POWER_BI_PRO': 'Power BI Pro',
  'PROJECTPROFESSIONAL': 'Project Plan 3',
  'PROJECTPREMIUM': 'Project Plan 5',
  'VISIOCLIENT': 'Visio Plan 2',
  'FLOW_FREE': 'Power Automate Free',
  'POWERAPPS_VIRAL': 'Power Apps Plan 2 Trial',
  'TEAMS_EXPLORATORY': 'Microsoft Teams Exploratory',
  'STREAM': 'Microsoft Stream',
  'WIN10_PRO_ENT_SUB': 'Windows 10/11 Enterprise E3',
  'WIN10_VDA_E5': 'Windows 10/11 Enterprise E5',
  'WINDOWS_STORE': 'Windows Store for Business',
  'RIGHTSMANAGEMENT': 'Azure Information Protection Plan 1',
  'RIGHTSMANAGEMENT_ADHOC': 'Rights Management Adhoc',
  'MCOEV': 'Microsoft Teams Phone Standard',
  'MCOMEETADV': 'Microsoft Teams Audio Conferencing',
  'PHONESYSTEM_VIRTUALUSER': 'Microsoft Teams Phone Resource Account',
  'MEETING_ROOM': 'Microsoft Teams Rooms Standard',
  'DYN365_ENTERPRISE_SALES': 'Dynamics 365 Sales Enterprise',
  'DYN365_ENTERPRISE_CUSTOMER_SERVICE': 'Dynamics 365 Customer Service Enterprise',
  'MICROSOFT_BUSINESS_CENTER': 'Microsoft Business Center',
  'CCIBOTS_PRIVPREV_VIRAL': 'Power Virtual Agents Viral Trial',
  'FORMS_PRO': 'Dynamics 365 Customer Voice Trial',
  'CDS_DB_CAPACITY': 'Common Data Service Database Capacity',
  'M365_F1_COMM': 'Microsoft 365 F1',
};

interface SubscribedSku {
  id: string;
  skuId: string;
  skuPartNumber: string;
  capabilityStatus: string;
  consumedUnits: number;
  prepaidUnits: {
    enabled: number;
    suspended: number;
    warning: number;
    lockedOut: number;
  };
  servicePlans: {
    servicePlanId: string;
    servicePlanName: string;
    provisioningStatus: string;
    appliesTo: string;
  }[];
}

async function getAccessToken(): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getSubscribedSkus(accessToken: string): Promise<SubscribedSku[]> {
  const url = `${GRAPH_BASE}/subscribedSkus`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch subscribed SKUs (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.value || [];
}

function getLicenseType(sku: SubscribedSku): string {
  const name = (sku.skuPartNumber || '').toUpperCase();
  if (name.includes('ENTERPRISE') || name.includes('SPE_E')) return 'Volume';
  if (name.includes('BUSINESS') || name.includes('SMB')) return 'Named';
  if (name.includes('FREE') || name.includes('VIRAL') || name.includes('TRIAL') || name.includes('EXPLORATORY')) return 'Site';
  return 'Named';
}

function getFriendlyName(skuPartNumber: string): string {
  const upper = skuPartNumber.toUpperCase();
  return SKU_FRIENDLY_NAMES[upper] || skuPartNumber.replace(/_/g, ' ');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Azure AD credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Fetching Microsoft Entra ID license data...');
    const accessToken = await getAccessToken();
    const skus = await getSubscribedSkus(accessToken);
    console.log(`Found ${skus.length} subscribed SKUs`);

    let synced = 0;
    let errors = 0;

    for (const sku of skus) {
      try {
        const friendlyName = getFriendlyName(sku.skuPartNumber);
        const totalSeats = sku.prepaidUnits?.enabled || 0;
        const usedSeats = sku.consumedUnits || 0;
        const isCompliant = usedSeats <= totalSeats;

        // Build service plans summary
        const activePlans = (sku.servicePlans || [])
          .filter(p => p.provisioningStatus === 'Success')
          .map(p => p.servicePlanName)
          .slice(0, 10); // limit to prevent overly long notes

        const licenseData = {
          software_name: friendlyName,
          vendor: 'Microsoft',
          license_type: getLicenseType(sku),
          license_key: sku.skuId,
          total_seats: totalSeats,
          used_seats: usedSeats,
          compliance_status: isCompliant ? 'Compliant' : 'Non-Compliant',
          is_client_provided: false,
          notes: `Entra ID SKU: ${sku.skuPartNumber}\nStatus: ${sku.capabilityStatus}\nSuspended: ${sku.prepaidUnits?.suspended || 0}\nWarning: ${sku.prepaidUnits?.warning || 0}${activePlans.length > 0 ? `\nService Plans: ${activePlans.join(', ')}` : ''}`,
        };

        // Check if license already exists by SKU ID (license_key)
        const { data: existing } = await supabase
          .from('software_licenses')
          .select('id')
          .eq('license_key', sku.skuId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('software_licenses')
            .update(licenseData)
            .eq('id', existing.id);
          if (error) {
            console.error(`Error updating license ${friendlyName}:`, error);
            errors++;
          } else {
            synced++;
          }
        } else {
          const { error } = await supabase
            .from('software_licenses')
            .insert(licenseData);
          if (error) {
            console.error(`Error inserting license ${friendlyName}:`, error);
            errors++;
          } else {
            synced++;
          }
        }
      } catch (err) {
        console.error(`Error processing SKU ${sku.skuPartNumber}:`, err);
        errors++;
      }
    }

    console.log(`License sync complete: ${synced} synced, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        licenses_synced: synced,
        errors,
        total_skus: skus.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('License sync error:', err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
