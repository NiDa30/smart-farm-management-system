const ago = (s: number) => new Date(Date.now() - s * 1000).toISOString();
const reading = (deviceId: string, s: number) => ({ id: 1, farmId: 'FARM001', receivedAt: ago(s), telemetry: { schemaVersion: 1, deviceId, bootId: '3e4d1219-4d80-456c-8561-ec0b744f5184',
  sequence: 1, timestamp: ago(s), temperature: 28.4, humidity: 71.2, soilMoisture: 42.5, uptimeMs: 1000 } });
const device = (deviceId: string, kind: string, extra: Record<string, unknown> = {}) => ({ deviceId, name: deviceId, kind, areaId: kind === 'SENSOR' ? 'A1' : null, areaName: null,
  observedAt: ago(3), receivedAt: ago(3), lastMessageAt: ago(3), dataState: 'FRESH', activity: 'RECENT', temperature: null, humidity: null, soilMoisture: null,
  reportedState: kind === 'ACTUATOR' ? 'OFF' : null, safetyLockout: kind === 'ACTUATOR' ? false : null, activeAlerts: 0, ...extra });
const actuator = (id: string, type: string, extra: Record<string, unknown> = {}) => ({ actuatorId: id, actuatorType: type, zoneName: type === 'VALVE' ? `Zone ${id.slice(-1)}` : null,
  maxSeconds: type === 'VALVE' ? 3600 : type === 'MIST' ? 600 : 14400, reportedState: 'OFF', safetyLockout: false, stateReason: 'BOOT', fresh: true, observedAt: ago(2), ...extra });
const settings = { telemetrySeconds: 5, heartbeatSeconds: 10, soilWetAdc: 0, soilDryAdc: 4095, pumpMaxSeconds: 3600 };
const cmds = (extra = {}) => ({ total: 4, executed: 3, failed: 1, timedOut: 0, uncertain: 0, errors: { NO_VALVE_OPEN: 1 }, ...extra });
const run = (id: string, type: string, seconds: number, watts: number | null) => ({ actuatorId: id, actuatorType: type, ratedWatts: watts, seconds,
  kilowattHours: watts === null ? null : Math.round(seconds * watts / 3600) / 1000, days: seconds ? [{ day: '2026-11-21', seconds, kilowattHours: watts === null ? null : Math.round(seconds * watts / 3600) / 1000 }] : [] });

