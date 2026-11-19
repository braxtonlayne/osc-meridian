/** Orchestrator-owned interface contract. See docs/CONTRACTS.md. */
import type { ComponentType } from 'preact';
import type { ReadonlySignal } from '@preact/signals';
import type { CompartmentId, FacilityId, MarkingId, TierNo } from './canon-types';

export type AppId =
  | 'registry' | 'transit' | 'personnel' | 'records' | 'mail' | 'ledger'
  | 'reserves' | 'assurance' | 'directives' | 'forms' | 'terminal' | 'system';

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
  | 'system';

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

export type SoundCue = 'window' | 'error' | 'mail' | 'relay';

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
  };
  sound: { play(cue: SoundCue): void };
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
