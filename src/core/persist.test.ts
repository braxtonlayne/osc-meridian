import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _resetForTests, flush, load, loadFrom, loadSync, migrateLegacy, save, saveSync, setActiveAccount, storageKey } from './persist';

beforeEach(() => {
  localStorage.clear();
  _resetForTests();
});
afterEach(() => _resetForTests());

describe('persist namespacing', () => {
  it('prefixes account keys and leaves global keys alone', () => {
    expect(storageKey('audit')).toBe('meridian:acct:analyst:audit');
    expect(storageKey('wm:pos', 'deputy')).toBe('meridian:acct:deputy:wm:pos');
    expect(storageKey('settings', 'deputy')).toBe('meridian:settings');
    expect(storageKey('activeAccount', 'auditor')).toBe('meridian:activeAccount');
  });

  it('keeps each account in its own namespace (no bleed)', async () => {
    setActiveAccount('analyst');
    save('mail', { delivered: ['a'] }, 0);
    await flush();
    setActiveAccount('deputy');
    expect(await load('mail', null)).toBeNull();
    save('mail', { delivered: ['d'] }, 0);
    await flush();
    expect(await load('mail', null)).toEqual({ delivered: ['d'] });
    expect(await loadFrom('analyst', 'mail', null)).toEqual({ delivered: ['a'] });
    expect(localStorage.getItem('meridian:acct:analyst:mail')).toBe(JSON.stringify({ delivered: ['a'] }));
  });

  it('flush writes coalesced values immediately', async () => {
    save('audit', [1, 2], 10_000);
    expect(localStorage.getItem('meridian:acct:analyst:audit')).toBeNull();
    await flush();
    expect(localStorage.getItem('meridian:acct:analyst:audit')).toBe('[1,2]');
  });

  it('settings stay global across accounts', () => {
    setActiveAccount('auditor');
    saveSync('settings', { sound: true });
    setActiveAccount('lifesupport');
    expect(loadSync('settings', null)).toEqual({ sound: true });
    expect(localStorage.getItem('meridian:settings')).toBe('{"sound":true}');
  });
});

describe('legacy migration', () => {
  it('moves pass-one unprefixed keys into analyst once', async () => {
    localStorage.setItem('meridian:audit', '[{"seq":1}]');
    localStorage.setItem('meridian:wm:pos', '{"x":1}');
    localStorage.setItem('meridian:settings', '{"sound":false}');
    localStorage.setItem('meridian:activeAccount', 'analyst');
    localStorage.setItem('meridian:shared:isolation', '{"level":1}');
    localStorage.setItem('meridian:acct:deputy:audit', '[]');

    const moved = await migrateLegacy();
    expect(moved.sort()).toEqual(['audit', 'wm:pos']);
    expect(localStorage.getItem('meridian:acct:analyst:audit')).toBe('[{"seq":1}]');
    expect(localStorage.getItem('meridian:acct:analyst:wm:pos')).toBe('{"x":1}');
    expect(localStorage.getItem('meridian:audit')).toBeNull();
    expect(localStorage.getItem('meridian:wm:pos')).toBeNull();
    // Global, shared and already-namespaced keys are untouched.
    expect(localStorage.getItem('meridian:settings')).toBe('{"sound":false}');
    expect(localStorage.getItem('meridian:activeAccount')).toBe('analyst');
    expect(localStorage.getItem('meridian:shared:isolation')).toBe('{"level":1}');
    expect(localStorage.getItem('meridian:acct:deputy:audit')).toBe('[]');
  });

  it('runs once and never overwrites namespaced data', async () => {
    localStorage.setItem('meridian:acct:analyst:mail', '"new"');
    localStorage.setItem('meridian:mail', '"old"');
    await migrateLegacy();
    expect(localStorage.getItem('meridian:acct:analyst:mail')).toBe('"new"');
    localStorage.setItem('meridian:recent', '["x"]');
    expect(await migrateLegacy()).toEqual([]);
    expect(localStorage.getItem('meridian:recent')).toBe('["x"]');
  });
});
