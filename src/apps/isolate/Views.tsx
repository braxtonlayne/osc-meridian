/** The isolate app's views: control panel, initiation register, restoration, hub links, site view (Tier 4). */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { AccountId } from '@core/contracts';
import { Button, ButtonRow, Checkbox, DataTable, GroupBox, PropertyGrid, TextArea, TextField, type Column } from '@design/index';
import {
  Annunciator,
  GuardedSwitch,
  Lamp,
  PanelFrame,
  PanelSection,
  Plate,
  PushButton,
  SegmentDisplay,
  type AnnunciatorTile,
  type GuardState,
} from '@graphics/panel';
import { StatusWord } from '@graphics/reactor/gauges';
import { HubMimic, TamperSeal, type HubLink, type HubNode } from '@graphics/isolate';
import { ACCOUNT_ROLE, ALPHA_HUBS, canon, cfg, dateOnly, dtg, operatorOf, type Rights } from './model';
import { certBlock, fmtRemaining, isIsolated, latest, levelDef, opsCount, pendingCert, remainingMs, restorationWord, type CertRefusal } from './logic';
import type { IsolateState, Restoration } from './types';

/* ------------------------------------------------------------------ panel */

export interface PanelProps {
  s: IsolateState;
  now: number;
  rights: Rights;
  guard: GuardState;
  tiles: AnnunciatorTile[];
  lampTest: boolean;
  compact: boolean;
  onLift(): void;
  onClose(): void;
  onArm(): void;
  onAbort(): void;
  onActuate(): void;
  onBreakSeal(): void;
  onAck(ids: string[]): void;
  onReset(ids: string[]): void;
  onTest(on: boolean): void;
}

