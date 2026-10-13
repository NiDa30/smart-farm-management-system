export interface TelemetryReading {
  id: number;
  farmId: 'FARM001';
  receivedAt: string;
  telemetry: {
    schemaVersion: 1;
    deviceId: 'ENV01';
    bootId: string;
    sequence: number;
    timestamp: string;
    temperature: number;
    humidity: number;
    soilMoisture: number;
    uptimeMs: number;
  };
}

export type NetworkState = 'loading' | 'ready' | 'empty' | 'error';
export type TelemetryState = 'loading' | 'live' | 'stale' | 'empty' | 'error';
export const API_PATH = '/api/v1/devices/ENV01/telemetry';
export const FRESHNESS_MS = 30_000;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function range(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

export function parseReading(value: unknown): TelemetryReading {
  if (!object(value) || !integer(value.id) || value.farmId !== 'FARM001' || !timestamp(value.receivedAt)) {
    throw new Error('Invalid reading response');
  }
  const t = value.telemetry;
  if (!object(t) || t.schemaVersion !== 1 || t.deviceId !== 'ENV01'
    || typeof t.bootId !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(t.bootId)
    || !integer(t.sequence) || !integer(t.uptimeMs) || !timestamp(t.timestamp)
    || !range(t.temperature, -40, 80) || !range(t.humidity, 0, 100) || !range(t.soilMoisture, 0, 100)) {
    throw new Error('Invalid telemetry response');
  }
  return value as unknown as TelemetryReading;
}

export function parseHistory(value: unknown): TelemetryReading[] {
  if (!Array.isArray(value)) throw new Error('Invalid history response');
  const readings = value.map(parseReading);
  return [...new Map(readings.map(reading => [reading.id, reading])).values()]
    .sort((a, b) => Date.parse(b.telemetry.timestamp) - Date.parse(a.telemetry.timestamp) || b.id - a.id)
    .slice(0, 15);
}

export function telemetryState(network: NetworkState, reading: TelemetryReading | null, now: number): TelemetryState {
  if (network === 'error') return 'error';
  if (network === 'loading') return 'loading';
  if (!reading) return 'empty';
  const sourceAge = now - Date.parse(reading.telemetry.timestamp);
  const receivedAge = now - Date.parse(reading.receivedAt);
  return sourceAge >= -60_000 && sourceAge <= FRESHNESS_MS
    && receivedAge >= -60_000 && receivedAge <= FRESHNESS_MS ? 'live' : 'stale';
}

export async function fetchLatest(signal: AbortSignal): Promise<TelemetryReading | null> {
  const response = await fetch(`${API_PATH}/latest`, { signal, cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Latest request failed');
  return parseReading(await response.json());
}
export async function fetchHistory(signal: AbortSignal): Promise<TelemetryReading[]> {
  const response = await fetch(`${API_PATH}?limit=15`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('History request failed');
  return parseHistory(await response.json());
}
