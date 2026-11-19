/**
 * Pure escalation logic for panel HS-0001 (Network Isolation, Manual Initiate).
 * No services, no clock: callers pass `now` (wall-clock ms) and in-world ISO strings.
 * Figures (hold times, clear periods, seal numbers, mail ids) come from the canon
 * fragment `canon.apps.isolate` (content/canon/apps/isolate.json).
 */
import type { AccountDef, AccountId, IsolationState } from '@core/contracts';
import type { IsolateCanon, IsolateLevelCanon } from '@core/canon-apps/isolate';
import type { Initiation, IsolateState, IsolationLevel, Restoration } from './types';

export const NONE: IsolateState = { level: 0, initiations: [], active: false, clearsAt: null, restorations: [], seal: null, withdrawn: false };

/** Fill the panel's optional fields on a bare IsolationState (or nothing). */
export function normalize(s: IsolationState | IsolateState | null | undefined): IsolateState {
  if (!s || typeof s !== 'object') return { ...NONE };
  const x = s as IsolateState;
  return {
    level: x.level ?? 0,
    initiations: Array.isArray(x.initiations) ? x.initiations : [],
    active: !!x.active,
    clearsAt: typeof x.clearsAt === 'number' ? x.clearsAt : null,
    restorations: Array.isArray(x.restorations) ? x.restorations : [],
    seal: x.seal ?? null,
    withdrawn: !!x.withdrawn || x.level >= 5,
  };
}

/** Same rule as the shell (`isolatedAt`): active, and no automatic clear time passed. */
export function isIsolated(s: IsolationState, now: number): boolean {
  return s.active && (s.clearsAt == null || now < s.clearsAt);
}

export function levelDef(cfg: IsolateCanon, level: number): IsolateLevelCanon | undefined {
  return cfg.levels.find((l) => l.n === level);
}

export function latest(s: IsolateState): Initiation | undefined {
  return s.initiations[s.initiations.length - 1];
}

export function pendingCert(s: IsolateState): Restoration | undefined {
  return (s.restorations ?? []).find((r) => r.status === 'pending');
}

/** "080519" from an ISO date or date-time. */
export function yymmdd(iso: string): string {
  return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
}

/** Next initiation reference for the in-world date of `iso`: NI-080519-01, -02... (archived entries count). */
export function nextRef(prefix: string, s: IsolateState, archived: readonly { ref: string }[], iso: string): string {
  const stem = `${prefix}-${yymmdd(iso)}-`;
  const n = [...archived.map((a) => a.ref), ...s.initiations.map((i) => i.ref)].filter((r) => r.startsWith(stem)).length;
  return stem + String(n + 1).padStart(2, '0');
}

/** Next restoration certificate number for the in-world date of `iso`. */
export function nextCert(prefix: string, s: IsolateState, iso: string): string {
  const stem = `${prefix}-${yymmdd(iso)}-`;
  const n = (s.restorations ?? []).filter((r) => r.cert.startsWith(stem)).length;
  return stem + String(n + 1).padStart(2, '0');
}

/** Total actuations on the panel's operations counter (archived register included). */
export function opsCount(s: IsolateState, archivedCount: number): number {
  return archivedCount + s.initiations.length;
}

export type InitiateRefusal = 'withdrawn' | 'latched' | 'sealed';

/** Why the control cannot initiate now, or null if it can. */
export function initiateBlock(s: IsolateState, now: number): InitiateRefusal | null {
  if (s.withdrawn || s.level >= 5) return 'withdrawn';
  if (isIsolated(s, now)) return 'latched';
  if (s.seal && !s.seal.broken) return 'sealed';
  return null;
}

/** Steps needed to actuate the next initiation (2 = lift + hold, 3 = break seal first). */
export function stepsFor(s: IsolateState): number {
  return s.seal ? 3 : 2;
}

export interface InitiateArgs {
  by: AccountId;
  operatorId: string;
  iso: string;
  now: number;
}

export interface InitiateResult {
  state: IsolateState;
  initiation: Initiation;
  def: IsolateLevelCanon;
}

