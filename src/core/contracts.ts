/** Orchestrator-owned interface contract. See docs/CONTRACTS.md. */
import type { ComponentType } from 'preact';
import type { ReadonlySignal } from '@preact/signals';
import type { CompartmentId, FacilityId, MarkingId, TierNo } from './canon-types';

export type AppId =
  | 'registry' | 'transit' | 'personnel' | 'records' | 'mail' | 'ledger'
  | 'reserves' | 'assurance' | 'directives' | 'forms' | 'terminal' | 'system'
  // Pass two set pieces (docs/SPEC-2.md §3)
  | 'strike' | 'isolate' | 'drill' | 'cctv' | 'plant' | 'doors'
  | 'dispatch' | 'hoist' | 'environ' | 'pa' | 'muster' | 'patch';

export type Template =
  | 'memo' | 'directive' | 'cable' | 'minutes' | 'dossier' | 'ledger' | 'form'
  | 'message' | 'help' | 'record' | 'charter' | 'scan' | 'index';

/** Redaction requirement key: "T2", "KESTREL", "KESTREL+T2". Tier-1 keys never ship. */
export type ReleaseKey = string;

export interface RouteEntry {
  id: string;
  route: string; // "/directives/dir-0412" (no base)
  app: AppId;
  family: string;
  template: Template;
  docNo: string;
  /** Additional docNos that resolve to this route (e.g. cable/briefing numbers). */
  aliases?: string[];
  title: string;
  marking: MarkingId;
  originator: string;
  revision: number;
  date: string; // ISO
  access?: { tier: TierNo; compartment?: CompartmentId };
  facility?: FacilityId;
  summary: string;
  /** Pass two: readable by the Tier 4 account (frontmatter `t4: true`). */
  t4?: boolean;
  /** Pass two: accounts that have their own variant of this document (content/variants/<account>/<id>.md). */
  variants?: AccountId[];
}

export interface RedactionInfo {
  id: string; // rx id, unique within doc
  key: ReleaseKey;
  len: number; // character length of hidden text (for bar sizing)
  auth: string; // withholding authority
  ref: string; // reference number
}

export interface DocJson extends RouteEntry {
  html: string; // baseline-redacted HTML body
  redactions: RedactionInfo[];
  xrefs: { docNo: string; route: string; title: string }[];
  distribution?: string[];
  supersedes?: string;
  headings: { id: string; text: string; depth: number }[];
  frontmatter: Record<string, unknown>; // template-specific extras (form fields, message headers...)
}

export interface WindowHandle {
  id: string;
  /** Window title and document number; omitting docNo (or passing undefined/"") clears it. */
  setTitle(title: string, docNo?: string): void;
  setMarking(marking: MarkingId): void;
  setStatus(text: string): void;
  setBusy(busy: boolean): void; // hourglass cursor
  close(): void;
  focus(): void;
  /** Navigate this window to another route of the same app (pushes URL). */
  navigate(route: string): void;
}

export interface AppProps {
  win: WindowHandle;
  route: RouteEntry | null; // null = app home
}

export interface AppDefinition {
  id: AppId;
  title: string; // "Facility Registry"
  icon: string; // IconId from @graphics/icons
  homeRoute: string; // e.g. "/registry"
  minSize: { w: number; h: number };
  defaultSize: { w: number; h: number };
  load: () => Promise<{ default: ComponentType<AppProps> }>;
}

export type AuditKind =
  | 'window.open' | 'window.close' | 'doc.read' | 'search' | 'redaction.hover' | 'print'
  | 'form.submit' | 'mail.read' | 'mail.send' | 'terminal.cmd' | 'transit.watch'
  | 'clearance.grant' | 'login' | 'logout' | 'timeout'
  /** Lines written by the system itself (narrative engine): withdrawals, refusal notes. */
  | 'system'
  /**
   * Pass two: an operator action at a set-piece control (subject = "<appId>:<action>",
   * e.g. "doors:override"; data carries the specifics; detail is the security-office phrasing,
   * always supplied by the app).
   */
  | 'control'
  /** Pass two: a trace from another account arrived here (subject = trace id; data = trace summary). */
  | 'trace';

export interface AuditEntry {
  seq: number;
  at: string; // ISO real time with pinned in-world date
  kind: AuditKind;
  subject: string; // docNo / route / query / command
  detail: string; // security-office phrasing
  /**
   * Structured payload for the narrative engine (never displayed). See
   * docs/CONTRACTS.md "Narrative engine" for the keys each kind carries
   * (form.submit field values, mail.send recipients/body, transit.watch view).
   */
  data?: Record<string, string>;
}

/** Options for Services.mail.deliver (narrative engine). */
export interface MailDeliverOptions {
  /** Values for `{token}` slots in the message body (slotTemplate). */
  slots?: Record<string, string>;
  /** Deliver already marked as read. */
  read?: boolean;
  /** No toast or sound (login batch). */
  silent?: boolean;
  /** Deliver again even if already delivered: marks it unread and replaces its slots. */
  repeat?: boolean;
}

