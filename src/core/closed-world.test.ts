import { describe, expect, it } from 'vitest';
import { closeWorldDeep, closeWorldText } from './closed-world';

describe('closed world (Tier 4)', () => {
  it('keeps the division of an office at another site and the own site as written', () => {
    expect(closeWorldText('CMS/ALPHA-02', 'GAMMA-08')).toBe('CMS');
    expect(closeWorldText('FE/GAMMA-08', 'GAMMA-08')).toBe('FE/GAMMA-08');
  });
  it('drops a trailing site after an office name and replaces other bare sites', () => {
    expect(closeWorldText('Network Control, ALPHA-01', 'GAMMA-08')).toBe('Network Control');
    expect(closeWorldText('tram to ALPHA-05 from GAMMA-08', 'GAMMA-08')).toBe('tram to another site from GAMMA-08');
  });
  it('walks frontmatter', () => {
    expect(closeWorldDeep({ routing: [{ office: 'TO/ALPHA-01 Network Control, Watch 1' }], n: 3 }, 'GAMMA-08')).toEqual({ routing: [{ office: 'TO Network Control, Watch 1' }], n: 3 });
  });
});
