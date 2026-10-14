export interface WateringSettings {
  dryThreshold: number;
  wetThreshold: number;
  durationSeconds: number;
  cooldownSeconds: number;
  revision: number;
}
export function validSettings(value: unknown): value is WateringSettings {
  if (!value || typeof value !== 'object') return false;
  const s = value as WateringSettings;
  return [s.dryThreshold, s.wetThreshold, s.durationSeconds, s.cooldownSeconds, s.revision].every(Number.isSafeInteger)
    && s.dryThreshold >= 1 && s.dryThreshold <= 90
    && s.wetThreshold >= s.dryThreshold + 5 && s.wetThreshold <= 100
    && s.durationSeconds >= 1 && s.durationSeconds <= 30
    && s.cooldownSeconds >= 60 && s.cooldownSeconds <= 3600 && s.revision >= 1;
}
export function sameSettings(a: WateringSettings, b: WateringSettings): boolean {
  return a.dryThreshold === b.dryThreshold && a.wetThreshold === b.wetThreshold
    && a.durationSeconds === b.durationSeconds && a.cooldownSeconds === b.cooldownSeconds;
}
