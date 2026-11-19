/**
 * Message Traffic: the MERIDIAN mail client.
 *
 * Mailbox contents come from the shell's delivery state (`services.mail.delivered`, fed by the
 * narrative layer through services.mail.deliver) and the message pages' `message:` frontmatter.
 * Read state is recorded by logging `mail.read` (the shell keeps `services.mail.read` from the audit
 * trail). Outgoing traffic is logged as `mail.send`; Sent Items and delivery reports are rebuilt
 * from those audit entries, so nothing is stored outside services.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, DocJson, RouteEntry, Trace } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import { siteZone, tick } from '@core/session';
import { loadCanonT2 } from '@core/canon-release';
import { applyDecisions } from '@apps/forms/decisions';
import {
  DataTable,
  Dialog,
  DocumentView,
  MenuBar,
  MessageBox,
  Splitter,
  StatusBar,
  StatusLight,
  Toolbar,
  ToolbarButton,
  ToolbarLabel,
  ToolbarSeparator,
  ToolbarSpacer,
  Tree,
  Button,
  type Column,
  type MenuBarMenu,
  type TreeNode,
} from '@design/index';
import { Icon, type IconId } from '@graphics/icons';
import { EmptyMailFolder, RefusalState } from '@graphics/states';
import {
  PRECEDENCE_CODE,
  deliveryLines,
  dtgFromIso,
  forView,
  highestMarking,
  parseSent,
  prefixSubject,
  quoteBody,
  readHeaders,
  receiptAudit,
  replyAllRecipients,
  sendAudit,
  sentDocNo,
  textToHtml,
  zuluLocal,
  type MsgHeaders,
  type Outgoing,
  type Precedence,
  type SentItem,
  type Delivery,
} from './model';
import { LOWEST_MARKING, MARKINGS, buildDirectory, isMarkingId, markingLabel, markingRank, nameFor } from './directory';
import { inboundMailTraces, outgoingTraces, traceMessage, type TraceMessage } from './traces';
import { AddressBook, Compose, type Draft, type Refusal } from './Compose';
import './mail.css';

/* ------------------------------------------------------------ doc cache */

const docCache = new Map<string, DocJson>();
const docPending = new Map<string, Promise<DocJson | null>>();

function loadCached(svc: ReturnType<typeof useServices>, id: string): Promise<DocJson | null> {
  const hit = docCache.get(id);
  if (hit) return Promise.resolve(hit);
  let p = docPending.get(id);
  if (!p) {
    p = svc.docs
      .load(id)
      .then((d) => {
        docCache.set(id, d);
        return d;
      })
      .catch(() => null)
      .finally(() => docPending.delete(id));
    docPending.set(id, p);
  }
  return p;
}

/** Messages declined for read receipt in this session (no receipt is sent; the prompt is withdrawn). */
const declinedReceipts = new Set<string>();

/** Delivery reports appear this long after dispatch. */
const REPORT_DELAY_MS = 4000;

/* ----------------------------------------------------------------- rows */

type RowKind = 'msg' | 'sent' | 'report' | 'trace';

interface Row {
  key: string;
  kind: RowKind;
  folder: string;
  from: string;
  fromName: string;
  toLine: string;
  subject: string;
  sent: string;
  sortKey: string;
  precedence: Precedence;
  marking: MarkingId;
  unread: boolean;
  attachments: number;
  thread: string | null;
  docNo: string;
  route?: RouteEntry;
  headers?: MsgHeaders;
  sentItem?: SentItem;
  trace?: Trace;
  traceMsg?: TraceMessage;
}

const INBOX = 'Inbox';
const SENT = 'Sent Items';
/** Root width below which a right-hand reading pane is moved under the list. */
const RIGHT_PANE_MIN_ROOT = 1100;

function htmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const d = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  d.querySelectorAll('[data-rx]:not(.rx-released)').forEach((e) => (e.textContent = '[WITHHELD]'));
  d.querySelectorAll('br').forEach((b) => b.replaceWith('\n'));
  d.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,table,ol,ul,blockquote').forEach((e) => e.append('\n\n'));
  d.querySelectorAll('td,th').forEach((e) => e.append('  '));
  return (d.body.textContent ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const TEMPLATE_ICON: Partial<Record<string, IconId>> = {
  memo: 'doc-memo',
  directive: 'doc-directive',
  cable: 'doc-cable',
  minutes: 'doc-minutes',
  form: 'doc-form',
  scan: 'doc-scan',
  ledger: 'doc-ledger',
  dossier: 'doc-dossier',
  message: 'doc-message',
  help: 'doc-help',
  charter: 'doc-charter',
};

/* ------------------------------------------------------------------ App */

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const rootRef = useRef<HTMLDivElement>(null);
  const findRef = useRef<HTMLInputElement>(null);

  // signals read during render subscribe this component
  const delivered = services.mail.delivered.value;
  const readIds = services.mail.read.value;
  const entries = services.audit.entries.value;
  const now = tick.value;
  const operator = services.session.operatorId.value;
  const tier = services.session.tier.value;
  void services.session.compartments.value; // re-render on briefing (releases)
  const meta = services.mail.meta.value;
  // pass two: this account's own mailbox and traffic from other issued accounts
  const account = services.account.def.value;
  const SELF_ADDRESS = account.email;
  const HOME_SITE = account.site;
  const mineTraces = services.traces.mine.value;
  const holdsT2 = services.clearance.satisfies('T2');

  const [, bump] = useState(0);
  const [t2, setT2] = useState<Record<string, string> | null>(null);
  const [folder, setFolder] = useState<string>(INBOX);
  const [selected, setSelected] = useState<string | null>(route?.id ?? null);
  const [filter, setFilter] = useState('');
  const [previewPos, setPreviewPos] = useState<'right' | 'bottom' | 'off'>('right');
  const [byThread, setByThread] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [about, setAbout] = useState(false);
  const [book, setBook] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [rootW, setRootW] = useState(1000);
  const narrow = rootW < 700;
  // A right-hand reading pane narrower than a cable line is unreadable: below
  // RIGHT_PANE_MIN_ROOT the pane moves under the list until the window widens.
  const pos = previewPos === 'right' && rootW < RIGHT_PANE_MIN_ROOT ? 'bottom' : previewPos;
  const [pane, setPane] = useState<'folders' | 'list' | 'message'>(route ? 'message' : 'list');
  const [lastCheck, setLastCheck] = useState<string>(() => zuluLocal(new Date().toISOString(), siteZone.peek()));
  const seenCount = useRef(-1);

  /* ---------------- width -> handheld layout */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e?.contentRect.width ?? 0);
      if (w > 0) setRootW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------------- data */
  const allMail = useMemo(() => services.docs.all().filter((r) => r.app === 'mail'), [services]);
  const mailById = useMemo(() => new Map(allMail.map((r) => [r.id, r])), [allMail]);
  const inMailbox = useMemo(() => delivered.filter((id) => mailById.has(id)), [delivered, mailById]);

  useEffect(() => {
    const ids = route ? [...inMailbox, route.id] : inMailbox;
    let live = true;
    for (const id of ids) {
      if (docCache.has(id)) continue;
      void loadCached(services, id).then(() => live && bump((n) => n + 1));
    }
    return () => {
      live = false;
    };
  }, [inMailbox.join('|'), route?.id]);

  // Tier 2 directory values, released only to a session that satisfies T2
  useEffect(() => {
    if (!holdsT2) return void setT2(null);
    let live = true;
    loadCanonT2()
      .then((v) => live && setT2(v))
      .catch(() => live && setT2(null));
    return () => {
      live = false;
    };
  }, [holdsT2]);

  // decisions on forms this account filed (an approved F-126 reads the filer in)
  useEffect(() => void applyDecisions(services), [mineTraces.length]);

  const traceMail = useMemo(() => inboundMailTraces(mineTraces, account.id), [mineTraces, account.id]);
  const traceMsgs = useMemo(
    () =>
      traceMail.map((t) => ({
        t,
        m: traceMessage(t, { me: account, accountById: (id) => services.account.all().find((a) => a.id === id), isMarking: isMarkingId, lowest: LOWEST_MARKING }),
      })),
    [traceMail, account],
  );

  // new arrivals while open
  const arrivals = delivered.length + traceMail.length;
  useEffect(() => {
    if (seenCount.current >= 0 && arrivals > seenCount.current) {
      const n = arrivals - seenCount.current;
      setStatus(`${n} new item${n === 1 ? '' : 's'} received ${zuluLocal(new Date().toISOString(), siteZone.peek())}.`);
    }
    seenCount.current = arrivals;
  }, [arrivals]);

  const outgoing = useMemo(() => parseSent(entries), [entries]);
  const sentItems = outgoing.filter((x): x is SentItem => x.kind === 'message');
  const receiptsReturned = new Set(outgoing.filter((x) => x.kind === 'receipt').map((x) => (x as { docNo: string }).docNo));

  const seen = useMemo(() => {
    const s = new Set<string>();
    for (const id of inMailbox) {
      const d = docCache.get(id);
      const r = mailById.get(id);
      if (!d || !r) continue;
      const h = readHeaders(r, d, meta[id]);
      [h.from, ...h.to, ...h.cc].forEach((a) => s.add(a));
    }
    for (const si of sentItems) [...si.to, ...si.cc].forEach((a) => s.add(a));
    for (const { m } of traceMsgs) [m.from, ...m.to, ...m.cc].forEach((a) => s.add(a));
    return s;
  }, [inMailbox.join('|'), docCache.size, sentItems.length, traceMsgs]);
  const dir = useMemo(
    () => buildDirectory(seen, { accounts: services.account.all(), t2, restrictToSite: account.tier === 4 ? account.site : null, self: SELF_ADDRESS }),
    [seen, t2, account],
  );
  const readSet = new Set(readIds);

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const id of inMailbox) {
      const r = mailById.get(id)!;
      const h = readHeaders(r, docCache.get(id), meta[id]);
      out.push({
        key: id,
        kind: 'msg',
        folder: h.folder === SENT ? INBOX : h.folder,
        from: h.from,
        fromName: nameFor(h.from, dir),
        toLine: h.to.join('; '),
        subject: h.subject,
        sent: h.sent,
        sortKey: h.sortKey,
        precedence: h.precedence,
        marking: r.marking,
        unread: !readSet.has(id),
        attachments: new Set([...h.attachments, ...(docCache.get(id)?.xrefs.map((x) => x.docNo) ?? [])]).size,
        thread: h.thread,
        docNo: r.docNo,
        route: r,
        headers: h,
      });
    }
    for (const { t, m } of traceMsgs) {
      out.push({
        key: m.docNo,
        kind: 'trace',
        folder: INBOX,
        from: m.from,
        fromName: nameFor(m.from, dir),
        toLine: m.to.join('; '),
        subject: m.subject,
        sent: m.sent,
        sortKey: m.sortKey,
        precedence: m.precedence,
        marking: m.marking,
        unread: !readSet.has(m.docNo),
        attachments: m.attachments.length,
        thread: m.inReplyTo,
        docNo: m.docNo,
        trace: t,
        traceMsg: m,
      });
    }
    for (const s of sentItems) {
      const docNo = sentDocNo(s);
      out.push({
        key: `sent-${s.seq}`,
        kind: 'sent',
        folder: SENT,
        from: SELF_ADDRESS,
        fromName: nameFor(SELF_ADDRESS, dir),
        toLine: s.to.join('; '),
        subject: s.subject,
        sent: dtgFromIso(s.at),
        sortKey: s.at.slice(0, 16),
        precedence: s.precedence,
        marking: s.marking,
        unread: false,
        attachments: s.attachments.length,
        thread: s.inReplyTo,
        docNo,
        sentItem: s,
      });
      if (deliveryLines(s, dir)) {
        // the audit date is pinned in-world; compare the real time of day
        const sentAtMs = realMs(s.at);
        let age = sentAtMs === null ? Infinity : now - sentAtMs;
        if (age < 0) age += 86400000;
        if (age >= REPORT_DELAY_MS) {
          const key = `DR-${s.seq}`;
          out.push({
            key,
            kind: 'report',
            folder: INBOX,
            from: 'mts@a02.cms.mer',
            fromName: nameFor('mts@a02.cms.mer', dir),
            toLine: SELF_ADDRESS,
            subject: `Delivery report: ${s.subject}`,
            sent: dtgFromIso(s.at),
            sortKey: s.at.slice(0, 16) + ':01',
            precedence: 'ROUTINE',
            marking: s.marking,
            unread: !readSet.has(key),
            attachments: 0,
            thread: null,
            docNo: `${docNo}/DR`,
            sentItem: s,
          });
        }
      }
    }
    return out;
  }, [inMailbox.join('|'), docCache.size, entries, readIds, dir, now, meta, traceMsgs, SELF_ADDRESS]);

  const folders = useMemo(() => {
    const custom = [...new Set(rows.filter((r) => r.folder !== INBOX && r.folder !== SENT).map((r) => r.folder))].sort();
    return [INBOX, ...custom, SENT];
  }, [rows]);

  const folderRows = useMemo(() => {
    const t = filter.trim().toLowerCase();
    let list = rows.filter((r) => r.folder === folder);
    if (t) list = list.filter((r) => `${r.fromName} ${r.from} ${r.subject} ${r.docNo} ${r.toLine}`.toLowerCase().includes(t));
    list.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
    if (byThread) {
      const firstIdx = new Map<string, number>();
      list.forEach((r, i) => {
        const k = r.thread ?? r.key;
        if (!firstIdx.has(k)) firstIdx.set(k, i);
      });
      list = list
        .map((r, i) => ({ r, g: firstIdx.get(r.thread ?? r.key)!, i }))
        .sort((a, b) => a.g - b.g || (a.r.sortKey < b.r.sortKey ? -1 : 1))
        .map((x) => x.r);
    }
    return list;
  }, [rows, folder, filter, byThread]);

  const unreadIn = (f: string) => rows.filter((r) => r.folder === f && r.unread).length;

  /* ---------------- route sync */
  useEffect(() => {
    if (!route) return;
    setSelected(route.id);
    setPane('message');
    const r = rows.find((x) => x.key === route.id);
    if (r) setFolder(r.folder);
  }, [route?.id]);

  // when the routed message's folder becomes known after its doc loads
  const routedRow = route ? rows.find((r) => r.key === route.id) : undefined;
  useEffect(() => {
    if (routedRow && selected === routedRow.key && folder !== routedRow.folder) setFolder(routedRow.folder);
  }, [routedRow?.folder]);

  const current: Row | null = rows.find((r) => r.key === selected) ?? null;
  const routedOutside = route && !rows.some((r) => r.key === route.id) && selected === route.id ? route : null;

  /* ---------------- access gate for routed pages */
  const routeKey = route?.access ? (route.access.compartment ? `${route.access.compartment}+T${route.access.tier}` : `T${route.access.tier}`) : null;
  const denied = !!(route && routeKey && !services.clearance.satisfies(routeKey));
  useEffect(() => {
    if (denied && route) services.audit.log('window.open', route.docNo, `Operator ${operator} requested ${route.docNo} in Message Traffic. Display refused: access determination not satisfied.`);
  }, [denied, route?.id]);

  /* ---------------- reading: mail.read + doc.read */
  const lastLogged = useRef<string | null>(null);
  const shownId = current?.key ?? routedOutside?.id ?? null;
  const shownDoc = shownId && (current?.kind === 'msg' || routedOutside) ? docCache.get(shownId) : undefined;
  useEffect(() => {
    if (!shownId || denied) return;
    if (current && current.kind === 'msg') {
      if (!shownDoc) return;
      if (lastLogged.current === shownId) return;
      lastLogged.current = shownId;
      services.audit.log('doc.read', current.docNo);
      if (!readSet.has(shownId))
        services.audit.log('mail.read', shownId, `Operator ${operator} opened message ${current.docNo} (${markingLabel(current.marking)}) in Message Traffic.`);
    } else if (current && current.kind === 'trace') {
      if (lastLogged.current === shownId) return;
      lastLogged.current = shownId;
      const t = current.trace!;
      if (!readSet.has(shownId))
        services.audit.log('mail.read', shownId, `Operator ${operator} opened message ${current.docNo} (${markingLabel(current.marking)}) from ${current.from} in Message Traffic.`, { trace: t.id, kind: t.kind, from: t.from });
      if (!(t.seenBy ?? []).includes(account.id)) services.traces.markSeen(t.id);
    } else if (current && current.kind === 'report') {
      if (lastLogged.current === shownId) return;
      lastLogged.current = shownId;
      if (!readSet.has(shownId)) services.audit.log('mail.read', shownId, `Operator ${operator} opened delivery report ${current.docNo} in Message Traffic.`);
    } else if (routedOutside && shownDoc) {
      if (lastLogged.current === shownId) return;
      lastLogged.current = shownId;
      services.audit.log('doc.read', routedOutside.docNo);
      services.audit.log('mail.read', shownId, `Operator ${operator} opened message ${routedOutside.docNo} from the message centre register.`);
    } else if (current) {
      lastLogged.current = shownId;
    }
  }, [shownId, !!shownDoc, denied]);

  /* ---------------- title / marking / status */
  const previewMarking: MarkingId | null = current?.marking ?? routedOutside?.marking ?? null;
  const screenMarking = denied
    ? LOWEST_MARKING
    : draft
      ? draft.marking
      : highestMarking(
        [...(pane === 'message' || !narrow ? (previewMarking ? [previewMarking] : []) : []), ...(narrow && pane !== 'list' ? [] : folderRows.map((r) => r.marking))],
        markingRank,
        LOWEST_MARKING,
      );
  useEffect(() => {
    if (draft) win.setTitle(draft.subject.trim() || 'Untitled message', '');
    else if (current) win.setTitle(current.subject, current.docNo);
    else if (routedOutside) win.setTitle(routedOutside.title, routedOutside.docNo);
    else win.setTitle(folder, '');
    win.setMarking(screenMarking);
  }, [draft?.subject, !!draft, current?.key, current?.subject, routedOutside?.id, folder, screenMarking]);

  const totalUnread = rows.filter((r) => r.unread).length;

  /* ---------------- actions */
  const refuse = (r: Refusal) => setRefusal(r);

  const selectRow = (key: string | null) => {
    setSelected(key);
    if (key && narrow) setPane('message');
  };

  const openRow = (r: Row) => {
    if (r.route) {
      if (route?.id !== r.route.id) win.navigate(r.route.route);
      setPane('message');
    } else selectRow(r.key);
  };

  const step = (delta: 1 | -1, unreadOnly = false) => {
    const i = folderRows.findIndex((r) => r.key === selected);
    for (let j = i + delta; j >= 0 && j < folderRows.length; j += delta) {
      const r = folderRows[j]!;
      if (!unreadOnly || r.unread) {
        selectRow(r.key);
        return;
      }
    }
    if (unreadOnly) {
      const other = rows.find((r) => r.unread);
      if (other) {
        setFolder(other.folder);
        selectRow(other.key);
        return;
      }
      setStatus('There are no unread items in this mailbox.');
    } else setStatus(delta === 1 ? 'This is the last item in the folder.' : 'This is the first item in the folder.');
  };

  const textOf = (r: Row): string => {
    if (r.kind === 'sent') return r.sentItem!.text;
    if (r.kind === 'trace') return r.traceMsg!.text;
    const d = r.key ? docCache.get(r.key) : undefined;
    if (r.kind === 'report') return reportText(r);
    return d && r.headers ? htmlToText(forView(d, r.headers, meta[r.key]).html) : '';
  };

  const newDraft = (p: Partial<Draft> = {}): Draft => ({
    mode: 'new',
    to: '',
    cc: '',
    subject: '',
    precedence: 'ROUTINE',
    marking: LOWEST_MARKING,
    floor: LOWEST_MARKING,
    receipt: false,
    attachments: [],
    inReplyTo: null,
    text: '',
    ...p,
  });

  const startCompose = (d: Draft) => {
    setDraft(d);
    setStatus('');
  };

  const reply = (mode: 'reply' | 'replyAll' | 'forward') => {
    const r = current;
    if (!r) {
      setStatus('Select a message first.');
      return;
    }
    if (r.kind === 'report' && mode !== 'forward') {
      refuse({ title: 'Reply not possible', text: 'Delivery reports are generated by the message transfer system. Replies to the system mailbox are not accepted.', reference: 'DIR-0301' });
      return;
    }
    if (mode === 'forward' && markingRank(r.marking) >= 2 && tier > 2) {
      refuse({
        title: 'Forwarding refused',
        text: `${r.docNo} is marked ${markingLabel(r.marking)}. Compartmented and higher traffic is not to be forwarded by the addressee; the originator controls onward distribution.`,
        reference: 'DIR-0412',
      });
      return;
    }
    const h = r.headers;
    const q = quoteBody({
      from: r.from,
      to: h?.to ?? r.toLine.split('; ').filter(Boolean),
      cc: h?.cc ?? r.sentItem?.cc ?? [],
      sent: r.sent,
      subject: r.subject,
      docNo: r.docNo,
      text: textOf(r),
    });
    const base = { floor: r.marking, marking: r.marking, inReplyTo: r.docNo, text: q, precedence: r.precedence === 'PRIORITY' ? ('PRIORITY' as const) : ('ROUTINE' as const) };
    if (mode === 'forward') {
      startCompose(newDraft({ ...base, mode, subject: prefixSubject('FW', r.subject), attachments: r.route ? [r.docNo] : [] }));
    } else if (mode === 'reply') {
      startCompose(newDraft({ ...base, mode, to: r.kind === 'sent' ? r.toLine : r.from, subject: prefixSubject('RE', r.subject) }));
    } else {
      const rc = replyAllRecipients({ from: r.from, to: h?.to ?? r.toLine.split('; '), cc: h?.cc ?? [] }, SELF_ADDRESS);
      startCompose(newDraft({ ...base, mode, to: rc.to.join('; '), cc: rc.cc.join('; '), subject: prefixSubject('RE', r.subject) }));
    }
  };

  const send = (m: Outgoing) => {
    const a = sendAudit(operator, m);
    services.audit.log('mail.send', a.subject, a.detail, a.data);
    // traffic for another issued account's mailbox is delivered into that account
    for (const t of outgoingTraces(m, account, services.account.byEmail)) services.traces.post(t);
    setDraft(null);
    setStatus(`Message dispatched to the message centre ${zuluLocal(new Date().toISOString(), siteZone.peek())}. A copy is filed in Sent Items.`);
  };

  const returnReceipt = (r: Row) => {
    const a = receiptAudit(operator, r.docNo, r.subject, r.from);
    services.audit.log('mail.send', a.subject, a.detail, a.data);
    setStatus(`Read receipt for ${r.docNo} returned to ${r.from}.`);
  };

  const print = () => {
    if (!current?.route && !routedOutside) {
      refuse({
        title: 'Print not available',
        text: 'Only registered messages can be released to print. Workstation copies of outgoing traffic and system reports are not records and are not printed.',
        reference: 'DIR-0319',
      });
      return;
    }
    services.print((current?.route ?? routedOutside)!.id);
    setStatus(`${current?.docNo ?? routedOutside?.docNo} sent to the print queue.`);
  };

  const check = () => {
    const t = zuluLocal(new Date().toISOString(), siteZone.peek());
    setLastCheck(t);
    const n = rows.filter((r) => r.unread).length;
    setStatus(`Mailbox checked ${t}. ${n ? `${n} unread item${n === 1 ? '' : 's'}.` : 'No unread items.'} Traffic is delivered as it is released by the message centre.`);
  };

  const refuseDelete = () =>
    refuse({
      title: 'Delete not permitted',
      text: 'Received traffic is a record. It is retained in the mailbox for the records schedule and is disposed of by Records Division at the end of the retention period.',
      reference: 'DIR-0354',
    });
  const refuseUnread = () =>
    refuse({
      title: 'Read state recorded',
      text: 'The time a message was opened is recorded by the message centre against the operator. It cannot be reset at the workstation.',
      reference: 'DIR-0301',
    });
  const refuseSaveAs = () =>
    refuse({
      title: 'Save As not available',
      text: 'Messages may not be saved to files or removable media from this workstation. Paper copies are made through Print and are numbered and recorded.',
      reference: 'DIR-0319',
    });
  const markRead = () => {
    if (!current || !current.unread) {
      setStatus(current ? 'The item is already marked as read.' : 'Select a message first.');
      return;
    }
    services.audit.log('mail.read', current.key, `Operator ${operator} marked message ${current.docNo} as read in Message Traffic.`);
  };

  const openDoc = (docNo: string) => {
    const e = services.docs.byDocNo(docNo);
    if (e) services.openRoute(e.route);
    else setStatus(`${docNo} is not on the MERIDIAN register.`);
  };

  const cancelCompose = () => {
    if (draft && (draft.text.trim() || draft.to.trim() || draft.subject.trim()) && draft.mode === 'new') setConfirmDiscard(true);
    else if (draft && draft.mode !== 'new') setConfirmDiscard(true);
    else setDraft(null);
  };

  // keep keyboard focus inside the window when a dialog closes over a re-rendered control
  useEffect(() => {
    if (refusal || about || book || confirmDiscard) return;
    const root = rootRef.current;
    const a = document.activeElement;
    if (root && (!a || a === document.body || !a.isConnected)) root.focus({ preventScroll: true });
  }, [refusal, about, book, confirmDiscard]);

  /* ---------------- keyboard */
  const onKey = (e: KeyboardEvent) => {
    if (refusal || about || book || confirmDiscard) return;
    const k = e.key.toLowerCase();
    const inField = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (draft) {
      if (e.key === 'Escape' && !inField) {
        e.preventDefault();
        cancelCompose();
      }
      return;
    }
    const act = (fn: () => void) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    };
    if (e.ctrlKey && e.shiftKey && k === 'm') return act(() => startCompose(newDraft()));
    if (e.ctrlKey && e.shiftKey && k === 'r') return act(() => reply('replyAll'));
    if (e.ctrlKey && e.shiftKey && k === 'b') return act(() => setBook(true));
    if (e.ctrlKey && !e.shiftKey && k === 'n') return act(() => startCompose(newDraft()));
    if (e.ctrlKey && !e.shiftKey && k === 'r') return act(() => reply('reply'));
    if (e.ctrlKey && !e.shiftKey && k === 'f') return act(() => reply('forward'));
    if (e.ctrlKey && k === 'p') return act(print);
    if (e.ctrlKey && k === 'e') return act(() => findRef.current?.focus());
    if (e.ctrlKey && k === 'q') return act(markRead);
    if (e.ctrlKey && k === 'u') return act(refuseUnread);
    if (e.ctrlKey && e.key === '.') return act(() => step(1));
    if (e.ctrlKey && e.key === ',') return act(() => step(-1));
    if (e.key === 'F9') return act(check);
    if (e.key === 'Delete' && !inField) return act(refuseDelete);
    if (e.key === 'Backspace' && narrow && !inField && pane !== 'folders') return act(() => setPane(pane === 'message' ? 'list' : 'folders'));
  };

  /* ---------------- menus */
  const helpRoute = (docNo: string) => services.docs.byDocNo(docNo);
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: 'New &Message', shortcut: 'Ctrl+Shift+M', onSelect: () => startCompose(newDraft()) },
        { label: '&Open Selected Item', shortcut: 'Enter', onSelect: () => (current ? openRow(current) : setStatus('Select a message first.')), disabled: !current },
        { separator: true },
        { label: 'Save &As...', onSelect: refuseSaveAs },
        { label: '&Print', shortcut: 'Ctrl+P', onSelect: print, disabled: !current && !routedOutside },
        { separator: true },
        { label: '&Close', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: '&Delete', shortcut: 'Del', onSelect: refuseDelete, disabled: !current },
        { label: 'Mark as Rea&d', shortcut: 'Ctrl+Q', onSelect: markRead, disabled: !current },
        { label: 'Mark as &Unread', shortcut: 'Ctrl+U', onSelect: refuseUnread, disabled: !current },
        { separator: true },
        { label: '&Find in Folder', shortcut: 'Ctrl+E', onSelect: () => findRef.current?.focus() },
      ],
    },
    {
      label: '&View',
      items: [
        { label: 'Reading Pane &Right', radio: true, checked: previewPos === 'right', onSelect: () => setPreviewPos('right') },
        { label: 'Reading Pane &Bottom', radio: true, checked: previewPos === 'bottom', onSelect: () => setPreviewPos('bottom') },
        { label: 'Reading Pane &Off', radio: true, checked: previewPos === 'off', onSelect: () => setPreviewPos('off') },
        { separator: true },
        { label: 'Arrange by &Conversation', checked: byThread, onSelect: () => setByThread(!byThread) },
      ],
    },
    {
      label: '&Go',
      items: [
        ...folders.map((f) => ({ label: f, radio: true, checked: folder === f, onSelect: () => { setFolder(f); setPane('list'); } })),
        { separator: true },
        { label: '&Next Item', shortcut: 'Ctrl+.', onSelect: () => step(1) },
        { label: '&Previous Item', shortcut: 'Ctrl+,', onSelect: () => step(-1) },
        { label: 'Next &Unread Item', onSelect: () => step(1, true) },
      ],
    },
    {
      label: '&Actions',
      items: [
        { label: '&New Message', shortcut: 'Ctrl+N', onSelect: () => startCompose(newDraft()) },
        { separator: true },
        { label: '&Reply', shortcut: 'Ctrl+R', onSelect: () => reply('reply'), disabled: !current },
        { label: 'Reply to &All', shortcut: 'Ctrl+Shift+R', onSelect: () => reply('replyAll'), disabled: !current },
        { label: '&Forward', shortcut: 'Ctrl+F', onSelect: () => reply('forward'), disabled: !current },
        { separator: true },
        {
          label: 'Send Read &Receipt',
          onSelect: () => current && returnReceipt(current),
          disabled: !current?.headers?.readReceipt || receiptsReturned.has(current.docNo),
        },
        { label: '&Check for Messages', shortcut: 'F9', onSelect: check },
      ],
    },
    {
      label: '&Tools',
      items: [{ label: '&Address Book...', shortcut: 'Ctrl+Shift+B', onSelect: () => setBook(true) }],
    },
    {
      label: '&Help',
      items: [
        ...(['KB-0001', 'OSC-DIR-0301'] as const)
          .map((d) => helpRoute(d))
          .filter((e): e is RouteEntry => !!e)
          .map((e) => ({ label: `${e.title} (${e.docNo.replace(/^OSC-/, '')})`, onSelect: () => services.openRoute(e.route) })),
        { separator: true },
        { label: '&About Message Traffic', onSelect: () => setAbout(true) },
      ],
    },
  ];

  /* ---------------- render pieces */
  const treeNodes: TreeNode[] = [
    {
      id: 'mbx',
      label: `Mailbox - ${operator}`,
      icon: <Icon id="mail" size={16} />,
      children: folders.map((f) => {
        const u = unreadIn(f);
        return {
          id: f,
          label: f,
          meta: u ? `(${u})` : undefined,
          icon: <Icon id={folder === f ? 'folder-open' : 'folder'} size={16} />,
        };
      }),
    },
  ];

  const narrowColumns: Column<Row>[] = [
    {
      key: 'read',
      header: 'Read',
      width: 34,
      align: 'center',
      sortValue: (r) => (r.unread ? 0 : 1),
      render: (r) => <Icon id={r.unread ? 'mail-unread' : 'mail-read'} size={16} title={r.unread ? 'Unread' : 'Read'} />,
    },
    {
      key: 'subject',
      header: folder === SENT ? 'To / Subject' : 'From / Subject',
      wrap: true,
      sortValue: (r) => r.subject,
      render: (r) => (
        <span class="mt-two">
          <span>{folder === SENT ? r.toLine : r.fromName}</span>
          <span>
            {r.precedence !== 'ROUTINE' ? `${r.precedence}: ` : ''}
            {r.subject}
          </span>
        </span>
      ),
    },
    { key: 'sent', header: 'DTG', width: 64, mono: true, sortValue: (r) => r.sortKey, render: (r) => r.sent.slice(0, 7) },
  ];

  const columns: Column<Row>[] = [
    {
      key: 'precedence',
      header: 'Prec',
      width: 36,
      align: 'center',
      mono: true,
      title: 'Precedence: R ROUTINE, P PRIORITY, O IMMEDIATE, Z FLASH',
      sortValue: (r) => ['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'FLASH'].indexOf(r.precedence),
      render: (r) => <span title={r.precedence}>{PRECEDENCE_CODE[r.precedence]}</span>,
    },
    {
      key: 'read',
      header: 'Read',
      width: 38,
      align: 'center',
      sortValue: (r) => (r.unread ? 0 : 1),
      render: (r) => <Icon id={r.unread ? 'mail-unread' : 'mail-read'} size={16} title={r.unread ? 'Unread' : 'Read'} />,
    },
    {
      key: 'att',
      header: 'Att',
      width: 30,
      align: 'center',
      sortValue: (r) => r.attachments,
      render: (r) => (r.attachments ? <Icon id="attachment" size={16} title={`${r.attachments} attachment${r.attachments === 1 ? '' : 's'}`} /> : null),
    },
    folder === SENT
      ? { key: 'to', header: 'To', width: 150, sortValue: (r) => r.toLine, render: (r) => r.toLine }
      : { key: 'from', header: 'From', width: 124, sortValue: (r) => r.fromName, render: (r) => r.fromName },
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (r) => r.subject,
      render: (r) => <span class={byThread && r.thread && folderRows.find((x) => (x.thread ?? x.key) === r.thread)?.key !== r.key ? 'mt-indent' : undefined}>{r.subject}</span>,
    },
    { key: 'sent', header: folder === SENT ? 'Sent (DTG)' : 'Received (DTG)', width: 112, mono: true, sortValue: (r) => r.sortKey, render: (r) => r.sent },
    ...(pos === 'right' || narrow ? [] : [{ key: 'docNo', header: 'Msg No', width: 128, mono: true, sortValue: (r: Row) => r.docNo, render: (r: Row) => r.docNo }]),
  ];

  const listView = (
    <div class="mt-list">
      <div class="mt-pane-head">
        <span class="mt-pane-title">{folder}</span>
        <label class="mt-find">
          <span>Find</span>
          <input ref={findRef} class="f-input" type="search" value={filter} onInput={(e) => setFilter((e.target as HTMLInputElement).value)} aria-label={`Find in ${folder}`} />
        </label>
      </div>
      <DataTable
        columns={narrow ? narrowColumns : columns}
        rows={folderRows}
        rowKey={(r) => r.key}
        label={`Messages in ${folder}`}
        selection="single"
        selected={selected ? [selected] : []}
        onSelectionChange={(k) => selectRow(k[0] ?? null)}
        onActivate={openRow}
        sortRows={!byThread}
        dense
        rowClass={(r) => (r.unread ? 'mt-unread' : undefined)}
        empty={filter ? <div class="mt-empty-line">No items in {folder} match "{filter}".</div> : <EmptyMailFolder folder={folder} />}
      />
    </div>
  );

  const preview = (
    <div class="mt-preview" aria-label="Reading pane">
      {current ? (
        <MessagePane
          row={current}
          doc={current.kind === 'msg' ? docCache.get(current.key) ?? null : null}
          delivery={meta[current.key]}
          dir={dir}
          services={services}
          receiptPending={!!current.headers?.readReceipt && !receiptsReturned.has(current.docNo) && !declinedReceipts.has(current.docNo)}
          onReceipt={(send) => {
            if (send) returnReceipt(current);
            else {
              declinedReceipts.add(current.docNo);
              bump((n) => n + 1);
              setStatus(`No read receipt sent for ${current.docNo}.`);
            }
          }}
          onOpenDoc={openDoc}
          narrowBack={narrow ? () => setPane('list') : undefined}
        />
      ) : routedOutside ? (
        <MessagePane
          row={null}
          route={routedOutside}
          doc={docCache.get(routedOutside.id) ?? null}
          delivery={meta[routedOutside.id]}
          dir={dir}
          services={services}
          receiptPending={false}
          onReceipt={() => undefined}
          onOpenDoc={openDoc}
          narrowBack={narrow ? () => setPane('list') : undefined}
        />
      ) : (
        <div class="mt-preview-empty">
          {folderRows.length ? 'Select an item to read it in this pane.' : `${folder} is empty.`}
        </div>
      )}
    </div>
  );

  const folderPane = (
    <div class="mt-folders">
      <div class="mt-pane-head">
        <span class="mt-pane-title">Folders</span>
      </div>
      <Tree
        nodes={treeNodes}
        label="Mail folders"
        selectedId={folder}
        defaultExpanded={['mbx']}
        onSelect={(n) => {
          if (n.id === 'mbx') return;
          setFolder(n.id);
          setSelected(null);
          setPane('list');
        }}
        onActivate={(n) => {
          if (n.id !== 'mbx') setPane('list');
        }}
      />
    </div>
  );

  let main;
  if (narrow) {
    main = (
      <div class="mt-handheld">
        <div class="mt-crumbs" role="navigation" aria-label="Mailbox view">
          <Button size="small" label="Folders" pressed={pane === 'folders'} onClick={() => setPane('folders')} />
          <Button size="small" label={folder} pressed={pane === 'list'} onClick={() => setPane('list')} />
          <Button size="small" label="Message" pressed={pane === 'message'} disabled={!current && !routedOutside} onClick={() => setPane('message')} />
        </div>
        {pane === 'folders' ? folderPane : pane === 'list' ? listView : preview}
      </div>
    );
  } else {
    const listW = Math.max(320, Math.min(620, Math.round((rootW - 190) * 0.52)));
    const right =
      pos === 'off' ? (
        listView
      ) : (
        <Splitter key={pos} direction={pos === 'right' ? 'horizontal' : 'vertical'} initial={pos === 'right' ? listW : 260} min={160} label="Resize reading pane">
          {listView}
          {preview}
        </Splitter>
      );
    main = (
      <Splitter direction="horizontal" initial={180} min={130} max={320} label="Resize folder pane">
        {folderPane}
        {right}
      </Splitter>
    );
  }

  if (denied && route) {
    return (
      <div class="mt-root" ref={rootRef}>
        <RefusalState
          authority="Classification Control, Office of Internal Assurance"
          reference={route.docNo}
          reason={`Requires Tier ${route.access!.tier} access determination${route.access!.compartment ? ` and ${route.access!.compartment} compartment briefing` : ''}. Display of ${route.docNo} to this operator is not authorised.`}
          docNo={route.docNo}
        />
      </div>
    );
  }

  const shownDocNo = current?.docNo ?? routedOutside?.docNo;
  return (
    <div class="mt-root" ref={rootRef} onKeyDown={onKey} tabIndex={-1}>
      <MenuBar menus={menus} label="Message Traffic menu" />
      {draft ? (
        <Compose
          draft={draft}
          dir={dir}
          services={services}
          onChange={setDraft}
          onSend={send}
          onCancel={cancelCompose}
          onRefuse={refuse}
        />
      ) : (
        <>
          <Toolbar label="Message Traffic">
            <ToolbarButton label="New" icon={<Icon id="mail" size={16} />} onClick={() => startCompose(newDraft())} title="New Message (Ctrl+Shift+M)" />
            <ToolbarSeparator />
            <ToolbarButton label="Reply" icon={<Icon id="mail-reply" size={16} />} onClick={() => reply('reply')} disabled={!current} title="Reply (Ctrl+R)" />
            <ToolbarButton label="Reply All" onClick={() => reply('replyAll')} disabled={!current} title="Reply to All (Ctrl+Shift+R)" />
            <ToolbarButton label="Forward" icon={<Icon id="mail-forward" size={16} />} onClick={() => reply('forward')} disabled={!current} title="Forward (Ctrl+F)" />
            <ToolbarSeparator />
            <ToolbarButton label="Print" icon={<Icon id="print" size={16} />} onClick={print} disabled={!current && !routedOutside} title="Print (Ctrl+P)" />
            <ToolbarButton label="Previous" icon={<Icon id="back" size={16} variant="glyph" />} onClick={() => step(-1)} title="Previous Item (Ctrl+,)" />
            <ToolbarButton label="Next" icon={<Icon id="forward" size={16} variant="glyph" />} onClick={() => step(1)} title="Next Item (Ctrl+.)" />
            <ToolbarSeparator />
            <ToolbarButton label="Address Book" icon={<Icon id="user" size={16} />} onClick={() => setBook(true)} title="Address Book (Ctrl+Shift+B)" />
            <ToolbarSpacer />
            <ToolbarButton label="Check" icon={<Icon id="refresh" size={16} variant="glyph" />} onClick={check} title="Check for Messages (F9)" />
            {!narrow && <ToolbarLabel>{totalUnread} unread</ToolbarLabel>}
          </Toolbar>
          <div class="mt-main">{main}</div>
        </>
      )}
      <StatusBar
        panes={[
          { id: 'msg', fill: true, content: draft ? `Composing ${draft.mode === 'new' ? 'new message' : draft.inReplyTo ?? ''} · ${markingLabel(draft.marking)}` : status || (shownDocNo ? `${shownDocNo} · ${markingLabel(previewMarking ?? LOWEST_MARKING)}` : 'Ready') },
          { id: 'count', width: 150, content: `${folderRows.length} item${folderRows.length === 1 ? '' : 's'}, ${unreadIn(folder)} unread` },
          ...(narrow
            ? []
            : [
                { id: 'check', width: 150, mono: true, content: `Checked ${lastCheck}` },
                { id: 'link', width: 190, content: <StatusLight status="NOMINAL" word="CONNECTED" note={`MC ${HOME_SITE}`} /> },
              ]),
        ]}
      />
      <MessageBox
        open={!!refusal}
        title={refusal?.title ?? ''}
        kind="warning"
        reference={refusal?.reference}
        onOpen={() => services.sound.play('error')}
        onClose={() => setRefusal(null)}
      >
        {refusal?.text}
      </MessageBox>
      <MessageBox open={about} title="About Message Traffic" kind="info" onClose={() => setAbout(false)}>
        <div class="mt-about">
          <div>Message Traffic, MERIDIAN Workstation Environment.</div>
          <div>Mailbox {SELF_ADDRESS} on message centre {HOME_SITE}.</div>
          <div>Traffic accepted for {MARKINGS.length} markings; precedence ROUTINE to FLASH.</div>
        </div>
      </MessageBox>
      <ConfirmDiscard
        open={confirmDiscard}
        onClose={(yes) => {
          setConfirmDiscard(false);
          if (yes) {
            setDraft(null);
            setStatus('Message discarded. Nothing was sent.');
          }
        }}
      />
      <AddressBook
        open={book}
        dir={dir}
        toLabel="New &Message"
        onClose={() => setBook(false)}
        onPick={(addr, field) => startCompose(newDraft(field === 'to' ? { to: addr } : { cc: addr }))}
        onRefuse={refuse}
      />
    </div>
  );
}