export function data() {
  return {
    '/api/v1/nodes': { farmId: 'FARM001', asOf: ago(0), nodes: [
      { nodeId: 'ENV01', name: 'Bộ điều khiển', areaId: 'A1', nodeType: 'ENVIRONMENT', telemetryVersion: 1,
        channels: [{ channelId: 'TEMP', metric: 'AIR_TEMPERATURE', unit: '°C', calibrationVersion: null, latest: { value: 28.4, quality: 'VALID', observedAt: ago(3), receivedAt: ago(3),
          bootId: '3e4d1219-4d80-456c-8561-ec0b744f5184', sequence: 9, calibrationVersion: null, dataSource: 'PHYSICAL' } }],
        actuators: [{ actuatorId: 'PUMP01', actuatorType: 'PUMP', commandContract: 'PUMP_V1' }, { actuatorId: 'FAN01', actuatorType: 'FAN', commandContract: 'ACTUATOR_V3' }, { actuatorId: 'VALVE01', actuatorType: 'VALVE', commandContract: 'ACTUATOR_V3' }] },
      { nodeId: 'WATER01', name: 'Trạm bồn', areaId: 'A1', nodeType: 'WATER', telemetryVersion: 2, actuators: [],
        channels: [{ channelId: 'LOW', metric: 'WATER_PRESENT', unit: 'boolean', calibrationVersion: null, latest: { value: true, quality: 'VALID', observedAt: ago(120), receivedAt: ago(120),
          bootId: '3e4d1219-4d80-456c-8561-ec0b744f5184', sequence: 3, calibrationVersion: null, dataSource: 'SIMULATOR' } }] }] },
    '/api/v1/monitoring': { asOf: ago(0), mqtt: { state: 'CONNECTED', changedAt: ago(600), lastProcessedAt: ago(2) },
      devices: [device('ENV01', 'SENSOR'), device('PUMP01', 'ACTUATOR', { reportedState: 'ON' })] },
    '/api/v1/actuators': { enabled: true, actuators: [actuator('VALVE01', 'VALVE', { reportedState: 'ON', stateReason: 'COMMAND_ON' }), actuator('VALVE02', 'VALVE'),
      actuator('FAN01', 'FAN', { fresh: false, reportedState: 'UNKNOWN', observedAt: ago(90) }), actuator('MIST01', 'MIST', { safetyLockout: true, stateReason: 'WATER_LOW' })] },
    '/api/v1/areas': [{ id: 'A1', name: 'Khu A' }, { id: 'A2', name: 'Khu B' }],
    '/api/v1/sensors': [{ deviceId: 'ENV01', name: 'Cảm biến A', areaId: 'A1', sensorType: 'ENVIRONMENT', latest: reading('ENV01', 3) },
      { deviceId: 'ENV02', name: 'Cảm biến B', areaId: 'A2', sensorType: 'ENVIRONMENT', latest: reading('ENV02', 600) }],
    '/api/v1/automation/zone-sequence': { enabled: true, recent: [], current: { id: 3, state: 'RUNNING', createdAt: ago(60), finishedAt: null, result: null, currentStep: 1,
      steps: [{ stepNo: 1, valveId: 'VALVE01', zoneName: 'Zone 1', pumpSeconds: 120, phase: 'WATERING', phaseStartedAt: ago(30), result: null }] } },
    '/api/v1/devices/ENV01/config': { enabled: true, requests: [], device: { revision: 6, settings, firmwareVersion: '1.4.0', partition: 'app1', otaTrial: true, observedAt: ago(4) } },
    '/api/v1/devices/ENV01/ota': { enabled: true, signingKeyConfigured: true, runningVersion: '1.4.0', releases: [], jobs: [{ otaId: '0a7f3b2e-58c1-4d1e-a0f4-6b9e2d7c4a35',
      version: '1.4.0', fromVersion: '1.3.0', issuedAt: ago(300), state: 'REBOOTING', progress: 100, errorCode: null, updatedAt: ago(30) }] },
    '/api/v1/health-alerts': [{ id: 1, deviceId: 'WATER01', type: 'DEVICE_OFFLINE', channelId: null, openedAt: ago(60), detail: 'silent', clearedAt: null, acknowledgedAt: null, acknowledgementNote: null },
      { id: 2, deviceId: 'ENV01', type: 'STUCK_VALUE', channelId: 'SOIL', openedAt: ago(9000), detail: 'x', clearedAt: ago(8000), acknowledgedAt: null, acknowledgementNote: null }],
    '/api/v1/water-alerts': [],
    '/api/v1/iot/energy': { days: 7, from: ago(7 * 86400), to: ago(0), method: 'ESTIMATED_FROM_RUNTIME', totalKilowattHours: 0.1,
      actuators: [run('PUMP01', 'PUMP', 900, null), run('FAN01', 'FAN', 1800, 200)], unrated: ['PUMP01'] },
    '/api/v1/iot/analytics': { days: 7, from: ago(7 * 86400), to: ago(0), pump: cmds(), actuators: cmds({ total: 0, executed: 0, failed: 0, errors: {} }), wateringRuns: 5,
      sequencesCompleted: 2, sequencesAborted: 1, alertsOpened: { SENSOR: 3, WATER: 0, DEVICE_HEALTH: 1 }, runtime: [run('PUMP01', 'PUMP', 5400, null)] },
    '/api/v1/monitoring/statistics': { from: ago(86400), to: ago(0), hours: 24, cadenceSeconds: 5, gapSeconds: 30, spikeTemperature: 10, spikeSoilMoisture: 30, devices: [] },
  } as Record<string, unknown>;
}

