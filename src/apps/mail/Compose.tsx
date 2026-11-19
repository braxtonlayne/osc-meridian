/** Message Traffic: compose / reply / forward form and the address book dialog. */
import { useMemo, useState } from 'preact/hooks';
import type { Services } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { isRx, rxInfo } from '@core/rx';
import {
  Button,
  Checkbox,
  DataTable,
  Dialog,
  FieldGroup,
  FieldMessage,
  Redaction,
  Select,
  TextArea,
  TextField,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  type Column,
} from '@design/index';
import { Icon } from '@graphics/icons';
import {
  TEXT_LIMIT,
  PRECEDENCES,
  mayOriginate,
  resolveRecipient,
  splitRecipients,
  type DirEntry,
  type Outgoing,
  type Precedence,
  type Resolution,
} from './model';
import { MARKINGS, markingLabel, markingRank } from './directory';

export interface Draft {
  mode: 'new' | 'reply' | 'replyAll' | 'forward';
  to: string;
  cc: string;
  subject: string;
  precedence: Precedence;
  marking: MarkingId;
  /** Lowest marking the message may carry (the quoted original's). */
  floor: MarkingId;
  receipt: boolean;
  attachments: string[]; // docNos
  inReplyTo: string | null;
  text: string;
}

export interface Refusal {
  title: string;
  text: string;
  reference: string;
}

interface ComposeProps {
  draft: Draft;
  dir: DirEntry[];
  services: Services;
  onChange: (d: Draft) => void;
  onSend: (m: Outgoing) => void;
  onCancel: () => void;
  onRefuse: (r: Refusal) => void;
}

type Errors = Partial<Record<'to' | 'cc' | 'subject' | 'precedence' | 'marking' | 'attach' | 'text', string>>;

function describe(r: Resolution): string | null {
  switch (r.status) {
    case 'external':
      return `${r.input} is not a MERIDIAN mailbox. The message centre has no gateway to outside mail systems; only .mer addresses can be reached.`;
    case 'unknown':
      return `"${r.input}" was not found in the MERIDIAN directory. Enter the full .mer address.`;
    case 'ambiguous':
      return `"${r.input}" matches ${r.matches.length} directory entries (${r.matches.map((m) => m.address).join(', ')}). Enter the full address.`;
    default:
      return null;
  }
}

/** Resolve a To/Cc line. Returns addresses or the first rejection. */
function resolveLine(line: string, dir: DirEntry[]): { addresses: string[]; error: string | null; normalized: string } {
  const out: string[] = [];
  for (const tok of splitRecipients(line)) {
    const r = resolveRecipient(tok, dir, isRx);
    const err = describe(r);
    if (err) return { addresses: out, error: err, normalized: line };
    if (r.status === 'resolved' || r.status === 'unlisted') out.push(r.address);
  }
  return { addresses: out, error: null, normalized: out.join('; ') };
}

