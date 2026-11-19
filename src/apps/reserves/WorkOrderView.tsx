/**
 * Work order lookup: citations of work orders in canon reactor status notes and in the
 * Reserves records this operator may open. Work order records themselves are held by the
 * originating division and are not displayed here.
 */
import { Button, DataTable, FieldMessage, GroupBox, PropertyGrid, TextField } from '@design/index';
import type { Column } from '@design/index';
import { Redaction } from '@design/index';
import { canon, division } from './data';
import { LinkButton, useRsv } from './parts';
import type { ExcerptPart, WorkOrder } from './workorders';
import { workOrderPattern } from './workorders';

export interface WoState {
  selected: string | null;
  query: string;
  message: string | null;
}

export const initialWo = (selected: string | null = null): WoState => ({ selected, query: selected ?? '', message: null });

function Excerpt({ parts }: { parts: ExcerptPart[] }) {
  const { onRxHover } = useRsv();
  return (
    <span class="rsv-excerpt">
      {parts.map((p, i) =>
        'text' in p ? <span key={i}>{p.text}</span> : <Redaction key={i} len={p.rx.len} auth={p.rx.auth} reference={p.rx.ref} onHover={onRxHover} />,
      )}
    </span>
  );
}

export function WorkOrderLookup({
  register,
  scanned,
  loading,
  state,
  onChange,
  onOpenSource,
  onRecord,
  onSearch,
}: {
  register: WorkOrder[];
  scanned: string[];
  loading: boolean;
  state: WoState;
  onChange: (s: WoState) => void;
  onOpenSource: (route: string) => void;
  onRecord: (wo: string) => void;
  onSearch: (q: string) => void;
}) {
  const pattern = workOrderPattern(canon.divisions.map((d) => d.id));
  const sel = register.find((w) => w.no === state.selected) ?? null;

  const find = () => {
    const q = state.query.trim().toUpperCase();
    if (!q) {
      onChange({ ...state, message: 'REJECTED: enter a work order number.' });
      return;
    }
    onSearch(q);
    const valid = new RegExp(`^${pattern.source.replace(/\\b/g, '')}$`).test(q);
    if (!valid) {
      onChange({ ...state, message: `REJECTED: ${q} is not a work order number. Work orders are numbered by division, year and serial, for example FE-08-0001.` });
      return;
    }
    const hit = register.find((w) => w.no === q);
    if (!hit) {
      onChange({ ...state, selected: null, message: `NOTE: ${q} is not cited in the records searched. Work order records are held by the originating division.` });
      return;
    }
    onChange({ ...state, selected: hit.no, message: null });
  };

  const columns: Column<WorkOrder>[] = [
    { key: 'no', header: 'Work order', width: 100, mono: true },
    { key: 'division', header: 'Division', render: (w) => division(w.division)?.name ?? w.division, sortValue: (w) => w.division },
    { key: 'year', header: 'Year', width: 54, mono: true, render: (w) => `20${w.year}` },
    { key: 'cites', header: 'Citations', width: 70, align: 'right', mono: true, sortValue: (w) => w.citations.length, render: (w) => String(w.citations.length) },
  ];

  const div = sel ? division(sel.division) : null;

  return (
    <div class="rsv-stack">
      <GroupBox title="Find a work order">
        <form
          class="rsv-find__form"
          onSubmit={(e) => {
            e.preventDefault();
            find();
          }}
        >
          <TextField label="Work order no." mono upper width={130} value={state.query} onInput={(v) => onChange({ ...state, query: v, message: null })} layout="inline" />
          <Button label="&Look up" size="small" onClick={find} />
        </form>
        {state.message ? <FieldMessage kind={state.message.startsWith('NOTE') ? 'notice' : 'error'}>{state.message}</FieldMessage> : null}
        <p class="rsv-note">
          {loading
            ? 'Searching Reserves records for work order citations.'
            : `Searched ${scanned.length} records and ${canon.reactors.length} reactor status reports. Citations are shown as they appear in each record; withheld text stays withheld.`}
        </p>
      </GroupBox>
      <div class="rsv-cols rsv-cols--wo">
        <DataTable
          columns={columns}
          rows={register}
          rowKey={(w) => w.no}
          label={`Work orders cited, ${register.length} records`}
          selection="single"
          selected={state.selected ? [state.selected] : []}
          onSelectionChange={(k) => onChange({ ...state, selected: k[0] ?? null, query: k[0] ?? state.query, message: null })}
          dense
          empty={loading ? 'Searching.' : 'No work orders are cited in the records searched.'}
        />
        {sel ? (
          <GroupBox title={`Work order ${sel.no}`}>
            <PropertyGrid
              rows={[
                { label: 'Work order', value: sel.no, mono: true },
                { label: 'Originating division', value: div ? `${div.name} (${div.id})${div.site ? `, ${div.site}` : ''}` : sel.division },
                { label: 'Year', value: `20${sel.year}`, mono: true },
                { label: 'Serial', value: sel.serial, mono: true },
                { label: 'Cited in', value: `${sel.citations.length} record${sel.citations.length === 1 ? '' : 's'}` },
              ]}
            />
            <table class="rsv-cites">
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Citation</th>
                </tr>
              </thead>
              <tbody>
                {sel.citations.map((c, i) => (
                  <tr key={i}>
                    <td class="rsv-mono">
                      {c.route ? (
                        <LinkButton onClick={() => onOpenSource(c.route!)} title={c.title}>
                          {c.source}
                        </LinkButton>
                      ) : (
                        <span title={c.title}>{c.source}</span>
                      )}
                    </td>
                    <td>
                      <Excerpt parts={c.excerpt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div class="rsv-row-end">
              <Button label="Open work order &record..." size="small" onClick={() => onRecord(sel.no)} />
            </div>
          </GroupBox>
        ) : (
          <GroupBox title="Work order">
            <p class="rsv-note">Select a work order to list the records that cite it.</p>
          </GroupBox>
        )}
      </div>
    </div>
  );
}
