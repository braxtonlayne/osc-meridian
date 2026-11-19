import { describe, expect, it } from 'vitest';
import { setBoardShowing } from './board';

describe('transit board visibility report', () => {
  it('reports visible while any transit window shows the board, and only on change', () => {
    const calls: boolean[] = [];
    const r = (v: boolean) => calls.push(v);
    const a = {};
    const b = {};
    setBoardShowing(a, true, r);
    setBoardShowing(b, true, r);
    setBoardShowing(a, false, r); // b still shows it
    setBoardShowing(b, false, r); // minimised / closed / switched view
    setBoardShowing(b, false, r);
    expect(calls).toEqual([true, false]);
  });
});
