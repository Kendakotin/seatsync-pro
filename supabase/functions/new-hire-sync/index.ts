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
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function sanitizeText(value: unknown, maxLength = 255): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'&]/g, '')
    .substring(0, maxLength)
    .trim();
  return cleaned || null;
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

interface GraphUser {
  id: string;
  displayName?: string | null;
  employeeId?: string | null;
  createdDateTime?: string | null;
  userPrincipalName?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  accountEnabled?: boolean | null;
}

async function fetchRecentUsers(accessToken: string, days: number): Promise<GraphUser[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  console.log(`Fetching users created since ${sinceIso}...`);

  const filter = `createdDateTime ge ${sinceIso}`;
  const select = 'id,displayName,employeeId,createdDateTime,userPrincipalName,department,jobTitle,accountEnabled';
  let url = `https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}&$select=${select}&$orderby=createdDateTime desc&$top=999`;

  const users: GraphUser[] = [];

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ConsistencyLevel: 'eventual',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Graph API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    users.push(...(data.value || []));
    url = data['@odata.nextLink'] || '';
  }

  console.log(`Fetched ${users.length} users created in the last ${days} days`);
  return users;
}

async function authenticateRequest(req: Request): Promise<{ userId: string; userEmail: string } | Response> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);

  if (claimsError || !claimsData?.claims?.sub) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userId = claimsData.claims.sub;
  const userEmail = claimsData.claims.email || 'unknown';

  const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);
  const { data: roleData, error: roleError } = await serviceSupabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (roleError || !roleData) {
    return new Response(
      JSON.stringify({ error: 'Forbidden - Unable to verify user role' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!['admin', 'operator'].includes(roleData.role)) {
    return new Response(
      JSON.stringify({ error: 'Forbidden - Insufficient permissions' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return { userId, userEmail };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult instanceof Response) return authResult;

    const { userId, userEmail } = authResult;
    console.log(`New hire sync initiated by ${userEmail} (${userId})`);

    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Azure AD configuration missing. Please configure AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Backend configuration missing.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const accessToken = await getAccessToken();
    const users = await fetchRecentUsers(accessToken, 30);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const employeeName = sanitizeText(user.displayName, 255);
        if (!employeeName) {
          skipped++;
          continue;
        }

        // Skip service accounts / disabled accounts
        if (user.accountEnabled === false) {
          skipped++;
          continue;
        }

        const upn = sanitizeText(user.userPrincipalName, 255);
        // Skip accounts that look like service principals (contain #EXT# or are guest accounts)
        if (upn && upn.includes('#EXT#')) {
          skipped++;
          continue;
        }

        const employeeId = sanitizeText(user.employeeId, 100) || sanitizeText(user.userPrincipalName, 100);
        const hireDate = user.createdDateTime ? user.createdDateTime.split('T')[0] : new Date().toISOString().split('T')[0];

        // Check if this user already exists by employee_id
        const { data: existing } = await supabase
          .from('new_hires')
          .select('id')
          .eq('employee_id', employeeId)
          .maybeSingle();

        const notes = [
          user.department ? `Department: ${sanitizeText(user.department, 100)}` : null,
          user.jobTitle ? `Job Title: ${sanitizeText(user.jobTitle, 100)}` : null,
          upn ? `UPN: ${upn}` : null,
          `Entra ID: ${user.id}`,
        ].filter(Boolean).join('\n');

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('new_hires')
            .update({ employee_name: employeeName, notes })
            .eq('id', existing.id);

          if (error) {
            console.error(`Error updating hire ${employeeName}:`, error);
            errors++;
          } else {
            updated++;
          }
        } else {
          // Insert new record
          const { error } = await supabase
            .from('new_hires')
            .insert({
              employee_name: employeeName,
              employee_id: employeeId,
              hire_date: hireDate,
              status: 'Pending',
              notes,
            });

          if (error) {
            console.error(`Error inserting hire ${employeeName}:`, error);
            errors++;
          } else {
            created++;
          }
        }
      } catch (err) {
        console.error(`Error processing user ${user.displayName}:`, err);
        errors++;
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      entity_type: 'new_hire_sync',
      action: 'sync',
      performed_by: userEmail,
      details: {
        users_fetched: users.length,
        created,
        updated,
        skipped,
        errors,
        timestamp: new Date().toISOString(),
        initiated_by_user_id: userId,
      },
    });

    console.log(`New hire sync complete: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'New hire sync completed',
        users_fetched: users.length,
        created,
        updated,
        skipped,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in new-hire-sync:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
