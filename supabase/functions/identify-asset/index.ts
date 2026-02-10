import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASSET_TYPES = [
  "Workstation", "Headset", "Monitor", "Thin Client", "IP Phone",
  "UPS", "Switch", "Router", "Firewall", "Access Point", "Mobile", "Other"
];

const systemPrompt = `You are an IT asset identification expert. Given scanned barcode/QR code text from IT equipment, identify as much information as possible about the device.

You MUST respond using the identify_asset tool with the extracted information. Analyze the text for:
- Brand/manufacturer (Dell, HP, Lenovo, Cisco, Apple, etc.)
- Model name/number
- Serial number
- MAC address
- Asset tag
- Hostname
- Device/equipment type

For asset_type, use ONLY one of these values: ${ASSET_TYPES.join(", ")}

Guidelines for identifying asset_type:
- Laptops, desktops, PCs, towers → "Workstation"
- Headphones, earbuds, audio devices → "Headset"
- Displays, screens → "Monitor"
- Thin/zero clients, VDI terminals → "Thin Client"
- Desk phones, VoIP phones → "IP Phone"
- Battery backups, power supplies → "UPS"
- Network switches, managed switches → "Switch"
- Routers, gateways → "Router"
- Firewalls, security appliances → "Firewall"
- WiFi APs, wireless access points → "Access Point"
- Phones, tablets → "Mobile"
- Anything else → "Other"

If a field cannot be determined from the scanned text, omit it. Be precise and avoid guessing.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scannedText } = await req.json();

    if (!scannedText || !scannedText.trim()) {
      return new Response(
        JSON.stringify({ error: "No scanned text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Identify the IT asset from this scanned barcode/QR code text:\n\n${scannedText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identify_asset",
              description: "Return identified asset details from scanned barcode text",
              parameters: {
                type: "object",
                properties: {
                  asset_tag: { type: "string", description: "Asset tag identifier" },
                  brand: { type: "string", description: "Manufacturer/brand name" },
                  model: { type: "string", description: "Model name or number" },
                  serial_number: { type: "string", description: "Serial number" },
                  mac_address: { type: "string", description: "MAC address in AA:BB:CC:DD:EE:FF format" },
                  asset_type: { type: "string", enum: ASSET_TYPES, description: "Type of equipment" },
                  hostname: { type: "string", description: "Device hostname" },
                  status: { type: "string", description: "Device status" },
                },
                required: [],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "identify_asset" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      // Fallback: return empty result
      return new Response(
        JSON.stringify({ result: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("identify-asset error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