export function Compose({ draft, dir, services, onChange, onSend, onCancel, onRefuse }: ComposeProps) {
  const [errors, setErrors] = useState<Errors>({});
  const [book, setBook] = useState(false);
  const [attachNo, setAttachNo] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const set = (p: Partial<Draft>) => onChange({ ...draft, ...p });
  const tier = services.session.tier.value;

  const checkNames = (): { to: string[]; cc: string[] } | null => {
    const to = resolveLine(draft.to, dir);
    const cc = resolveLine(draft.cc, dir);
    const e: Errors = {};
    if (to.error) e.to = to.error;
    else if (!to.addresses.length) e.to = 'At least one addressee is required.';
    if (cc.error) e.cc = cc.error;
    setErrors(e);
    if (e.to || e.cc) return null;
    set({ to: to.normalized, cc: cc.normalized });
    const unlisted = [...to.addresses, ...cc.addresses].filter((a) => !dir.some((d) => d.address.toLowerCase() === a.toLowerCase()));
    setNote(
      unlisted.length
        ? `${unlisted.join('; ')} ${unlisted.length === 1 ? 'is' : 'are'} not listed in the directory. Traffic for unlisted mailboxes is passed to the message centre for manual routing.`
        : 'All names resolved against the MERIDIAN directory.',
    );
    return { to: to.addresses, cc: cc.addresses };
  };

  const send = () => {
    const names = checkNames();
    if (!names) return;
    const e: Errors = {};
    if (!draft.subject.trim()) e.subject = 'A subject line is required by the message centre.';
    if (draft.text.length > TEXT_LIMIT) e.text = 'The text exceeds what the message centre accepts in one message. Shorten it or send it in parts.';
    if (!mayOriginate(draft.precedence, tier))
      e.precedence = `Precedence ${draft.precedence} is assigned by a releasing officer. Resubmit at PRIORITY or ROUTINE.`;
    if (markingRank(draft.marking) < markingRank(draft.floor))
      e.marking = `The message quotes material marked ${markingLabel(draft.floor)}. It must carry at least that marking.`;
    else if (tier > 2 && markingRank(draft.marking) > Math.max(2, markingRank(draft.floor)))
      e.marking = `Origination at ${markingLabel(draft.marking)} requires a Tier 2 releasing officer.`;
    setErrors(e);
    if (Object.keys(e).length) {
      services.sound.play('error');
      return;
    }
    onSend({
      to: names.to,
      cc: names.cc,
      subject: draft.subject.trim(),
      precedence: draft.precedence,
      marking: draft.marking,
      receiptRequested: draft.receipt,
      attachments: draft.attachments,
      inReplyTo: draft.inReplyTo,
      text: draft.text,
    });
  };

  const addAttachment = () => {
    const raw = attachNo.trim().toUpperCase();
    if (!raw) {
      setErrors({ ...errors, attach: 'Enter the document number to attach.' });
      return;
    }
    const entry = services.docs.byDocNo(raw) ?? services.docs.byDocNo(`OSC-${raw}`);
    if (!entry) {
      setErrors({ ...errors, attach: `${raw} is not on the MERIDIAN register.` });
      return;
    }
    const key = entry.access ? (entry.access.compartment ? `${entry.access.compartment}+T${entry.access.tier}` : `T${entry.access.tier}`) : null;
    if (key && !services.clearance.satisfies(key)) {
      onRefuse({
        title: 'Attachment refused',
        text: `${entry.docNo} cannot be attached. Display of the document to this operator is not authorised, and a record may not be passed on by an operator who cannot open it.`,
        reference: 'DIR-0412',
      });
      return;
    }
    const next: Partial<Draft> = {};
    if (!draft.attachments.includes(entry.docNo)) next.attachments = [...draft.attachments, entry.docNo];
    if (markingRank(entry.marking) > markingRank(draft.floor)) {
      next.floor = entry.marking;
      if (markingRank(draft.marking) < markingRank(entry.marking)) next.marking = entry.marking;
    }
    set(next);
    setAttachNo('');
    setErrors({ ...errors, attach: undefined });
  };

  const heading = { new: 'New message', reply: 'Reply', replyAll: 'Reply to all', forward: 'Forward' }[draft.mode];

  return (
    <div class="mt-compose" onKeyDown={(e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        send();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        checkNames();
      }
    }}>
      <Toolbar label="Message">
        <ToolbarButton label="Send" icon={<Icon id="mail-forward" size={16} variant="glyph" />} onClick={send} title="Send (Ctrl+Enter)" />
        <ToolbarSeparator />
        <ToolbarButton label="Check Names" icon={<Icon id="check" size={16} variant="glyph" />} onClick={() => void checkNames()} title="Check Names (Ctrl+K)" />
        <ToolbarButton label="Address Book" icon={<Icon id="user" size={16} variant="glyph" />} onClick={() => setBook(true)} />
        <ToolbarSeparator />
        <ToolbarButton label="Discard" icon={<Icon id="close" size={16} variant="glyph" />} onClick={onCancel} />
      </Toolbar>
      <div class="mt-compose__body">
        <div class="mt-compose__head">{heading}</div>
        <FieldGroup labelWidth="96px">
          <TextField label="To" value={draft.to} onInput={(v) => set({ to: v })} error={errors.to} required name="to" />
          <TextField label="Cc" value={draft.cc} onInput={(v) => set({ cc: v })} error={errors.cc} name="cc" />
          <TextField label="Subject" value={draft.subject} onInput={(v) => set({ subject: v })} error={errors.subject} required name="subject" maxLength={120} />
          <Select
            label="Precedence"
            value={draft.precedence}
            options={PRECEDENCES.map((p) => ({ value: p, label: p }))}
            onChange={(v) => set({ precedence: v as Precedence })}
            error={errors.precedence}
            width={14}
          />
          <Select
            label="Marking"
            value={draft.marking}
            options={[...MARKINGS].sort((a, b) => a.rank - b.rank).map((m) => ({ value: m.id, label: m.label }))}
            onChange={(v) => set({ marking: v as MarkingId })}
            error={errors.marking}
            width={32}
          />
          <Checkbox label="Request a read receipt" checked={draft.receipt} onChange={(v) => set({ receipt: v })} aligned />
        </FieldGroup>
        {note && <FieldMessage kind="notice">{note}</FieldMessage>}
        <div class="mt-compose__attach">
          <span class="mt-compose__attach-label">Attachments</span>
          {draft.attachments.length === 0 && <span class="mt-dim">None. Records are attached by document number.</span>}
          {draft.attachments.map((d) => (
            <span class="mt-chip" key={d}>
              <Icon id="attachment" size={16} variant="glyph" />
              <span class="mt-mono">{d}</span>
              <Button size="small" label="Remove" onClick={() => set({ attachments: draft.attachments.filter((x) => x !== d) })} />
            </span>
          ))}
        </div>
        <div class="mt-compose__attach-add">
          <TextField label="Attach document" value={attachNo} onInput={setAttachNo} mono upper width={20} error={errors.attach} name="attach" />
          <Button label="&Attach" onClick={addAttachment} />
        </div>
        <TextArea
          label="Message text"
          error={errors.text}
          layout="stacked"
          value={draft.text}
          onInput={(v) => set({ text: v })}
          rows={12}
          maxLength={TEXT_LIMIT}
          showCount
          name="text"
        />
      </div>
      <AddressBook
        open={book}
        dir={dir}
        onClose={() => setBook(false)}
        onPick={(addr, field) => {
          const cur = field === 'to' ? draft.to : draft.cc;
          const list = splitRecipients(cur);
          if (!list.some((x) => x.toLowerCase() === addr.toLowerCase())) list.push(addr);
          set(field === 'to' ? { to: list.join('; ') } : { cc: list.join('; ') });
        }}
        onRefuse={onRefuse}
      />
    </div>
  );
}

