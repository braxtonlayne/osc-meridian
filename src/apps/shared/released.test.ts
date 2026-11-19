import { describe, expect, it } from 'vitest';
import { loadTableRows, tableRows } from './released';

const html = `<table><thead><tr><th>PN</th><th>Name</th></tr></thead><tbody>
<tr><td>P-3-06-0977</td><td><span class="rx" data-rx="x-1" data-key="HOLLOW">████</span></td></tr>
<tr><td>P-4-07-0219</td><td><span class="rx-released" data-key="HOLLOW">Jane  Doe</span></td></tr>
<tr><td>Origin</td><td>Plain text</td></tr>
</tbody></table>`;

describe('tableRows', () => {
  it('reads withheld cells as null and released or plain cells as text', () => {
    const rows = tableRows(html);
    expect(rows.get('P-3-06-0977')).toEqual(['P-3-06-0977', null]);
    expect(rows.get('P-4-07-0219')).toEqual(['P-4-07-0219', 'Jane Doe']);
    expect(rows.get('Origin')).toEqual(['Origin', 'Plain text']);
    expect(rows.has('PN')).toBe(false);
  });
  it('loads through the document service', async () => {
    const docs = {
      byDocNo: (d: string) => (d === 'OSC-PER-DIR' ? { id: 'personnel-directory' } : undefined),
      load: async (id: string) => ({ id, html }),
    };
    const rows = await loadTableRows({ docs } as never, 'OSC-PER-DIR');
    expect(rows.get('P-4-07-0219')?.[1]).toBe('Jane Doe');
    expect((await loadTableRows({ docs } as never, 'NOPE')).size).toBe(0);
  });
});