/** Per-message delivery record kept by the shell. `at` = in-world ISO delivery time. */
export interface MailMeta {
  at: string;
  slots?: Record<string, string>;
}

/**
 * Synthesized WebAudio cues only (no samples, no speech). Pass two adds panel and plant cues:
 * switch (toggle/selector click), guard (cover lifted/closed), button (momentary pushbutton),
 * alarm (annunciator horn, repeating until acknowledged: stop with sound.stop('alarm')),
 * ack (alarm acknowledged), door (blast door motor run + seat thunk), hoist (cage motor),
 * chime (PA pre-announcement chime), tone (PA alert tone sequence), dtmf (patch panel),
 * busy (circuit busy), print (line printer burst), shutter (DVR camera switch).
 */
export type SoundCue =
  | 'window' | 'error' | 'mail' | 'relay'
  | 'switch' | 'guard' | 'button' | 'alarm' | 'ack' | 'door' | 'hoist'
  | 'chime' | 'tone' | 'dtmf' | 'busy' | 'print' | 'shutter'
  /** Pass two: telephone ringback (patch), PA all-clear and evacuation (muster) signals. */
  | 'ringback' | 'allclear' | 'evac';

/* ------------------------------------------------------------------ pass two */

export type AccountId = 'analyst' | 'lifesupport' | 'deputy' | 'auditor';

/** Client-safe account definition (canon `accounts`, content/canon/extended-c.json). */
export interface AccountDef {
  id: AccountId;
  operatorId: string; // printed on the access card, e.g. "OPR-A03-1147"
  passphrase: string; // printed on the card (in-world theatre; any input accepted)
  pn: string; // personnel number
  displayName: string; // session panel label, e.g. "ANALYST (PROBATIONARY) 3-1147"; never a Tier 2 name
  roleTitle: string; // "Deputy Commander, ALPHA-02"
  tier: TierNo;
  site: FacilityId;
  divisionId: string;
  compartments: CompartmentId[]; // held from sign-in
  probationStart: string | null; // ISO, or null if not on probation
  email: string; // in-world .mer address (mail between accounts routes on it)
  supervisorPn: string | null;
  /** Approval authority for routed forms (form docNos), shown as Forms → Action queue. */
  approves: string[];
  /** Can read other accounts' audit trails (Assurance → Audit review). */
  auditReader: boolean;
  /** AppIds on this account's desktop, in icon order (Directory still lists every app). */
  desktop: AppId[];
}

/** One cross-account trace (shared store, append-only). */
export interface Trace {
  id: string; // "TR-<seq>"
  at: string; // in-world ISO
  from: AccountId;
  to: AccountId | 'all';
  /**
   * form.routed   a form filed by `from` awaiting `to`'s action (data: form fields; subject = receipt no.)
   * form.decided  approver's decision returned (data: { receipt, decision: 'approved'|'denied', note })
   * mail          message from `from` to `to` (data: { subject, body, cc? }); rendered as a delivered message
   * mail.deliver  deliver content message `msgId` to `to` at its next sign-in (or now if signed in)
   * finding       OIA finding about `to` (data: { ref, text })
   * notice        free-form system notice (data: { text })
   */
  kind: 'form.routed' | 'form.decided' | 'mail' | 'mail.deliver' | 'finding' | 'notice';
  subject: string;
  msgId?: string;
  data?: Record<string, string>;
  /** Accounts that have consumed (acted on / been delivered) this trace. */
  seenBy?: AccountId[];
}

/** Global isolation (the "do not press" control). Owner: isolate app. Read by everything. */
export interface IsolationState {
  level: 0 | 1 | 2 | 3 | 4 | 5; // 0 = never initiated; escalates per initiation; never decreases except by reset procedure
  initiations: { at: string; by: AccountId; ref: string }[];
  /** While true the network is isolated: hub links down, transit holding, patch panel circuits dead. */
  active: boolean;
  /** Wall-clock ms when the current isolation clears by itself (null = needs manual restoration). */
  clearsAt: number | null;
}

/** Network seal drill. Owner: drill app. Read by doors, cctv, pa, muster, environ, transit, dispatch. */
export interface DrillState {
  id: string; // "SD-08-0519-01"
  orderedAt: number; // wall-clock ms
  by: AccountId;
  phase: 'propagating' | 'sealed' | 'stand-down' | 'aborted';
  /** Per-site status. Times are wall-clock ms (drill runs compressed; see canon sealDrill.timeScale). */
  sites: Record<string, { ordered: number; acknowledged: number | null; sealed: number | null; status: 'pending' | 'acknowledged' | 'sealing' | 'sealed' | 'no-report' }>;
  endedAt: number | null;
}