/** One manual initiation: raises the level, latches isolation, sets the clear time. */
export function initiate(s0: IsolateState, cfg: IsolateCanon, a: InitiateArgs): InitiateResult | { refused: InitiateRefusal } {
  const s = normalize(s0);
  const block = initiateBlock(s, a.now);
  if (block) return { refused: block };
  const level = Math.min(5, s.level + 1) as IsolationLevel;
  const def = levelDef(cfg, level);
  if (!def) return { refused: 'withdrawn' };
  const initiation: Initiation = {
    at: a.iso,
    by: a.by,
    ref: nextRef(cfg.panel.refPrefix, s, cfg.archived, a.iso),
    level,
    operatorId: a.operatorId,
    ms: a.now,
  };
  const state: IsolateState = {
    ...s,
    level,
    initiations: [...s.initiations, initiation],
    active: true,
    clearsAt: def.clearsAfterMin == null ? null : a.now + def.clearsAfterMin * 60_000,
    withdrawn: level >= 5,
  };
  return { state, initiation, def };
}

/** The next seal to fit: the one after the current seal in canon order (the last is reused). */
export function nextSealNo(s: IsolateState, cfg: IsolateCanon): string {
  const i = s.seal ? cfg.seals.indexOf(s.seal.no) + 1 : 0;
  return cfg.seals[Math.min(Math.max(i, 0), cfg.seals.length - 1)]!;
}

function restored(s: IsolateState, cfg: IsolateCanon, iso: string): IsolateState {
  const def = levelDef(cfg, s.level);
  return {
    ...s,
    active: false,
    clearsAt: null,
    seal: def?.sealOnRestore ? { no: nextSealNo(s, cfg), fittedAt: iso, broken: false } : s.seal && s.seal.broken ? null : s.seal,
  };
}

/**
 * Automatic restoration once clearsAt has passed (line checks complete). Returns the new
 * state, or null when nothing changes. `isoAt` turns a wall-clock ms into in-world ISO.
 * A certificate still pending for the isolation is withdrawn.
 */
export function expire(s0: IsolateState, cfg: IsolateCanon, now: number, isoAt: (ms: number) => string): IsolateState | null {
  const s = normalize(s0);
  if (!s.active || s.clearsAt == null || now < s.clearsAt) return null;
  const iso = isoAt(s.clearsAt);
  const last = latest(s);
  const rs = (s.restorations ?? []).map((r) =>
    r.status === 'pending' ? { ...r, status: 'returned' as const, decidedBy: 'system' as const, decidedAt: iso, note: 'Withdrawn: circuits restored after line checks before a decision was made.' } : r,
  );
  const auto: Restoration = {
    cert: '',
    ref: last?.ref ?? '',
    level: s.level,
    raisedBy: 'system',
    raisedAt: iso,
    status: 'automatic',
    decidedBy: 'system',
    decidedAt: iso,
    note: 'Line checks complete. Circuits restored by Network Operations, ALPHA-02.',
  };
  return restored({ ...s, restorations: [...rs, auto] }, cfg, iso);
}

export type CertRefusal = 'not-isolated' | 'automatic-only' | 'withdrawn' | 'pending' | 'statement';

/** Why a restoration certificate cannot be raised now, or null. */
export function certBlock(s: IsolateState, cfg: IsolateCanon, now: number): CertRefusal | null {
  if (s.withdrawn) return 'withdrawn';
  if (!isIsolated(s, now)) return 'not-isolated';
  const def = levelDef(cfg, s.level);
  if (!def || def.restoration === 'none') return 'withdrawn';
  if (def.restoration === 'automatic') return 'automatic-only';
  if (pendingCert(s)) return 'pending';
  return null;
}

