import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameSettings, validSettings } from './wateringSettings';
const defaults = { dryThreshold:30, wetThreshold:35, durationSeconds:20, cooldownSeconds:60, revision:1 };
test('validates independent thresholds and bounded automatic duration/cooldown', () => {
  assert.equal(validSettings(defaults),true);
  assert.equal(validSettings({dryThreshold:90,wetThreshold:100,durationSeconds:30,cooldownSeconds:3600,revision:5}),true);
  for (const invalid of [null,{}, {...defaults,wetThreshold:34},{...defaults,durationSeconds:3600},{...defaults,cooldownSeconds:59},{...defaults,dryThreshold:30.5},{...defaults,revision:0}]) assert.equal(validSettings(invalid),false);
});
test('confirmation compares every field independently of revision', () => {
  assert.equal(sameSettings(defaults,{...defaults,revision:2}),true);
  for(const key of ['dryThreshold','wetThreshold','durationSeconds','cooldownSeconds']) assert.equal(sameSettings(defaults,{...defaults,[key]:99}),false);
});
