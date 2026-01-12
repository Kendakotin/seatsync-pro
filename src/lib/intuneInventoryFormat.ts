// Shared formatting helpers for Intune-synced hardware inventory.

export type ManagedDeviceArchitecture = 0 | 1 | 2 | 3 | 4 | number | string;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function sanitizeUserString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isUuid(trimmed)) return null;
  return trimmed;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function bytesToGb(bytes: unknown): number | null {
  const n = toNumber(bytes);
  if (!n || n <= 0) return null;
  return n / (1024 ** 3);
}

export function formatGb(gb: number): string {
  // Prefer integers for human readability (memory is almost always whole GB).
  const rounded = Math.round(gb * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function mapArchitecture(arch: ManagedDeviceArchitecture | null | undefined): string | null {
  if (arch === null || arch === undefined) return null;

  // Graph can return either numeric enum values or strings depending on API version.
  if (typeof arch === "number") {
    switch (arch) {
      case 0:
        return null; // unknown
      case 1:
        return "x86";
      case 2:
        return "x64";
      case 3:
        return "ARM";
      case 4:
        return "ARM64";
      default:
        return `Arch(${arch})`;
    }
  }

  const s = String(arch).trim();
  if (!s) return null;
  if (s.toLowerCase() === "unknown") return null;
  return s;
}

export function formatCpu(params: {
  rawCpu?: unknown;
  processorArchitecture?: unknown;
  processorCount?: unknown;
  processorCoreCount?: unknown;
}): string | null {
  const raw = typeof params.rawCpu === "string" ? params.rawCpu.trim() : "";
  const rawOk = raw && raw.toLowerCase() !== "unknown" ? raw : null;

  const arch = mapArchitecture(params.processorArchitecture as ManagedDeviceArchitecture);
  const procCount = toNumber(params.processorCount);
  const coreCount = toNumber(params.processorCoreCount);

  const parts: string[] = [];
  if (arch) parts.push(arch);
  if (procCount && procCount > 0) parts.push(`${procCount} CPU`);
  if (coreCount && coreCount > 0) parts.push(`${coreCount} cores`);

  const computed = parts.length ? parts.join(" · ") : null;
  return rawOk ?? computed;
}

export function isAwaitingIntuneSync(lastSyncIso: unknown, hours = 48): boolean {
  if (typeof lastSyncIso !== "string" || !lastSyncIso) return false;
  const ts = Date.parse(lastSyncIso);
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs > hours * 60 * 60 * 1000;
}