export function raiseCertificate(
  s0: IsolateState,
  cfg: IsolateCanon,
  a: { by: AccountId; iso: string; now: number; statement: string },
): { state: IsolateState; cert: Restoration } | { refused: CertRefusal } {
  const s = normalize(s0);
  const block = certBlock(s, cfg, a.now);
  if (block) return { refused: block };
  if (a.statement.trim().length < cfg.panel.statementMinChars) return { refused: 'statement' };
  const cert: Restoration = {
    cert: nextCert(cfg.panel.certPrefix, s, a.iso),
    ref: latest(s)?.ref ?? '',
    level: s.level,
    raisedBy: a.by,
    raisedAt: a.iso,
    statement: a.statement.trim().slice(0, cfg.panel.statementMaxChars),
    status: 'pending',
  };
  return { state: { ...s, restorations: [...(s.restorations ?? []), cert] }, cert };
}

export function attachTrace(s: IsolateState, cert: string, trace: string): IsolateState {
  return { ...s, restorations: (s.restorations ?? []).map((r) => (r.cert === cert ? { ...r, trace } : r)) };
}

/**
 * The certifying officer's decision. Approval restores the circuits (and fits a tamper
 * seal where the level calls for one); return leaves the isolation as it is.
 * Returns null if the certificate is not pending.
 */
export function decideCertificate(
  s0: IsolateState,
  cfg: IsolateCanon,
  a: { cert: string; decision: 'approved' | 'returned'; by: AccountId; iso: string; note?: string },
): IsolateState | null {
  const s = normalize(s0);
  const c = (s.restorations ?? []).find((r) => r.cert === a.cert);
  if (!c || c.status !== 'pending') return null;
  const rs = (s.restorations ?? []).map((r) =>
    r.cert === a.cert ? { ...r, status: a.decision, decidedBy: a.by, decidedAt: a.iso, ...(a.note ? { note: a.note } : {}) } : r,
  );
  const next = { ...s, restorations: rs };
  if (a.decision === 'returned' || s.withdrawn) return next;
  return restored(next, cfg, a.iso);
}

export function breakSeal(s0: IsolateState, a: { by: AccountId; iso: string }): IsolateState | null {
  const s = normalize(s0);
  if (!s.seal || s.seal.broken) return null;
  return { ...s, seal: { ...s.seal, broken: true, brokenAt: a.iso, brokenBy: a.by } };
}

export interface MailItem {
  account: AccountId;
  msg: string;
}

/** Who receives each consequence message of a level. `network` = every account above Tier 4. */
export function mailPlan(def: IsolateLevelCanon, initiator: AccountId, accounts: readonly Pick<AccountDef, 'id' | 'tier'>[]): MailItem[] {
  const out: MailItem[] = [];
  const add = (account: AccountId, msg: string) => {
    if (!out.some((m) => m.account === account && m.msg === msg)) out.push({ account, msg });
  };
  for (const m of def.mail) {
    if (m.to === 'initiator') {
      add(initiator, m.msg);
    } else if (m.to === 'network') {
      for (const a of accounts) if (a.tier < 4) add(a.id, m.msg);
    } else if (accounts.some((a) => a.id === m.to)) {
      add(m.to, m.msg);
    }
  }
  return out;
}

/** Remaining ms until the automatic clear, or null. */
export function remainingMs(s: IsolationState, now: number): number | null {
  if (!s.active || s.clearsAt == null) return null;
  return Math.max(0, s.clearsAt - now);
}

/** "09:41" (mm:ss) or "1:02:03". */
export function fmtRemaining(ms: number): string {
  const t = Math.ceil(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

/** Plain-words restoration status for the status panel. */
export function restorationWord(s: IsolateState, cfg: IsolateCanon, now: number): string {
  if (s.withdrawn) return 'HELD: RESERVED TO COUNCIL SECRETARIAT';
  if (!isIsolated(s, now)) return s.level === 0 ? 'NOT REQUIRED' : 'RESTORED';
  if (pendingCert(s)) return 'CERTIFICATE PENDING';
  const def = levelDef(cfg, s.level);
  if (def?.restoration === 'automatic') return 'AUTOMATIC AFTER LINE CHECKS';
  if (def?.restoration === 'automatic-or-certificate') return 'AUTOMATIC, OR BY CERTIFICATE';
  return 'CERTIFICATE REQUIRED';
}
