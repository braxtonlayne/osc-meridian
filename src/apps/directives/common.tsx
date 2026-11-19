import { h, type ComponentChildren, type ComponentType } from 'preact';
import { useState } from 'preact/hooks';
import canon from '@canon';
import type { Marking, MarkingId } from '@core/canon-types';
import { MarkingStrip } from '@graphics/banners';
import { RefusalState } from '@graphics/states';
import type { Services } from '@core/contracts';
import { MessageBox, formatOscDate, type DialogKind } from '@design/index';
import { issuesOf, lineage, shortNo, statusOf, type Graph } from './model';

/* ------------------------------------------------------------ canon */

const DIVISIONS = new Map(canon.divisions.map((d) => [d.id, d.name]));

/** "PV" -> "Personnel & Vetting"; unknown codes (command offices) come back as given. */
export function oprName(code: string): string {
  return DIVISIONS.get(code) ?? code;
}

export const NUMBERING = canon.docNumbering.find((n) => n.family === 'Directive');
export const RELEASE = `${canon.meta.environment} release ${canon.meta.release}`;
/** Two-digit in-world year for receipts. */
export const YY = canon.meta.inWorldDate.slice(2, 4);

const RANK = new Map(canon.markings.map((m) => [m.id, m.rank]));
export function highestMarking(ids: MarkingId[], fallback: MarkingId): MarkingId {
  let best = fallback;
  let rank = -1;
  for (const id of ids) {
    const r = RANK.get(id) ?? 0;
    if (r > rank) {
      rank = r;
      best = id;
    }
  }
  return best;
}
export const markings = canon.markings as readonly Marking[];

/** DocumentView slot: the banners MarkingStrip takes the canon marking record, the slot passes its id. */
export function Strip({ marking }: { marking: MarkingId }) {
  const m = markings.find((x) => x.id === marking);
  return m ? <MarkingStrip marking={m} /> : null;
}

/**
 * RefusalState's reference prop is `ref` in the graphics contract (proposed rename: `reference`).
 * Both names are passed so the panel reads correctly either way.
 */
export function Refusal(p: { authority: string; reference: string; reason: string; requirement?: string; docNo?: string }) {
  return h(RefusalState as unknown as ComponentType<Record<string, unknown>>, { ...p, ref: p.reference });
}

/* ------------------------------------------------------------ notices */

export interface Notice {
  title: string;
  kind?: DialogKind;
  reference?: string;
  body: ComponentChildren;
}

/** In-window message box state. */
export function useNotice(services: Services) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = (n: Notice) => setNotice(n);
  const node = notice ? (
    <MessageBox
      open
      title={notice.title}
      kind={notice.kind ?? 'info'}
      reference={notice.reference}
      onOpen={(k) => {
        if (k === 'error' || k === 'warning') services.sound.play('error');
      }}
      onClose={() => setNotice(null)}
    >
      {notice.body}
    </MessageBox>
  ) : null;
  return { show, node };
}

/** In-world refusal to open a record, recorded as a refused window.open. */
export function refuseOpen(services: Services, show: (n: Notice) => void, docNo: string, reason: string, reference: string): void {
  services.audit.log('window.open', docNo, `Operator ${services.session.operatorId.peek()} requested ${docNo} from the Directives library. Request refused: ${reason}`);
  show({ title: 'Directives', kind: 'warning', reference, body: <p class="dv-p">{reason}</p> });
}

export function aboutNotice(): Notice {
  return {
    title: 'About Directives',
    kind: 'info',
    reference: RELEASE,
    body: (
      <>
        <p>Directives library: the numbered policy issuances of the {canon.meta.agency}, held as controlled electronic copies.</p>
        <p>
          The library lists each directive with its office of primary responsibility, effective date and status, records supersession from each
          directive's supersession line, and records acknowledgements of reading against the operator's personnel number.
        </p>
        <p class="dv-dim">{RELEASE}.</p>
      </>
    ),
  };
}

export function numberingNotice(): Notice {
  return {
    title: 'Directive numbering',
    kind: 'info',
    reference: NUMBERING?.example,
    body: (
      <>
        <p>
          Pattern <span class="dv-mono">{NUMBERING?.pattern}</span>, for example <span class="dv-mono">{NUMBERING?.example}</span>.
        </p>
        <p>{NUMBERING?.notes}</p>
        <p class="dv-dim">Paragraphs are cited by section and paragraph number, for example "para 6" or "para 4.2".</p>
      </>
    ),
  };
}

/* ------------------------------------------------------------ chain */

export interface ChainProps {
  /** Lineage, newest first. */
  docNos: string[];
  graph: Graph;
  /** Highlight this issue. */
  self?: string;
  onOpen: (docNo: string) => void;
}

/**
 * One supersession lineage, newest at the top: each directive number with its own
 * revisions, then the directive numbers it replaced.
 */
export function Chain({ docNos, graph, self, onOpen }: ChainProps) {
  return (
    <ol class="dv-chain" aria-label={`Supersession lineage of ${shortNo(docNos[0] ?? '')}`}>
      {docNos.map((no, i) => {
        const n = graph.get(no);
        const row = n?.row;
        const st = statusOf(no, graph);
        const title = row?.title ?? n?.ref?.title;
        const next = docNos[i + 1];
        const issues = row ? issuesOf(row) : [];
        const firstIssue = issues[issues.length - 1];
        return (
          <li key={no} class={`dv-chain__item${no === self ? ' is-self' : ''}`} aria-current={no === self ? 'true' : undefined}>
            <div class={`dv-chain__card${n?.held ? '' : ' is-unheld'}`}>
              <span class="dv-chain__no">
                {n?.held && no !== self ? (
                  <button type="button" class="dv-link" onClick={() => onOpen(no)}>
                    {shortNo(no)}
                  </button>
                ) : (
                  shortNo(no)
                )}
              </span>
              <span>{title ?? <span class="dv-dim">Title not given in the supersession line</span>}</span>
              <span class="dv-chain__status">{st}</span>
              <span class="dv-chain__meta">
                {row ? `OPR ${row.oprDetail}` : 'Not held in the electronic library'}
                {n?.ref?.effective ? ` · Effective ${formatOscDate(n.ref.effective)}` : ''}
              </span>
              {issues.length ? (
                <table class="dv-issues">
                  <caption class="sr-only">Issues of {shortNo(no)}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Rev</th>
                      <th scope="col">Date</th>
                      <th scope="col">Standing</th>
                      <th scope="col">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((x) => (
                      <tr key={x.rev} class={x.current ? 'is-current' : undefined}>
                        <td class="dv-mono">{x.rev}</td>
                        <td class="dv-mono">{x.date ? formatOscDate(x.date) : 'Not recorded'}</td>
                        <td>{x.current ? (st === 'CURRENT' ? 'Current' : st.charAt(0) + st.slice(1).toLowerCase()) : 'Superseded by revision'}</td>
                        <td>{x.change ?? (x.current ? '' : 'Not given in the supersession line')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
            {next ? (
              <div class="dv-chain__join">
                {shortNo(no)}
                {firstIssue && firstIssue.rev <= 1 && firstIssue.date ? ` (first issue ${formatOscDate(firstIssue.date)})` : ''} replaces {shortNo(next)}
                {/cancel/i.test(graph.get(next)?.ref?.note ?? '') ? `, which is cancelled` : ''}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export { lineage };