/** Trains dispatched by an operator. Owner: dispatch app; the transit worker runs them. */
export interface DispatchedTrain {
  id: string; // consist id
  by: AccountId;
  route: string[]; // ordered node ids (facility ids) along rail/tram links
  departAt: number; // wall-clock ms
  status: 'scheduled' | 'running' | 'held' | 'arrived' | 'cancelled';
  note?: string;
}

/** Shared, cross-account, cross-tab key/value store (BroadcastChannel synced, persisted globally). */
export interface SharedStore {
  /** Signal for a key; `fallback` until loaded or if absent. Same key → same signal. */
  get<T>(key: string, fallback: T): ReadonlySignal<T>;
  set<T>(key: string, value: T): void;
  update<T>(key: string, fallback: T, fn: (prev: T) => T): void;
}

export interface Services {
  openRoute(path: string): void;
  openApp(id: AppId): void;
  audit: {
    log(kind: AuditKind, subject: string, detail?: string, data?: Record<string, string>): void;
    entries: ReadonlySignal<AuditEntry[]>;
    /** Subscribe for narrative consequences. Returns unsubscribe. */
    subscribe(fn: (e: AuditEntry) => void): () => void;
  };
  session: {
    operatorId: ReadonlySignal<string>;
    tier: ReadonlySignal<TierNo>; // effective (2 when acting)
    compartments: ReadonlySignal<CompartmentId[]>;
    actingTier2: ReadonlySignal<boolean>;
    probationDay: ReadonlySignal<number>;
    flags: ReadonlySignal<Record<string, boolean>>; // narrative flags
    setFlag(name: string): void;
  };
  clearance: {
    grant(key: CompartmentId | 'ACTING-T2', reason: string): void;
    satisfies(key: ReleaseKey): boolean;
  };
  docs: {
    load(id: string): Promise<DocJson>; // with satisfied releases applied
    byRoute(route: string): RouteEntry | undefined;
    byDocNo(docNo: string): RouteEntry | undefined;
    all(): RouteEntry[];
  };
  search(q: string): Promise<{ route: RouteEntry; score: number; snippet: string }[]>;
  mail: {
    deliver(msgId: string, opts?: MailDeliverOptions): void;
    unread: ReadonlySignal<number>;
    /** Delivered message ids (RouteEntry ids), oldest first; a re-delivery moves the id to the end. */
    delivered: ReadonlySignal<string[]>;
    /** Message ids the operator has read (kept from `mail.read` audit entries and `deliver({ read: true })`). */
    read: ReadonlySignal<string[]>;
    /** Delivery time and slot values per delivered message id. */
    meta: ReadonlySignal<Record<string, MailMeta>>;
    /**
     * False only for a message document (route family `mail`) not yet delivered to this
     * operator; true for every other document and for unknown numbers. Takes a docNo, an alias
     * or a route path. Apps that list or open documents from their own data (not through
     * services.search / services.openRoute, which already apply it) must check this.
     */
    isHeld(docNoOrRoute: string): boolean;
  };
  sound: {
    play(cue: SoundCue): void;
    /** Stop a looping cue (alarm). No-op if not playing. */
    stop(cue: SoundCue): void;
  };
  /* ---- pass two ---- */
  account: {
    id: ReadonlySignal<AccountId>;
    def: ReadonlySignal<AccountDef>;
    all(): AccountDef[];
    /** Log off and return to the lock screen with `id`'s card selected (reloads into its namespace). */
    switchTo(id: AccountId): void;
    /** Read-only copy of another account's audit trail. Rejects unless this account is an auditReader. */
    readAudit(id: AccountId): Promise<AuditEntry[]>;
    /** Resolve an in-world .mer address to an account, if it belongs to one. */
    byEmail(email: string): AccountDef | undefined;
  };
  traces: {
    /** Append a trace (id/at/from filled in). Returns the stored trace. */
    post(t: Omit<Trace, 'id' | 'at' | 'from' | 'seenBy'>): Trace;
    /** Every trace (all accounts), oldest first. */
    all: ReadonlySignal<Trace[]>;
    /** Traces addressed to this account (or 'all'). */
    mine: ReadonlySignal<Trace[]>;
    markSeen(id: string): void;
  };
  /** Global plant state shared by every account (typed keys: isolation, drill, dispatch). */
  shared: SharedStore;
  settings: {
    sound: ReadonlySignal<boolean>;
    density: ReadonlySignal<'standard' | 'compact'>;
    reducedMotion: ReadonlySignal<boolean>;
    handheld: ReadonlySignal<'auto' | 'on' | 'off'>;
    set(key: 'sound' | 'density' | 'reducedMotion' | 'handheld', value: unknown): void;
  };
  notify(text: string, opts?: { from?: string }): void;
  print(docId: string): void;
}
