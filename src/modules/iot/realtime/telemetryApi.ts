export interface TelemetryReading {
  id: number;
  farmId: 'FARM001';
  receivedAt: string;
  telemetry: {
    schemaVersion: 1;
    deviceId: string;
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
const apiPath = (deviceId: string) => `/api/v1/devices/${encodeURIComponent(deviceId)}/telemetry`;
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
  if (!object(t) || t.schemaVersion !== 1 || typeof t.deviceId !== 'string' || !/^[A-Z][A-Z0-9_-]{1,31}$/.test(t.deviceId)
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

export async function fetchLatest(signal: AbortSignal, deviceId = 'ENV01'): Promise<TelemetryReading | null> {
  const response = await fetch(`${apiPath(deviceId)}/latest`, { signal, cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Latest request failed');
  const reading = parseReading(await response.json());
  if (reading.telemetry.deviceId !== deviceId) throw new Error('Device response mismatch');
  return reading;
}
export async function fetchHistory(signal: AbortSignal, deviceId = 'ENV01'): Promise<TelemetryReading[]> {
  const response = await fetch(`${apiPath(deviceId)}?limit=15`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('History request failed');
  const history = parseHistory(await response.json());
  if (history.some(reading => reading.telemetry.deviceId !== deviceId)) throw new Error('History device mismatch');
  return history;
}

export interface SensorArea { id: string; name: string }
export interface SensorSummary { deviceId: string; name: string; areaId: string; sensorType: 'ENVIRONMENT'; latest: TelemetryReading | null }
export async function fetchRegistry(signal: AbortSignal): Promise<{ areas: SensorArea[]; sensors: SensorSummary[] }> {
  const [a, s] = await Promise.all([
    fetch('/api/v1/areas', { signal, cache: 'no-store' }),
    fetch('/api/v1/sensors', { signal, cache: 'no-store' }),
  ]);
  if (!a.ok || !s.ok) throw new Error('Registry unavailable');
  const areas: unknown = await a.json();
  const sensors: unknown = await s.json();
  if (!Array.isArray(areas) || !areas.every(v => object(v) && typeof v.id === 'string' && typeof v.name === 'string')
    || !Array.isArray(sensors) || !sensors.every(v => object(v) && typeof v.deviceId === 'string' && typeof v.name === 'string'
      && typeof v.areaId === 'string' && v.sensorType === 'ENVIRONMENT')) throw new Error('Invalid registry');
  const validated = sensors.map(sensor => {
    const latest = sensor.latest === null ? null : parseReading(sensor.latest);
    if (latest && latest.telemetry.deviceId !== sensor.deviceId) throw new Error('Sensor identity mismatch');
    return { ...sensor, latest } as SensorSummary;
  });
  return { areas: areas as SensorArea[], sensors: validated };
}
export async function registerItem(kind: 'areas' | 'sensors', value: object, signal: AbortSignal): Promise<void> {
  const response = await fetch(`/api/v1/${kind}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value), signal,
  });
  if (!response.ok) {
    if (response.status === 409) throw new Error('Mã đã tồn tại. Với khu vực, tên cũng phải khác khu vực đã có.');
    if (response.status === 400) throw new Error('Kiểm tra mã, tên và khu vực đã chọn.');
    throw new Error('Không lưu được. Kiểm tra backend và tải lại danh sách trước khi thử lại.');
  }
}
