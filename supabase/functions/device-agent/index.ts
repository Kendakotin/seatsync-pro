import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DeviceInventory {
  device_id: string;
  hostname: string;
  serial_number: string;
  brand: string;
  model: string;
  cpu: string;
  ram_gb: number;
  disk_space_gb: number;
  disk_type: string;
  os_name: string;
  os_version: string;
  os_build: string;
  logged_in_user: string;
  ip_address: string;
  mac_address: string;
  domain: string;
  installed_software: string[];
  last_boot_time: string;
  encryption_status: boolean;
  antivirus_status: string;
}

// Validate and sanitize string input
function sanitizeString(value: unknown, maxLength = 255): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str.length === 0) return null;
  // Remove any HTML/script tags
  return str.replace(/<[^>]*>/g, "").substring(0, maxLength);
}

// Validate number input
function sanitizeNumber(value: unknown, min = 0): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (isNaN(num) || num < min) return null;
  return Math.round(num * 100) / 100;
}

// Generate a secure registration key
function generateRegistrationKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars
  let key = "";
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  for (let i = 0; i < 24; i++) {
    key += chars[array[i] % chars.length];
  }
  // Format as XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  return key.match(/.{1,4}/g)!.join("-");
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // === REGISTER: Device requests registration ===
    if (req.method === "POST" && action === "register") {
      const body = await req.json();
      const deviceId = sanitizeString(body.device_id, 100);
      const hostname = sanitizeString(body.hostname, 100);

      if (!deviceId) {
        return new Response(
          JSON.stringify({ error: "device_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if device already registered
      const { data: existing } = await supabase
        .from("registered_devices")
        .select("id, registration_key, status")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({
            message: "Device already registered",
            registration_key: existing.registration_key,
            status: existing.status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new registration
      const registrationKey = generateRegistrationKey();
      const { data: newDevice, error } = await supabase
        .from("registered_devices")
        .insert({
          device_id: deviceId,
          hostname: hostname,
          registration_key: registrationKey,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Registration error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to register device" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Device registered successfully. Awaiting approval.",
          registration_key: registrationKey,
          status: "pending",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === SYNC: Device sends inventory data ===
    if (req.method === "POST" && action === "sync") {
      const deviceKey = req.headers.get("x-device-key");

      if (!deviceKey) {
        return new Response(
          JSON.stringify({ error: "Missing device key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate device registration
      const { data: device } = await supabase
        .from("registered_devices")
        .select("*")
        .eq("registration_key", deviceKey)
        .maybeSingle();

      if (!device) {
        return new Response(
          JSON.stringify({ error: "Invalid device key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (device.status !== "approved") {
        return new Response(
          JSON.stringify({ error: `Device not approved. Current status: ${device.status}` }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body: DeviceInventory = await req.json();

      // Build asset data from inventory
      const assetData = {
        asset_tag: sanitizeString(body.device_id, 50) || device.device_id,
        asset_type: "Workstation",
        hostname: sanitizeString(body.hostname, 100),
        serial_number: sanitizeString(body.serial_number, 100),
        brand: sanitizeString(body.brand, 100),
        model: sanitizeString(body.model, 100),
        cpu: sanitizeString(body.cpu, 200),
        ram_gb: sanitizeNumber(body.ram_gb),
        disk_space_gb: sanitizeNumber(body.disk_space_gb),
        disk_type: sanitizeString(body.disk_type, 50),
        logged_in_user: sanitizeString(body.logged_in_user, 100),
        encryption_status: body.encryption_status === true,
        antivirus_status: sanitizeString(body.antivirus_status, 50) || "Unknown",
        status: "In Use",
        specs: {
          os_name: sanitizeString(body.os_name, 100),
          os_version: sanitizeString(body.os_version, 50),
          os_build: sanitizeString(body.os_build, 50),
          ip_address: sanitizeString(body.ip_address, 50),
          mac_address: sanitizeString(body.mac_address, 50),
          domain: sanitizeString(body.domain, 100),
          installed_software: Array.isArray(body.installed_software)
            ? body.installed_software.slice(0, 500).map((s) => sanitizeString(s, 200))
            : [],
          last_boot_time: sanitizeString(body.last_boot_time, 50),
          synced_via: "device-agent",
          last_agent_sync: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      // Upsert into hardware_assets
      const { error: upsertError } = await supabase
        .from("hardware_assets")
        .upsert(assetData, { onConflict: "asset_tag" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to sync device data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update device sync stats
      await supabase
        .from("registered_devices")
        .update({
          hostname: assetData.hostname,
          last_sync_at: new Date().toISOString(),
          sync_count: (device.sync_count || 0) + 1,
        })
        .eq("id", device.id);

      return new Response(
        JSON.stringify({
          message: "Device inventory synced successfully",
          synced_at: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STATUS: Check registration status ===
    if (req.method === "GET" && action === "status") {
      const deviceKey = url.searchParams.get("key");

      if (!deviceKey) {
        return new Response(
          JSON.stringify({ error: "Missing key parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: device } = await supabase
        .from("registered_devices")
        .select("status, last_sync_at, sync_count")
        .eq("registration_key", deviceKey)
        .maybeSingle();

      if (!device) {
        return new Response(
          JSON.stringify({ error: "Device not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(device),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: register, sync, or status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Device agent error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
