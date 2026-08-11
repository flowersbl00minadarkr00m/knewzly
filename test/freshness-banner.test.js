// Unit tests for the pure (DOM-free) freshness computation in
// src/freshness-banner.js — T8, FR-015/NFR-004: freshnessState must render
// truthfully, distinctly per state, and never silently imply freshness.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeFreshness, ageFloorState } from '../src/freshness-banner.js';

const NOW = new Date('2026-08-10T14:00:00Z');
const RECENT = '2026-08-10T13:00:00Z'; // 1h old

test('T8: FreshnessBanner truth-telling', async (t) => {
  await t.test('fresh renders as fresh with a recent timestamp', () => {
    const info = describeFreshness('fresh', RECENT, NOW);
    assert.equal(info.effectiveState, 'fresh');
    assert.equal(info.ageFloored, false);
    assert.equal(info.label, 'Fresh');
  });

  await t.test('stale renders distinctly from fresh', () => {
    const info = describeFreshness('stale', RECENT, NOW);
    assert.equal(info.effectiveState, 'stale');
    assert.notEqual(info.label, 'Fresh');
  });

  await t.test('very_stale renders distinctly from stale', () => {
    const info = describeFreshness('very_stale', RECENT, NOW);
    assert.equal(info.effectiveState, 'very_stale');
    assert.notEqual(info.label, 'Stale');
  });

  await t.test('no_data renders distinctly and is never upgraded to fresh', () => {
    const info = describeFreshness('no_data', RECENT, NOW);
    assert.equal(info.effectiveState, 'no_data');
    assert.equal(info.label, 'No data');
  });

  await t.test('error renders distinctly and is never upgraded to fresh', () => {
    const info = describeFreshness('error', RECENT, NOW);
    assert.equal(info.effectiveState, 'error');
    assert.equal(info.label, 'Error');
  });

  await t.test('all five declared states produce five distinct labels', () => {
    const states = ['fresh', 'stale', 'very_stale', 'no_data', 'error'];
    const labels = new Set(states.map((s) => describeFreshness(s, RECENT, NOW).label));
    assert.equal(labels.size, 5, 'each freshnessState must render a visibly distinct label');
  });

  await t.test('an unrecognized freshnessState fails closed to error, never fresh', () => {
    const info = describeFreshness('totally-made-up', RECENT, NOW);
    assert.equal(info.effectiveState, 'error');
  });

  await t.test('a declared "fresh" state is floored to stale once the data is old enough', () => {
    const oldTimestamp = '2026-08-10T00:00:00Z'; // 14h before NOW
    const info = describeFreshness('fresh', oldTimestamp, NOW);
    assert.notEqual(info.effectiveState, 'fresh');
    assert.equal(info.ageFloored, true);
  });

  await t.test('a declared "fresh" state is floored to very_stale once several days old', () => {
    const daysOld = '2026-08-05T14:00:00Z'; // 5 days (120h) before NOW — within the 48h-14d band
    const info = describeFreshness('fresh', daysOld, NOW);
    assert.equal(info.effectiveState, 'very_stale');
    assert.equal(info.ageFloored, true);
  });

  await t.test('a declared "fresh" state is floored to error once extremely old', () => {
    const ancient = '2026-07-01T00:00:00Z'; // ~40 days before NOW
    const info = describeFreshness('fresh', ancient, NOW);
    assert.equal(info.effectiveState, 'error');
    assert.equal(info.ageFloored, true);
  });

  await t.test('age floor never downgrades an already-worse declared state', () => {
    // Declared "error" must stay "error" even if the timestamp is recent —
    // the CI job's own signal is never overridden toward looking better.
    const info = describeFreshness('error', RECENT, NOW);
    assert.equal(info.effectiveState, 'error');
  });

  await t.test('a missing lastUpdated fails closed to error, never displayed as fresh', () => {
    const info = describeFreshness('fresh', undefined, NOW);
    assert.equal(info.effectiveState, 'error');
    assert.equal(info.lastUpdatedDisplay, 'unknown');
  });

  await t.test('an unparseable lastUpdated fails closed to error', () => {
    const info = describeFreshness('fresh', 'not-a-date', NOW);
    assert.equal(info.effectiveState, 'error');
  });

  await t.test('ageFloorState returns null for a fresh, in-range age', () => {
    assert.equal(ageFloorState(1), null);
  });

  await t.test('ageFloorState returns null for a negative/invalid age', () => {
    assert.equal(ageFloorState(-1), null);
    assert.equal(ageFloorState(NaN), null);
  });
});
