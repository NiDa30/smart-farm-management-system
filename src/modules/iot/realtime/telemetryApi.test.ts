import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReading, parseHistory, telemetryState } from './telemetryApi';

const now = Date.parse('2026-10-13T09:06:20Z');
const sample = {
  id: 5, farmId: 'FARM001', receivedAt: '2026-10-13T09:06:19Z',
  telemetry: { schemaVersion: 1, deviceId: 'ENV01', bootId: 'ab6cfc5e-18ff-4a01-852b-03604df6b52f',
    sequence: 15, timestamp: '2026-10-13T09:06:14Z', temperature: 24,
    humidity: 40, soilMoisture: 100, uptimeMs: 64419 },
};

test('polling success does not make an old reading fresh', () => {
  const reading = parseReading(sample);
  assert.equal(telemetryState('ready', reading, now), 'live');
  assert.equal(telemetryState('ready', reading, now + 31_000), 'stale');
  assert.equal(telemetryState('error', reading, now), 'error');
  assert.equal(telemetryState('empty', null, now), 'empty');
  const future = parseReading({ ...sample, telemetry: { ...sample.telemetry, timestamp: '2026-10-13T10:00:00Z' } });
  assert.equal(telemetryState('ready', future, now), 'stale');
});

test('invalid numbers or wrong device cannot populate sensor cards', () => {
  for (const values of [{ humidity: '40' }, { soilMoisture: 101 }, { temperature: NaN }, { deviceId: 'OTHER' }]) {
    assert.throws(() => parseReading({ ...sample, telemetry: { ...sample.telemetry, ...values } }));
  }
  assert.throws(() => parseReading({ ...sample, receivedAt: 'not-a-date' }));
});

test('history redelivery is deduplicated by database ID and ordered by source time', () => {
  const newer = { ...sample, id: 6, telemetry: { ...sample.telemetry, timestamp: '2026-10-13T09:06:19Z' } };
  assert.deepEqual(parseHistory([sample, newer, sample]).map(reading => reading.id), [6, 5]);
});