/* ------------------------------------------------------- helpers/views */

/** Real epoch ms of an audit ISO (the date part is pinned; the time is real UTC today). */
function realMs(iso: string): number | null {
  const m = /T(\d{2}):(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date();
  d.setUTCHours(Number(m[1]), Number(m[2]), Number(m[3]), 0);
  return d.getTime();
}

function reportText(r: Row): string {
  return `Delivery report for ${r.sentItem ? sentDocNo(r.sentItem) : r.docNo}.`;
}

function ConfirmDiscard({ open, onClose }: { open: boolean; onClose: (yes: boolean) => void }) {
  return (
    <MessageBoxConfirm open={open} onClose={onClose} title="Discard message" text="Discard this message? It has not been sent and no copy will be kept." />
  );
}

function MessageBoxConfirm({ open, onClose, title, text }: { open: boolean; onClose: (yes: boolean) => void; title: string; text: string }) {
  return (
    <Dialog
      open={open}
      title={title}
      kind="question"
      buttons={[
        { label: '&Yes', value: 'yes' },
        { label: '&No', value: 'no', isDefault: true, isCancel: true },
      ]}
      onClose={(v) => onClose(v === 'yes')}
    >
      {text}
    </Dialog>
  );
}

interface PaneProps {
  row: Row | null;
  route?: RouteEntry;
  doc: DocJson | null;
  delivery?: Delivery;
  dir: ReturnType<typeof buildDirectory>;
  services: ReturnType<typeof useServices>;
  receiptPending: boolean;
  onReceipt: (send: boolean) => void;
  onOpenDoc: (docNo: string) => void;
  narrowBack?: () => void;
}

function MessagePane({ row, route, doc, delivery, dir, services, receiptPending, onReceipt, onOpenDoc, narrowBack }: PaneProps) {
  const operator = services.session.operatorId.value;
  const onHover = (docNo: string) => (i: { auth: string; ref: string }) =>
    services.audit.log('redaction.hover', docNo, `Operator ${operator} examined withheld material in ${docNo} (${i.auth} ${i.ref}). No release was made.`);

  const SELF_ADDRESS = services.account.def.value.email;

  // traffic from another issued account (shared-store trace)
  if (row && row.kind === 'trace') {
    const m = row.traceMsg!;
    const att = m.attachments
      .map((d) => services.docs.byDocNo(d))
      .filter((e): e is RouteEntry => !!e)
      .map((e) => ({ docNo: e.docNo, route: e.route, title: e.title }));
    const synthetic: DocJson = {
      id: row.key,
      route: '/mail',
      app: 'mail',
      family: 'mail',
      template: 'message',
      docNo: m.docNo,
      title: m.subject,
      marking: m.marking,
      originator: m.originator,
      revision: 1,
      date: (row.trace?.at ?? '').slice(0, 10),
      summary: m.subject,
      html: textToHtml(m.text),
      redactions: [],
      xrefs: att,
      headings: [],
      frontmatter: { from: m.from, to: m.to, cc: m.cc, sent: m.sent, precedence: m.precedence, subject: m.subject },
    };
    return (
      <div class="mt-reader">
        {narrowBack && <BackBar onBack={narrowBack} />}
        {m.attachments.length > 0 && <Attachments docNos={m.attachments} services={services} onOpen={onOpenDoc} />}
        <DocumentView doc={synthetic} markings={MARKINGS} onNavigate={(r) => services.openRoute(r)} />
      </div>
    );
  }

  // synthetic items: Sent Items copies and delivery reports
  if (row && row.kind !== 'msg') {
    const s = row.sentItem!;
    const isReport = row.kind === 'report';
    const lines = isReport ? deliveryLines(s, dir) ?? [] : [];
    const html = isReport
      ? textToHtml(
          [
            `Your message ${sentDocNo(s)} "${s.subject}" (${s.precedence}) was accepted by the message transfer system at ${zuluLocal(s.at, siteZone.peek())}.`,
            lines
              .map((l) =>
                l.outcome === 'delivered'
                  ? `${l.address}: delivered to the addressee's mailbox.`
                  : `${l.address}: not listed in the MERIDIAN directory. Passed to the message centre for manual routing.`,
              )
              .join('\n'),
            s.receiptRequested ? 'A read receipt was requested. Receipts are returned when the addressee opens the message.' : '',
            'This report is generated automatically. Do not reply to it.',
          ]
            .filter(Boolean)
            .join('\n\n'),
        )
      : textToHtml(s.text);
    const att = s.attachments
      .map((d) => services.docs.byDocNo(d))
      .filter((e): e is RouteEntry => !!e)
      .map((e) => ({ docNo: e.docNo, route: e.route, title: e.title }));
    const synthetic: DocJson = {
      id: row.key,
      route: '/mail',
      app: 'mail',
      family: 'mail',
      template: 'message',
      docNo: row.docNo,
      title: row.subject,
      marking: row.marking,
      originator: isReport ? 'CMS/ALPHA-02' : `${services.session.operatorId.value}`,
      revision: 1,
      date: s.at.slice(0, 10),
      summary: row.subject,
      html,
      redactions: [],
      xrefs: isReport ? [] : att,
      headings: [],
      frontmatter: {
        from: row.from,
        to: isReport ? [SELF_ADDRESS] : s.to,
        cc: isReport ? [] : s.cc,
        sent: row.sent,
        precedence: row.precedence,
        subject: row.subject,
      },
    };
    return (
      <div class="mt-reader">
        {narrowBack && <BackBar onBack={narrowBack} />}
        {!isReport && s.attachments.length > 0 && <Attachments docNos={s.attachments} services={services} onOpen={onOpenDoc} />}
        <DocumentView doc={synthetic} markings={MARKINGS} onNavigate={(r) => services.openRoute(r)} />
      </div>
    );
  }

  const entry = row?.route ?? route!;
  if (!doc) return <div class="mt-preview-empty">Retrieving {entry.docNo} from the message centre.</div>;
  const h = readHeaders(entry, doc, delivery);
  const viewDoc = forView(doc, h, delivery);
  const atts = [...h.attachments, ...doc.xrefs.map((x) => x.docNo)].filter((d, i, a) => a.indexOf(d) === i);
  return (
    <div class="mt-reader">
      {narrowBack && <BackBar onBack={narrowBack} />}
      {!row && (
        <div class="mt-infobar" role="note">
          <Icon id="info" size={16} />
          <span>This message is not held in your mailbox. It is displayed from the message centre register.</span>
        </div>
      )}
      {receiptPending && (
        <div class="mt-infobar" role="note">
          <Icon id="mail-read" size={16} />
          <span>{nameFor(h.from, dir)} has asked to be notified when you read this message.</span>
          <Button size="small" label="&Send Receipt" onClick={() => onReceipt(true)} />
          <Button size="small" label="Do &Not Send" onClick={() => onReceipt(false)} />
        </div>
      )}
      {atts.length > 0 && <Attachments docNos={atts} services={services} onOpen={onOpenDoc} />}
      <DocumentView doc={viewDoc} markings={MARKINGS} onNavigate={(r) => services.openRoute(r)} onRedactionHover={onHover(doc.docNo)} />
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <div class="mt-backbar">
      <Button size="small" label="Back to list" onClick={onBack} />
    </div>
  );
}

function Attachments({ docNos, services, onOpen }: { docNos: string[]; services: ReturnType<typeof useServices>; onOpen: (d: string) => void }) {
  return (
    <div class="mt-attachments" role="list" aria-label="Attachments">
      <span class="mt-attachments__label">Attachments:</span>
      {docNos.map((d) => {
        const e = services.docs.byDocNo(d);
        const icon = (e && TEMPLATE_ICON[e.template]) ?? 'attachment';
        return (
          <span role="listitem" key={d} class="mt-att">
            <Icon id={icon} size={16} />
            {e ? (
              <a
                href={e.route}
                onClick={(ev) => {
                  if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
                  ev.preventDefault();
                  onOpen(d);
                }}
                title={e.title}
              >
                <span class="mt-mono">{e.docNo}</span> {e.title}
              </a>
            ) : (
              <span class="mt-mono" title="Not on the MERIDIAN register">
                {d}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
