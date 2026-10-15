export interface IoTEvent {
  id: string; eventAt: string; sourceAt: string | null; recordedAt: string | null;
  category: 'ALERT' | 'COMMAND' | 'DEVICE' | 'RULE';
  type: 'ALERT_OPENED' | 'ALERT_CLEARED' | 'ALERT_ACKNOWLEDGED' | 'VALVE_ALERT_OPENED' | 'VALVE_ALERT_CLEARED' | 'VALVE_ALERT_ACKNOWLEDGED' | 'COMMAND_CREATED' | 'COMMAND_ACK' | 'DEVICE_STATE' | 'RULE_STARTED';
  deviceId: string; action: string | null; state: string; reason: string | null;
  value: number | null; commandId: string | null; runId: number | null;
}
export interface EventPage { items: IoTEvent[]; nextCursor: string | null; from: string; to: string }
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function parseEventPage(value: unknown): EventPage {
  if (!value || typeof value !== 'object') throw new Error('Invalid event page');
  const page = value as Record<string, unknown>;
  if (!date(page.from) || !date(page.to) || Date.parse(page.from) >= Date.parse(page.to)
    || !(page.nextCursor === null || typeof page.nextCursor === 'string' && page.nextCursor.length <= 512)
    || !Array.isArray(page.items) || !page.items.every(v => v && typeof v.id === 'string' && date(v.eventAt)
      && ['ALERT','COMMAND','DEVICE','RULE'].includes(v.category)
      && ['ALERT_OPENED','ALERT_CLEARED','ALERT_ACKNOWLEDGED','VALVE_ALERT_OPENED','VALVE_ALERT_CLEARED','VALVE_ALERT_ACKNOWLEDGED','COMMAND_CREATED','COMMAND_ACK','DEVICE_STATE','RULE_STARTED'].includes(v.type)
      && typeof v.deviceId === 'string' && /^[A-Z][A-Z0-9_-]{1,31}$/.test(v.deviceId) && typeof v.state === 'string'
      && (v.sourceAt === null || date(v.sourceAt)) && (v.recordedAt === null || date(v.recordedAt))
      && (v.action === null || typeof v.action === 'string') && (v.reason === null || typeof v.reason === 'string')
      && (v.value === null || typeof v.value === 'number' && Number.isFinite(v.value))
      && (v.commandId === null || typeof v.commandId === 'string' && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(v.commandId))
      && (v.runId === null || Number.isSafeInteger(v.runId) && v.runId > 0))) throw new Error('Invalid event page');
  return page as unknown as EventPage;
}
export async function fetchEvents(params: URLSearchParams, signal: AbortSignal): Promise<EventPage> {
  const response = await fetch(`/api/v1/events?${params}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Không tải được nhật ký. Kiểm tra backend rồi thử lại.');
  return parseEventPage(await response.json());
}
