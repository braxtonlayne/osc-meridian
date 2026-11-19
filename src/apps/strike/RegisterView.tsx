/** Strike app: scenario register and two-entry comparison. */
import { useMemo } from 'preact/hooks';
import type { AccountDef, AccountId } from '@core/contracts';
import { DataTable, PropertyGrid, Select, StatusLight, ToolbarButton, Toolbar, ToolbarLabel, ToolbarSeparator, type Column } from '@design/index';
import { MarkerGlyph } from '@graphics/map';
import { conditionRank, evaluate, type Evaluation } from './model';
import { S, canon, conditionStatus, fmtKt, fmtMi, fmtPsi, frag, whenText } from './shared';
import type { StrikeScenario } from './types';

export interface RegisterViewProps {
  entries: StrikeScenario[];
  total: number;
  auditor: boolean;
  me: AccountId;
  accounts: AccountDef[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onOpen: (s: StrikeScenario) => void;
  onCompare: () => void;
  onWithdraw: () => void;
  onQuery: () => void;
  onPrint: () => void;
  isolatedNote: string | null;
}

export function statusOf(s: StrikeScenario): string {
  if (s.withdrawn) return 'WITHDRAWN';
  if (s.query) return `QUERY ${s.query.ref}`;
  return 'OPEN';
}

export function RegisterView(p: RegisterViewProps) {
  const who = (id: AccountId) => p.accounts.find((a) => a.id === id);
  const columns: Column<StrikeScenario>[] = [
    { key: 'id', header: 'Entry', width: 104, mono: true },
    ...(p.auditor
      ? [
          {
            key: 'account',
            header: 'Operator',
            width: 190,
            sortValue: (s: StrikeScenario) => s.operatorId,
            render: (s: StrikeScenario) => (
              <span>
                <span class="mono">{s.operatorId}</span> {who(s.account)?.roleTitle ?? ''}
              </span>
            ),
          } as Column<StrikeScenario>,
        ]
      : []),
    { key: 'at', header: 'Entered', width: 236, mono: true, render: (s) => whenText(s.at) },
    { key: 'anchor', header: 'Point', mono: true, wrap: true, render: (s) => (s.remark ? `${s.anchor} (${s.remark})` : s.anchor) },
    { key: 'kt', header: 'Yield', width: 70, align: 'right', mono: true, render: (s) => fmtKt(s.kt) },
    { key: 'aff', header: 'Affected', width: 70, align: 'right', mono: true, sortValue: (s) => s.summary.affected, render: (s) => `${s.summary.affected} of ${s.summary.evaluated}` },
    {
      key: 'worst',
      header: 'Worst condition',
      width: 200,
      wrap: true,
      sortValue: (s) => (s.summary.worst ? conditionRank(S, s.summary.worst) : -1),
      render: (s) => (s.summary.worst ? <StatusLight status={conditionStatus(s.summary.worst)} word={s.summary.worst} note={s.summary.worstSites} /> : <span class="stk-dim">None affected</span>),
    },
    { key: 'status', header: 'Status', width: 130, mono: true, sortValue: statusOf, render: statusOf },
  ];
  const one = p.selected.length === 1 ? p.entries.find((e) => e.id === p.selected[0]) : undefined;
  return (
    <div class="stk-reg">
      <Toolbar label="Register toolbar">
        <ToolbarButton label="Open in estimate" disabled={!one} onClick={() => one && p.onOpen(one)} title="Load the selected entry's point and yield and run it (Enter)" />
        <ToolbarButton label="Compare" disabled={p.selected.length !== 2} onClick={p.onCompare} title="Compare the two selected entries" />
        <ToolbarSeparator />
        <ToolbarButton label="Print sheet" disabled={!one} onClick={p.onPrint} title="Print the planning estimate sheet for the selected entry" />
        {p.auditor ? (
          <ToolbarButton label="Raise review query..." disabled={!one} onClick={p.onQuery} title="Raise an OIA review query on the selected entry" />
        ) : (
          <ToolbarButton label="Withdraw..." disabled={!one} onClick={p.onWithdraw} title="Withdraw the selected entry (own entries only)" />
        )}
        <ToolbarLabel>
          {p.auditor ? `All operators: ${p.entries.length} entries` : `Own entries: ${p.entries.length} of ${p.total} in the register`}
        </ToolbarLabel>
      </Toolbar>
      {p.isolatedNote ? <p class="stk-note stk-note--bar">{p.isolatedNote}</p> : null}
      <div class="stk-reg__table">
        <DataTable
          columns={columns}
          rows={p.entries}
          rowKey={(s) => s.id}
          label={`Planning register, ${p.entries.length} entries`}
          selection="multi"
          selected={p.selected}
          onSelectionChange={p.onSelect}
          onActivate={p.onOpen}
          defaultSort={{ key: 'id', dir: 'desc' }}
          dense
          zebra
          rowClass={(s) => (s.withdrawn ? 'stk-row-dim' : undefined)}
          empty={<span>{p.auditor ? 'No operator has made an entry in the planning register.' : 'No entries of yours are held in the planning register. Run an estimate and select Enter in register.'}</span>}
        />
      </div>
      <p class="stk-foot">
        The register is held at {canon.survivability.model.originator}. Entries are not deleted; an entry may be withdrawn by the operator who made it, and the withdrawal is itself recorded.
        {p.auditor ? ' Review runs made from this view are not entered in the register.' : ''}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- compare */

export interface CompareViewProps {
  entries: StrikeScenario[];
  a: string;
  b: string;
  onA: (id: string) => void;
  onB: (id: string) => void;
  depths: Partial<Record<string, number>>;
}

interface CmpRow {
  id: string;
  ra?: Evaluation['rows'][number];
  rb?: Evaluation['rows'][number];
}

export function CompareView(p: CompareViewProps) {
  const ea = p.entries.find((e) => e.id === p.a);
  const eb = p.entries.find((e) => e.id === p.b);
  const evA = useMemo(() => (ea ? evaluate(canon, frag, ea, ea.kt, p.depths) : null), [ea?.id, p.depths]);
  const evB = useMemo(() => (eb ? evaluate(canon, frag, eb, eb.kt, p.depths) : null), [eb?.id, p.depths]);
  const rows = useMemo<CmpRow[]>(() => {
    const ids = new Set<string>();
    for (const ev of [evA, evB]) for (const r of ev?.rows ?? []) if (r.op.band !== 'below') ids.add(r.id);
    return [...ids].sort().map((id) => ({ id, ra: evA?.rows.find((r) => r.id === id), rb: evB?.rows.find((r) => r.id === id) }));
  }, [evA, evB]);
  const opts = p.entries.map((e) => ({ value: e.id, label: `${e.id}  ${fmtKt(e.kt)}  ${e.anchor}` }));
  const cell = (r: CmpRow['ra']) => (r ? <StatusLight status={conditionStatus(r.condition)} word={r.condition} note={`${fmtPsi(r.op)} psi at ${fmtMi(r.distanceMi)} mi`} /> : <span class="stk-dim">not evaluated</span>);
  const change = (r: CmpRow) => {
    if (!r.ra || !r.rb) return '';
    const d = conditionRank(S, r.rb.condition) - conditionRank(S, r.ra.condition);
    return d === 0 ? 'SAME' : d > 0 ? 'WORSE IN B' : 'BETTER IN B';
  };
  const columns: Column<CmpRow>[] = [
    { key: 'id', header: 'Installation', width: 120, mono: true, render: (r) => <span class="stk-site"><MarkerGlyph cls={canon.facilities.find((f) => f.id === r.id)!.class} size={14} />{r.id}</span> },
    { key: 'a', header: `A ${p.a}`, sortable: false, render: (r) => cell(r.ra) },
    { key: 'b', header: `B ${p.b}`, sortable: false, render: (r) => cell(r.rb) },
    { key: 'chg', header: 'Change', width: 110, mono: true, sortValue: change, render: change },
  ];
  const side = (e: StrikeScenario | undefined, ev: Evaluation | null, tag: string) =>
    e && ev ? (
      <PropertyGrid
        caption={`${tag}: ${e.id}`}
        rows={[
          { label: 'Point', value: e.anchor, mono: true },
          { label: 'Yield', value: fmtKt(e.kt), mono: true },
          { label: 'Entered', value: `${whenText(e.at)} by ${e.operatorId}`, mono: true },
          { label: 'Outer ring', value: `${S.contours[0]!.psi} psi at ${fmtMi(ev.ranges[0]!.rangeMi)} mi`, mono: true },
          { label: 'At entry', value: e.summary.worst ? `${e.summary.worst}: ${e.summary.worstSites}` : 'None affected' },
          { label: 'Status', value: statusOf(e), mono: true },
        ]}
      />
    ) : null;
  return (
    <div class="stk-cmp">
      <div class="stk-cmp__pick">
        <Select label="Entry A" value={p.a} onChange={p.onA} options={opts} emptyLabel="(select an entry)" />
        <Select label="Entry B" value={p.b} onChange={p.onB} options={opts} emptyLabel="(select an entry)" />
      </div>
      {ea && eb ? (
        <>
          <div class="stk-cmp__sides">
            {side(ea, evA, 'A')}
            {side(eb, evB, 'B')}
          </div>
          <div class="stk-cmp__table">
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              label={`Comparison of ${p.a} and ${p.b}`}
              caption="Installations inside the outer contour of either entry, re-evaluated at this workstation"
              dense
              zebra
              wrap
              empty={<span>Neither entry places an evaluated installation inside its outer contour.</span>}
            />
          </div>
        </>
      ) : (
        <p class="stk-note">Select two entries to compare. In the register, select two rows and choose Compare.</p>
      )}
    </div>
  );
}
