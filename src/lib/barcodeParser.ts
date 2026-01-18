/**
 * Parses scanned barcode/QR code data and extracts asset information
 * Supports various formats including JSON, key-value pairs, and common manufacturer formats
 */

export interface ParsedAssetData {
  asset_tag?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  mac_address?: string;
  status?: string;
  asset_type?: string;
  hostname?: string;
}

// Common brand identifiers found in serial numbers or barcodes
const brandPatterns: { pattern: RegExp; brand: string }[] = [
  { pattern: /^(DELL|dell)/i, brand: 'Dell' },
  { pattern: /^(HP|hp|HPE)/i, brand: 'HP' },
  { pattern: /^(LEN|lenovo)/i, brand: 'Lenovo' },
  { pattern: /^(ASUS|asus)/i, brand: 'Asus' },
  { pattern: /^(ACER|acer)/i, brand: 'Acer' },
  { pattern: /^(CISCO|cisco)/i, brand: 'Cisco' },
  { pattern: /^(APPLE|apple)/i, brand: 'Apple' },
  { pattern: /^(SAMSUNG|samsung)/i, brand: 'Samsung' },
  { pattern: /^(LOGITECH|logitech)/i, brand: 'Logitech' },
  { pattern: /^(JABRA|jabra)/i, brand: 'Jabra' },
  { pattern: /^(PLANTRONICS|plantronics|POLY|poly)/i, brand: 'Poly' },
  { pattern: /^(MICROSOFT|microsoft)/i, brand: 'Microsoft' },
];

// MAC address patterns
const macAddressPatterns = [
  /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/, // AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF
  /([0-9A-Fa-f]{4}\.){2}[0-9A-Fa-f]{4}/, // AABB.CCDD.EEFF (Cisco format)
  /[0-9A-Fa-f]{12}/, // AABBCCDDEEFF (no separators)
];

// Serial number patterns by manufacturer
const serialPatterns = [
  { pattern: /^[A-Z0-9]{7}$/, brand: 'Dell' }, // Dell service tags are often 7 chars
  { pattern: /^[A-Z]{2}[A-Z0-9]{8}$/, brand: 'Lenovo' }, // Lenovo serial format
  { pattern: /^[A-Z0-9]{10}$/, brand: 'HP' }, // HP serial format
];

/**
 * Detects brand from scanned text
 */
function detectBrand(text: string): string | undefined {
  for (const { pattern, brand } of brandPatterns) {
    if (pattern.test(text)) {
      return brand;
    }
  }
  return undefined;
}

/**
 * Extracts MAC address from text
 */
function extractMacAddress(text: string): string | undefined {
  for (const pattern of macAddressPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalize to AA:BB:CC:DD:EE:FF format
      let mac = match[0].toUpperCase().replace(/[.:-]/g, '');
      if (mac.length === 12) {
        return mac.match(/.{2}/g)?.join(':');
      }
    }
  }
  return undefined;
}

/**
 * Parses JSON-formatted QR code data
 */