export function PanelView(p: PanelProps) {
  const { s, now } = p;
  const iso = isIsolated(s, now);
  const last = latest(s);
  const next = levelDef(cfg, s.level + 1);
  const cur = levelDef(cfg, s.level);
  const rem = remainingMs(s, now);
  const pend = pendingCert(s);
  const sealed = !!s.seal && !s.seal.broken;
  const hold = (iso ? cur?.holdMs : next?.holdMs) ?? cur?.holdMs ?? cfg.levels[0]!.holdMs;
  const guardWords: Partial<Record<GuardState, string>> = s.withdrawn
    ? { actuated: 'WITHDRAWN FROM SERVICE', closed: 'WITHDRAWN FROM SERVICE' }
    : sealed
      ? { closed: 'COVER SEALED' }
      : iso
        ? { closed: 'ISOLATION LATCHED', lifted: 'ISOLATION LATCHED' }
        : {};
  return (
    <div class="iso-panelview">
      <PanelFrame title={['NETWORK ISOLATION', 'MANUAL INITIATE']} panelNo={cfg.panel.tag} columns={p.compact ? 1 : undefined} gap={12}>
        <PanelSection title="INITIATE">
          <div class="iso-guard">
            <GuardWithSeal
              state={s.withdrawn ? 'actuated' : p.guard}
              hold={hold}
              words={guardWords}
              disabled={!!s.withdrawn}
              sealNo={s.seal?.no ?? null}
              sealBroken={!!s.seal?.broken}
              onLift={p.onLift}
              onClose={p.onClose}
              onArm={p.onArm}
              onAbort={p.onAbort}
              onActuate={p.onActuate}
            />
            {s.seal && !s.withdrawn ? (
              <div class="iso-sealctl">
                <PushButton
                  legend={['BREAK', 'SEAL']}
                  label="TAMPER SEAL"
                  color="black"
                  size="sm"
                  disabled={!sealed}
                  onPress={p.onBreakSeal}
                  ariaLabel={`Break tamper seal ${s.seal.no}`}
                  tag={s.seal.no}
                />
              </div>
            ) : null}
          </div>
        </PanelSection>
        <PanelSection title="NETWORK" columns={2} gap={8}>
          <Lamp legend={['NETWORK', 'NORMAL']} lit={!iso} color="green" showState />
          <Lamp legend={['NETWORK', 'ISOLATED']} lit={iso} color="red" showState />
          <Lamp legend={['RESTORE', 'PENDING']} lit={!!pend} color="amber" showState />
          <Lamp legend={['COVER', 'SEALED']} lit={sealed} color="white" showState />
          <SegmentDisplay label="OPS COUNT" value={String(opsCount(s, cfg.archived.length)).padStart(4, '0')} digits={4} size="sm" ariaLabel={`Operations counter ${opsCount(s, cfg.archived.length)}`} />
          <SegmentDisplay label="AUTO CLEAR" value={rem == null || !iso ? '----' : fmtRemaining(rem).replace(':', '.')} digits={5} size="sm" ariaLabel={rem == null || !iso ? 'No automatic clear' : `Automatic clear in ${fmtRemaining(rem)}`} />
        </PanelSection>
        <PanelSection title="ESCALATION LEVEL" columns={5} gap={6}>
          {cfg.levels.map((l) => (
            <Lamp key={l.n} legend={String(l.n)} lit={s.level >= l.n} color={l.n >= 3 ? 'red' : 'amber'} size="sm" words={{ on: 'REACHED', off: 'NOT REACHED' }} />
          ))}
        </PanelSection>
      </PanelFrame>

      <div class={p.compact ? 'iso-row iso-row--stack' : 'iso-row'}>
        <div class="iso-ann">
          <Annunciator label="HS-0001 ANNUNCIATOR" tiles={p.tiles} columns={p.compact ? 3 : 4} tileWidth={p.compact ? 96 : 104} test={p.lampTest} onAck={p.onAck} onReset={p.onReset} onTest={p.onTest} />
        </div>
        <div class="iso-state">
          <PropertyGrid
            caption="CURRENT STATE"
            rows={[
              { label: 'Network', value: <StatusWord status={s.withdrawn ? 'FAULT' : iso ? 'FAULT' : 'NOMINAL'} word={s.withdrawn ? 'ISOLATED, HELD' : iso ? 'ISOLATED' : 'NORMAL'} /> },
              { label: 'Escalation level', value: `${s.level} of ${cfg.levels.length}`, mono: true },
              { label: 'Latest initiation', value: last ? `${last.ref}, ${dtg(last.at)}, ${operatorOf(last.by)}` : 'None recorded at this register', mono: !!last },
              { label: 'Automatic clear', value: iso && rem != null ? `In ${fmtRemaining(rem)}` : iso ? 'None. Restoration procedure only' : 'Not applicable' },
              { label: 'Restoration', value: restorationWord(s, cfg, now) },
              { label: 'Cover seal', value: s.seal ? `${s.seal.no}, ${s.seal.broken ? `broken ${dtg(s.seal.brokenAt ?? '')} by ${operatorOf(s.seal.brokenBy ?? 'system')}` : `intact, fitted ${dtg(s.seal.fittedAt)}`}` : 'Not fitted' },
              { label: 'Review', value: s.level >= 3 ? 'Workstation under Internal Assurance review' : 'None' },
            ]}
          />
        </div>
      </div>

      <GroupBox title={s.withdrawn ? 'Control withdrawn from service' : next ? `Before actuation: consequences of initiation ${next.n} (${next.title.toLowerCase()})` : 'Consequences'}>
        {s.withdrawn ? (
          <p class="iso-p">
            The control is withdrawn from service in the actuated position under {cfg.panel.procedureDocNo}. The isolation is held. Restoration is reserved to the Council Secretariat and is not
            made from any workstation. The escalation level is not reduced by any procedure.
          </p>
        ) : next ? (
          <>
            <ol class="iso-ol">
              {next.consequences.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
            <p class="iso-note">
              Operation: {next.steps === 3 ? 'break the tamper seal, lift the cover, then press and hold' : 'lift the cover, then press and hold'} the actuator for {(next.holdMs / 1000).toFixed(1)} s.
              Releasing the actuator before the hold is complete has no effect. Each initiation raises the escalation level permanently. Ref {cfg.panel.procedureDocNo}.
            </p>
          </>
        ) : null}
      </GroupBox>
    </div>
  );
}

/** GuardedSwitch with the numbered tamper seal drawn over its cover when one is fitted. */
function GuardWithSeal(p: {
  state: GuardState;
  hold: number;
  words: Partial<Record<GuardState, string>>;
  disabled: boolean;
  sealNo: string | null;
  sealBroken: boolean;
  onLift(): void;
  onClose(): void;
  onArm(): void;
  onAbort(): void;
  onActuate(): void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const unit = wrap.current?.querySelector<HTMLElement>('.pk-guard__unit');
    if (!unit || !wrap.current) return;
    const a = wrap.current.getBoundingClientRect();
    const b = unit.getBoundingClientRect();
    setPos({ top: b.top - a.top, left: b.left - a.left });
  }, [p.sealNo, p.state]);
  return (
    <div class="iso-guardwrap" ref={wrap}>
      <GuardedSwitch
        state={p.state}
        label={cfg.panel.plate}
        holdMs={p.hold}
        tag={cfg.panel.tag}
        words={p.words}
        disabled={p.disabled}
        onLift={p.onLift}
        onClose={p.onClose}
        onArm={p.onArm}
        onAbort={p.onAbort}
        onActuate={p.onActuate}
      />
      {p.sealNo && pos && p.state === 'closed' ? (
        <div class="iso-sealover" style={{ top: `${pos.top}px`, left: `${pos.left}px` }} aria-hidden={false}>
          <TamperSeal no={p.sealNo} broken={p.sealBroken} />
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- register */

interface RegRow {
  key: string;
  ref: string;
  at: string;
  operator: string;
  role: string;
  workstation: string;
  level: number | null;
  restoration: string;
  archived: boolean;
}

function restorationOf(rs: Restoration[], ref: string): string {
  const mine = rs.filter((r) => r.ref === ref);
  const done = mine.find((r) => r.status === 'approved' || r.status === 'automatic');
  if (done) return done.status === 'automatic' ? `Automatic, ${dtg(done.decidedAt ?? done.raisedAt)}` : `Certificate ${done.cert}, ${dtg(done.decidedAt ?? '')}`;
  const pend = mine.find((r) => r.status === 'pending');
  if (pend) return `Certificate ${pend.cert} pending`;
  return 'Not restored';
}

export function RegisterView({ s, showArchived, onToggleArchived }: { s: IsolateState; showArchived: boolean; onToggleArchived(v: boolean): void }) {
  const live: RegRow[] = s.initiations.map((i, n) => ({
    key: `i${n}`,
    ref: i.ref,
    at: i.at,
    operator: i.operatorId ?? operatorOf(i.by),
    role: ACCOUNT_ROLE[i.by] ?? i.by,
    workstation: 'A03-5-114',
    level: i.level ?? n + 1,
    restoration: s.withdrawn && n === s.initiations.length - 1 ? 'Held. Reserved to Council Secretariat' : restorationOf(s.restorations ?? [], i.ref),
    archived: false,
  }));
  const arch: RegRow[] = cfg.archived.map((a, n) => ({
    key: `a${n}`,
    ref: a.ref,
    at: a.at,
    operator: a.pn,
    role: 'Archived user profile',
    workstation: a.workstation,
    level: a.level,
    restoration: `${a.restoration} ${dtg(a.restoredAt)}.`,
    archived: true,
  }));
  const rows = [...(showArchived ? arch : []), ...live].reverse();
  const cols: Column<RegRow>[] = [
    { key: 'ref', header: 'Reference', width: 112, mono: true },
    { key: 'at', header: 'Initiated', width: 150, mono: true, render: (r) => dtg(r.at), sortValue: (r) => r.at },
    { key: 'operator', header: 'Operator', width: 110, mono: true },
    { key: 'role', header: 'Account' },
    { key: 'workstation', header: 'Workstation', width: 96, mono: true },
    { key: 'level', header: 'Level', width: 52, align: 'right', mono: true, render: (r) => (r.level == null ? '' : String(r.level)) },
    { key: 'restoration', header: 'Restoration' },
  ];
  const count = opsCount(s, cfg.archived.length);
  return (
    <div class="iso-reg">
      <p class="iso-p">
        Register of manual initiations at control {cfg.panel.tag}, {cfg.panel.station}. Operations counter at the panel: <span class="mono">{String(count).padStart(4, '0')}</span>. Entries shown:{' '}
        <span class="mono">{rows.length}</span>.
      </p>
      <Checkbox label="Include entries archived with the previous user profile" checked={showArchived} onChange={onToggleArchived} />
      <DataTable
        label={`Initiation register, ${rows.length} entries`}
        columns={cols}
        rows={rows}
        rowKey={(r) => r.key}
        wrap
        dense
        empty={<div class="iso-empty">No manual initiations are recorded in the register of the current user profile.</div>}
      />
      {showArchived ? (
        <p class="iso-note">
          Archived entries are read from the profile archived on reissue of the workstation, {dateOnly(cfg.counter.zeroedOn)}. Statement on file for {cfg.archived.map((a) => a.ref).join(', ')}:{' '}
          {cfg.archived.map((a) => a.statement).join(' ')} {cfg.counter.note}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ restoration */

const CERT_REFUSAL: Record<CertRefusal, string> = {
  'not-isolated': 'The network is not isolated. No certificate is required.',
  'automatic-only': 'At this level the circuits are restored by Network Operations after line checks. A certificate is not accepted.',
  withdrawn: 'Restoration is reserved to the Council Secretariat. No certificate is accepted at this panel.',
  pending: 'A certificate for this isolation is already with the certifying officer.',
  statement: 'The statement of circumstances is too short.',
};

export interface RestorationProps {
  s: IsolateState;
  now: number;
  rights: Rights;
  me: AccountId;
  statement: string;
  onStatement(v: string): void;
  onRaise(): void;
  note: string;
  onNote(v: string): void;
  onDecide(cert: string, decision: 'approved' | 'returned'): void;
}

export function RestorationView(p: RestorationProps) {
  const { s, now } = p;
  const block = certBlock(s, cfg, now);
  const pend = pendingCert(s);
  const all = [...(s.restorations ?? [])].reverse();
  const cols: Column<Restoration>[] = [
    { key: 'cert', header: 'Certificate', width: 112, mono: true, render: (r) => r.cert || '(automatic)' },
    { key: 'ref', header: 'Initiation', width: 112, mono: true },
    { key: 'level', header: 'Level', width: 52, align: 'right', mono: true },
    { key: 'raisedBy', header: 'Raised by', width: 120, mono: true, render: (r) => operatorOf(r.raisedBy) },
    { key: 'status', header: 'Status', width: 96, render: (r) => r.status.toUpperCase() },
    { key: 'decidedBy', header: 'Decided', render: (r) => (r.decidedAt ? `${operatorOf(r.decidedBy ?? 'system')}, ${dtg(r.decidedAt)}` : '') },
    { key: 'note', header: 'Note' },
  ];
  const min = cfg.panel.statementMinChars;
  return (
    <div class="iso-rest">
      <PropertyGrid
        caption="RESTORATION STATUS"
        rows={[
          { label: 'Network', value: <StatusWord status={isIsolated(s, now) ? 'FAULT' : 'NOMINAL'} word={isIsolated(s, now) ? 'ISOLATED' : 'NORMAL'} /> },
          { label: 'Restoration', value: restorationWord(s, cfg, now) },
          { label: 'Certifying officer', value: 'Deputy Commander, ALPHA-02 (hub of the issuing switch)' },
          { label: 'Form', value: `${cfg.panel.restorationForm}, routed under ${cfg.panel.procedureDocNo}` },
        ]}
      />

      {pend ? (
        <GroupBox title={`Certificate ${pend.cert}: with the certifying officer`}>
          <PropertyGrid
            rows={[
              { label: 'Initiation', value: pend.ref, mono: true },
              { label: 'Raised', value: `${dtg(pend.raisedAt)} by ${operatorOf(pend.raisedBy)}`, mono: true },
              { label: 'Statement', value: pend.statement ?? '' },
            ]}
          />
          {p.rights.certify ? (
            <div class="iso-decide">
              <TextField label="Remarks (optional)" value={p.note} onInput={p.onNote} maxLength={160} width={48} />
              <ButtonRow>
                <Button variant="primary" label="&Approve and restore circuits" onClick={() => p.onDecide(pend.cert, 'approved')} />
                <Button label="&Return without approval" onClick={() => p.onDecide(pend.cert, 'returned')} />
              </ButtonRow>
              <p class="iso-note">Approval restores every hub circuit at once. It does not reduce the escalation level.</p>
            </div>
          ) : (
            <p class="iso-note">Awaiting decision by the Deputy Commander, ALPHA-02. The certificate is in that officer's action queue.</p>
          )}
        </GroupBox>
      ) : null}

      {p.rights.raise && !pend ? (
        <GroupBox title={`Raise a ${cfg.panel.restorationForm}`}>
          {block && block !== 'statement' ? (
            <p class="iso-p">{CERT_REFUSAL[block]}</p>
          ) : (
            <div class="iso-raise">
              <TextArea
                label="Statement of circumstances"
                value={p.statement}
                onInput={p.onStatement}
                rows={4}
                maxLength={cfg.panel.statementMaxChars}
                showCount
                hint={`Required, at least ${min} characters. State why the control was operated and by whom. The statement is routed with the certificate and copied to the Office of Internal Assurance.`}
              />
              <ButtonRow>
                <Button variant="primary" label="&Route to certifying officer" onClick={p.onRaise} disabled={p.statement.trim().length < min} />
              </ButtonRow>
            </div>
          )}
        </GroupBox>
      ) : null}

      <DataTable label={`Restoration record, ${all.length} entries`} caption="Restoration record" columns={cols} rows={all} rowKey={(r) => `${r.cert}|${r.ref}|${r.raisedAt}|${r.status}`} wrap dense empty={<div class="iso-empty">No restorations recorded.</div>} />
    </div>
  );
}

/* ------------------------------------------------------------------ links */

export function LinksView({ s, now, local, links }: { s: IsolateState; now: number; local: string; links: { id: string; state: string; note: string }[] }) {
  const iso = isIsolated(s, now);
  const state = new Map(links.map((l) => [l.id, l.state]));
  const nodes: HubNode[] = ALPHA_HUBS.map((f) => ({ id: f.id, lat: f.lat ?? f.anchor.cityLat ?? 0, lon: f.lon ?? f.anchor.cityLon ?? 0, local: f.id === local, up: f.id === local || state.get(f.id) !== 'DOWN' }));
  const segs: HubLink[] = canon.railSegments.map((g) => ({
    id: `SEG ${g.no}`,
    a: g.a,
    b: g.b,
    live: !iso && g.status === 'IN REVENUE SERVICE',
    note: g.status === 'IN REVENUE SERVICE' ? undefined : 'NO CIRCUIT',
  }));
  const cols: Column<{ id: string; state: string; note: string }>[] = [
    { key: 'id', header: 'Hub', width: 90, mono: true },
    {
      key: 'state',
      header: 'Link state',
      width: 120,
      render: (r) => <StatusWord status={r.state === 'DOWN' ? 'FAULT' : r.state === 'DEGRADED' || r.state === 'BUSY' ? 'DEGRADED' : 'NOMINAL'} word={r.state} />,
    },
    { key: 'note', header: 'Note' },
  ];
  return (
    <div class="iso-links">
      <div class="iso-mimicwrap">
        <HubMimic nodes={nodes} links={segs} label={`Hub circuits. ${iso ? 'All remote hub circuits down.' : 'Circuits in service.'}`} />
      </div>
      <DataTable label="Link states by hub" caption="Link states by hub (from this workstation)" columns={cols} rows={links} rowKey={(r) => r.id} dense wrap />
      <p class="iso-note">
        Link states as shown in the notification area. Circuits follow the rail segments; a segment not in revenue service carries no hub circuit. While the network is isolated every remote hub
        reports DOWN and telephone calls beyond the local hub are refused by the switch.
      </p>
    </div>
  );
}

/* --------------------------------------------------------- site view (T4) */

export function SiteView({ site, isolated, since }: { site: string; isolated: boolean; since: string | null }) {
  return (
    <div class="iso-site">
      <PropertyGrid
        caption={`SITE EXTERNAL CIRCUITS, ${site}`}
        rows={[
          { label: 'External circuits', value: <StatusWord status={isolated ? 'FAULT' : 'NOMINAL'} word={isolated ? 'OUT OF SERVICE' : 'IN SERVICE'} /> },
          { label: 'Since', value: isolated && since ? dtg(since) : 'Not applicable', mono: true },
          { label: 'Internal systems', value: 'Not affected' },
          { label: 'Action at this site', value: isolated ? 'None. Continue the watch. Log the time in the shift log.' : 'None' },
        ]}
      />
      <p class="iso-note">
        Circuit restoration is carried out off site. Do not report the condition to the Service Desk. Urgent business is passed through the duty officer.
      </p>
      <Plate text={['THIS DISPLAY', 'SHOWS THIS SITE ONLY']} size="sm" width={200} />
    </div>
  );
}