/* ------------------------------------------------------------ address book */

interface BookProps {
  open: boolean;
  dir: DirEntry[];
  onClose: () => void;
  onPick: (address: string, field: 'to' | 'cc') => void;
  onRefuse: (r: Refusal) => void;
  /** Label for the To button when not composing ("New Message"). */
  toLabel?: string;
}

function Cell({ v }: { v: string | undefined }) {
  if (!v) return null;
  const rx = rxInfo(v);
  if (rx) return <Redaction len={rx.len} auth="Classification Control" reference={rx.key === 'T1' ? 'Tier 1 directory' : `Directory ${rx.key}`} />;
  return <>{v}</>;
}

export function AddressBook({ open, dir, onClose, onPick, onRefuse, toLabel = 'To ->' }: BookProps) {
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return dir
      .map((d, i) => ({ ...d, key: `${i}` }))
      .sort((a, b) => Number(isRx(a.name)) - Number(isRx(b.name)) || (isRx(a.name) ? 0 : a.name.localeCompare(b.name)))
      .filter((d) => !t || (!isRx(d.name) && d.name.toLowerCase().includes(t)) || (!isRx(d.address) && d.address.toLowerCase().includes(t)) || (d.role ?? '').toLowerCase().includes(t));
  }, [dir, q]);
  const cols: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name', width: 140, render: (r) => <Cell v={r.name} />, sortValue: (r) => (isRx(r.name) ? '~' : r.name) },
    { key: 'role', header: 'Post', render: (r) => r.role ?? '', wrap: true },
    { key: 'site', header: 'Site', render: (r) => r.site ?? '', width: 84 },
    { key: 'address', header: 'Address', width: 190, mono: true, render: (r) => <Cell v={r.address} />, sortValue: (r) => (isRx(r.address) ? '~' : r.address) },
  ];
  const pick = (field: 'to' | 'cc') => {
    const r = rows.find((x) => x.key === sel[0]);
    if (!r) return;
    if (isRx(r.address)) {
      const info = rxInfo(r.address)!;
      onRefuse({
        title: 'Directory entry withheld',
        text: `This mailbox is listed for Tier ${info.key === 'T1' ? '1' : '2'} holders only. Traffic for the post is routed through the office's registry.`,
        reference: 'DIR-0412',
      });
      return;
    }
    onPick(r.address, field);
  };
  return (
    <Dialog
      open={open}
      title="Address Book: MERIDIAN Directory"
      kind="info"
      icon={<Icon id="user" size={32} />}
      buttons={[
        { label: toLabel, value: 'to', isDefault: true },
        { label: '&Cc ->', value: 'cc' },
        { label: 'Close', value: 'close', isCancel: true },
      ]}
      onClose={(v) => {
        if (v === 'to' || v === 'cc') {
          pick(v);
          onClose();
          return;
        }
        onClose();
      }}
    >
      <div class="mt-book">
        <TextField label="Find" value={q} onInput={setQ} name="book-find" />
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(r) => r.key}
          label="Directory entries"
          selection="single"
          selected={sel}
          onSelectionChange={setSel}
          onActivate={(r) => {
            setSel([r.key]);
            if (!isRx(r.address)) {
              onPick(r.address, 'to');
              onClose();
            } else pick('to');
          }}
          dense
          maxHeight="260px"
        />
      </div>
    </Dialog>
  );
}