function parseJsonFormat(text: string): ParsedAssetData | null {
  try {
    const data = JSON.parse(text);
    const result: ParsedAssetData = {};
    
    // Map common JSON field names to our asset fields
    const fieldMappings: Record<string, keyof ParsedAssetData> = {
      asset_tag: 'asset_tag',
      assetTag: 'asset_tag',
      tag: 'asset_tag',
      asset: 'asset_tag',
      brand: 'brand',
      manufacturer: 'brand',
      make: 'brand',
      model: 'model',
      modelNumber: 'model',
      model_number: 'model',
      serial: 'serial_number',
      serialNumber: 'serial_number',
      serial_number: 'serial_number',
      sn: 'serial_number',
      mac: 'mac_address',
      macAddress: 'mac_address',
      mac_address: 'mac_address',
      status: 'status',
      type: 'asset_type',
      assetType: 'asset_type',
      asset_type: 'asset_type',
      hostname: 'hostname',
      host: 'hostname',
    };

    for (const [jsonKey, assetKey] of Object.entries(fieldMappings)) {
      if (data[jsonKey] !== undefined) {
        result[assetKey] = String(data[jsonKey]);
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * Parses key-value formatted data (e.g., "SN:12345;MAC:AA:BB:CC:DD:EE:FF")
 */
function parseKeyValueFormat(text: string): ParsedAssetData | null {
  const result: ParsedAssetData = {};
  
  // Common delimiters: ;, |, newline
  const parts = text.split(/[;|\n]+/);
  
  const keyMappings: Record<string, keyof ParsedAssetData> = {
    sn: 'serial_number',
    serial: 'serial_number',
    s: 'serial_number',
    mac: 'mac_address',
    m: 'mac_address',
    brand: 'brand',
    b: 'brand',
    model: 'model',
    mod: 'model',
    tag: 'asset_tag',
    asset: 'asset_tag',
    a: 'asset_tag',
    status: 'status',
    st: 'status',
    type: 'asset_type',
    t: 'asset_type',
    host: 'hostname',
    h: 'hostname',
  };

  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    const equalsIndex = part.indexOf('=');
    const separatorIndex = colonIndex >= 0 && (equalsIndex < 0 || colonIndex < equalsIndex) 
      ? colonIndex 
      : equalsIndex;
    
    if (separatorIndex > 0) {
      const key = part.substring(0, separatorIndex).trim().toLowerCase();
      const value = part.substring(separatorIndex + 1).trim();
      
      const assetKey = keyMappings[key];
      if (assetKey && value) {
        result[assetKey] = value;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parses plain text barcode (serial number or asset tag)
 */
function parsePlainText(text: string): ParsedAssetData {
  const result: ParsedAssetData = {};
  const cleanText = text.trim();
  
  // Check if it's a MAC address
  const macAddress = extractMacAddress(cleanText);
  if (macAddress) {
    result.mac_address = macAddress;
    
    // If the entire text is just a MAC address, try to detect brand from OUI
    const mac = macAddress.replace(/:/g, '').substring(0, 6);
    // Common OUI prefixes (first 3 bytes of MAC)
    const ouiBrands: Record<string, string> = {
      '001E4F': 'Dell',
      '0050B6': 'Dell',
      '001DD8': 'Dell',
      '001125': 'HP',
      '3C4A92': 'HP',
      '001CC4': 'HP',
      'F0DEF1': 'Lenovo',
      '001E37': 'Lenovo',
      '6C5C14': 'Cisco',
      '000C29': 'VMware',
    };
    if (ouiBrands[mac.toUpperCase()]) {
      result.brand = ouiBrands[mac.toUpperCase()];
    }
  }

  // Try to detect brand from text
  const brand = detectBrand(cleanText);
  if (brand) {
    result.brand = brand;
    // Assume the rest is the model/serial
    const remaining = cleanText.replace(new RegExp(`^${brand}[\\s_-]*`, 'i'), '');
    if (remaining) {
      // If it looks like a model number (contains letters and numbers mixed)
      if (/[A-Za-z].*\d|\d.*[A-Za-z]/.test(remaining)) {
        result.model = remaining;
      }
    }
  }

  // Check for Dell service tag format (7 alphanumeric characters)
  if (/^[A-Z0-9]{7}$/i.test(cleanText)) {
    result.serial_number = cleanText.toUpperCase();
    result.brand = result.brand || 'Dell';
  }
  // Longer serial numbers
  else if (/^[A-Z0-9]{10,20}$/i.test(cleanText)) {
    result.serial_number = cleanText.toUpperCase();
  }
  // If it looks like an asset tag (starts with letters, contains dash or underscore)
  else if (/^[A-Z]{2,5}[-_][A-Z0-9]+$/i.test(cleanText)) {
    result.asset_tag = cleanText.toUpperCase();
  }
  // Default: treat as serial number or asset tag based on length
  else if (cleanText.length >= 5 && cleanText.length <= 30) {
    // If no other fields set, use as serial number
    if (!result.serial_number && !result.asset_tag) {
      result.serial_number = cleanText;
    }
  }

  return result;
}

/**
 * Main function to parse barcode/QR code data
 */
export function parseBarcodeData(scannedText: string): ParsedAssetData {
  if (!scannedText || !scannedText.trim()) {
    return {};
  }

  const text = scannedText.trim();

  // Try JSON format first
  if (text.startsWith('{')) {
    const jsonResult = parseJsonFormat(text);
    if (jsonResult && Object.keys(jsonResult).length > 0) {
      return jsonResult;
    }
  }

  // Try key-value format
  if (text.includes(':') || text.includes('=')) {
    const kvResult = parseKeyValueFormat(text);
    if (kvResult && Object.keys(kvResult).length > 0) {
      // Also check for additional info in plain text
      const plainResult = parsePlainText(text);
      return { ...plainResult, ...kvResult };
    }
  }

  // Fall back to plain text parsing
  return parsePlainText(text);
}

/**
 * Validates a MAC address format
 */
export function isValidMacAddress(mac: string): boolean {
  if (!mac) return false;
  const normalized = mac.replace(/[:-]/g, '');
  return /^[0-9A-Fa-f]{12}$/.test(normalized);
}

/**
 * Formats a MAC address to standard format (AA:BB:CC:DD:EE:FF)
 */
export function formatMacAddress(mac: string): string {
  if (!mac) return '';
  const normalized = mac.replace(/[.:-]/g, '').toUpperCase();
  if (normalized.length !== 12) return mac;
  return normalized.match(/.{2}/g)?.join(':') || mac;
}
