import { describe, expect, it } from 'vitest';
import { divisionLabel, resetKeys, viewFor, visibleTo } from './logic';

describe('accounts in System Tools', () => {
  it('labels the command post division', () => {
    const divs = [{ id: 'RD', name: 'Records Division' }];
    expect(divisionLabel('CMD', divs)).toBe('Facility Command');
    expect(divisionLabel('RD', divs)).toBe('Records Division');
    expect(divisionLabel('ZZ', divs)).toBe('ZZ');
  });

  it('routes the credentials page', () => {
    expect(viewFor('/system/credentials')).toBe('credentials');
  });

  it('applies the Tier 4 rule to listings', () => {
    const t4 = { id: 'lifesupport' as const, tier: 4 as const };
    expect(visibleTo({ t4: true }, t4)).toBe(true);
    expect(visibleTo({ variants: ['lifesupport'] }, t4)).toBe(true);
    expect(visibleTo({}, t4)).toBe(false);
    expect(visibleTo({}, { id: 'analyst', tier: 3 })).toBe(true);
  });

  it('selects reset keys by scope and never touches global keys', () => {
    const keys = [
      'meridian:settings',
      'meridian:activeAccount',
      'meridian:acct:analyst:audit',
      'meridian:acct:analyst:mail',
      'meridian:acct:deputy:audit',
      'meridian:shared:traces',
      'meridian:shared:isolation',
      'meridian:terminal:prefs',
      'other:thing',
    ];
    expect(resetKeys(keys, 'profile', 'analyst')).toEqual(['meridian:acct:analyst:audit', 'meridian:acct:analyst:mail']);
    expect(resetKeys(keys, 'profile', 'auditor')).toEqual([]);
    expect(resetKeys(keys, 'all', 'analyst')).toEqual([
      'meridian:acct:analyst:audit',
      'meridian:acct:analyst:mail',
      'meridian:acct:deputy:audit',
      'meridian:shared:traces',
      'meridian:shared:isolation',
    ]);
    // A profile reset never clears the shared plant state.
    expect(resetKeys(keys, 'profile', 'deputy').some((k) => k.startsWith('meridian:shared:'))).toBe(false);
  });
});
