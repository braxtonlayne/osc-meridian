import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { AppProps, DocJson, RouteEntry, Services } from '@core/contracts';
import { currentPath, toUrl } from '@core/router';
import {
  Button,
  Checkbox,
  DocumentView,
  FieldMessage,
  GroupBox,
  MenuBar,
  ProgressBar,
  PropertyGrid,
  Splitter,
  StatusBar,
  Tabs,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  formatOscDate,
  type MenuBarMenu,
} from '@design/index';
import { Stamp } from '@graphics/banners';
import { Icon } from '@graphics/icons';
import { ErrorState, StateButton } from '@graphics/states';
import { Chain, Refusal, Strip, YY, aboutNotice, markings, numberingNotice, oprName, refuseOpen, useNotice } from './common';
import { ensureLibrary, graph, library, pendingAnchor, rememberDoc } from './library';
import {
  ackDetail,
  ackReceipt,
  ackStateFor,
  flattenForView,
  lineage,
  numberBlocks,
  paraHash,
  paraKey,
  parseAcks,
  parsePara,
  rowFromEntry,
  shortNo,
  statusOf,
  zuluLocal,
  type ParaRef,
} from './model';

type Tab = 'text' | 'chain';
interface Section {
  key: string;
  text: string;
}

function accessKey(r: RouteEntry): string | null {
  if (!r.access) return null;
  return r.access.compartment ? `${r.access.compartment}+T${r.access.tier}` : `T${r.access.tier}`;
}

export function Reader({ win, route, services }: AppProps & { route: RouteEntry; services: Services }) {
  const key = accessKey(route);
  const allowed = !key || services.clearance.satisfies(key);

  useEffect(() => {
    win.setTitle(route.title, route.docNo);
    win.setMarking(route.marking);
  }, [win, route]);

  useEffect(() => {
    if (allowed) return;
    win.setStatus('Access refused');
    services.audit.log(
      'window.open',
      route.docNo,
      `Operator ${services.session.operatorId.peek()} requested ${route.docNo} in the Directives library. Request refused: Tier ${route.access!.tier} access determination required.`,
    );
  }, [allowed, route.docNo]);

  if (!allowed) {
    const comp = route.access?.compartment;
    return (
      <div class="dv">
        <Refusal
          authority="Classification Control, Office of Internal Assurance"
          reference="DIR-0412"
          reason={`Requires Tier ${route.access!.tier} access determination${comp ? ` and ${comp} compartment briefing` : ''}. Display of ${route.docNo} to this operator is not authorised.`}
          requirement={comp ? `${comp} compartment briefing` : `Tier ${route.access!.tier} access determination`}
          docNo={route.docNo}
        />
      </div>
    );
  }
  return <ReaderBody win={win} route={route} services={services} />;
}

function ReaderBody({ win, route, services }: AppProps & { route: RouteEntry; services: Services }) {
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('text');
  const [sections, setSections] = useState<Section[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [pane, setPane] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [goto, setGoto] = useState('');
  const [gotoErr, setGotoErr] = useState<string | null>(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackErr, setAckErr] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ackRef = useRef<HTMLDivElement>(null);
  const gotoRef = useRef<HTMLInputElement>(null);
  const readLogged = useRef<string | null>(null);
  const anchorDone = useRef<string | null>(null);
  const { show, node: noticeNode } = useNotice(services);

  const clearanceSig = `${services.session.compartments.value.join(',')}|${services.session.actingTier2.value}`;

  useEffect(() => ensureLibrary(services), [services]);

  // Load (and reload when clearance changes, so newly released text appears).
  useEffect(() => {
    let live = true;
    setErr(null);
    win.setBusy(true);
    win.setStatus(`Retrieving ${route.docNo}`);
    services.docs
      .load(route.id)
      .then((d) => {
        if (!live) return;
        setDoc(d);
        rememberDoc(d);
        if (readLogged.current !== d.id) {
          readLogged.current = d.id;
          services.audit.log('doc.read', d.docNo);
        }
        win.setStatus(`${d.docNo} revision ${d.revision}`);
      })
      .catch(() => {
        if (!live) return;
        setErr(route.docNo);
        win.setStatus(`${route.docNo} not retrieved`);
        services.sound.play('error');
      })
      .finally(() => live && win.setBusy(false));
    return () => {
      live = false;
    };
  }, [route.id, clearanceSig]);

  // Reset per-document UI state.
  useEffect(() => {
    setTab('text');
    setSections([]);
    setCurrent(null);
    setTarget(null);
    setAckChecked(false);
    setAckErr(null);
    setGoto('');
    setGotoErr(null);
    anchorDone.current = null;
    scrollRef.current?.scrollTo(0, 0);
  }, [route.id]);

  // Narrow layout (handheld or a small window).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const view = useMemo(() => (doc ? flattenForView(doc) : null), [doc]);
  const row = useMemo(() => rowFromEntry(route, doc ?? undefined), [route, doc]);
  const g = graph.value;
  const status = statusOf(route.docNo, g);
  const successor = g.get(route.docNo)?.supersededBy[0];
  const chain = useMemo(() => lineage(route.docNo, g), [g, route.docNo]);
  const acks = parseAcks(services.audit.entries.value);
  const ack = ackStateFor(route.docNo, route.revision, acks);
  const ordered = library.entries.value;
  const pos = ordered.findIndex((e) => e.id === route.id);
  const prev = pos > 0 ? ordered[pos - 1] : undefined;
  const next = pos >= 0 && pos < ordered.length - 1 ? ordered[pos + 1] : undefined;

  /* ---------------------------------------------- paragraphs */

  const bodyEl = () => scrollRef.current?.querySelector<HTMLElement>('.doc-body') ?? null;

  // Number the body after every render that produced a fresh body element (load, tab switch,
  // layout change between pane and narrow): cheap when already numbered.
  useLayoutEffect(() => {
    if (!doc || tab !== 'text') return;
    const body = bodyEl();
    const mark = `${doc.id}:${doc.html.length}`;
    if (!body || body.dataset.numbered === mark) return;
    body.dataset.numbered = mark;
    const kids = Array.from(body.children) as HTMLElement[];
    const keys = numberBlocks(kids.map((k) => k.tagName));
    const secs: Section[] = [];
    kids.forEach((el, i) => {
      const k = keys[i];
      if (!k) {
        el.removeAttribute('data-para');
        return;
      }
      el.dataset.para = k;
      if (el.tagName === 'H2') secs.push({ key: k, text: (el.textContent ?? '').trim() });
    });
    const sig = secs.map((x) => `${x.key}:${x.text}`).join('|');
    setSections((old) => (old.map((x) => `${x.key}:${x.text}`).join('|') === sig ? old : secs));
    if (target) body.querySelector(`[data-para="${target}"]`)?.classList.add('dv-target');
  });

  const findPara = (p: ParaRef): HTMLElement | null => {
    const body = bodyEl();
    if (!body) return null;
    const head = body.querySelector<HTMLElement>(`[data-para="${p.sec}"]`);
    if (p.letter && p.sub && head) {
      // Lettered subparagraphs are list items in the first list of the section.
      for (let el = head.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
        if (el.tagName === 'OL' || el.tagName === 'UL') {
          const li = el.children[p.sub - 1] as HTMLElement | undefined;
          if (li) {
            li.dataset.para = paraKey(p);
            return li;
          }
          break;
        }
      }
      return head;
    }
    return body.querySelector<HTMLElement>(`[data-para="${paraKey(p)}"]`) ?? (p.sub ? head : null);
  };

  const setHash = (hash: string) => {
    if (currentPath() !== route.route) return;
    try {
      history.replaceState(history.state, '', toUrl(route.route) + hash);
    } catch {
      /* the address bar is informational only */
    }
  };

  const goToPara = (p: ParaRef, opts: { url?: boolean; focus?: boolean } = {}): boolean => {
    const el = findPara(p);
    if (!el) return false;
    setTab('text');
    el.scrollIntoView({ block: 'start' });
    const k = el.dataset.para ?? paraKey(p);
    scrollRef.current?.querySelectorAll('.dv-target').forEach((x) => x.classList.remove('dv-target'));
    el.classList.add('dv-target');
    setTarget(k);
    setCurrent(k.split('.')[0]!);
    if (opts.url !== false) setHash(paraHash(p));
    if (opts.focus) {
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
    }
    return true;
  };

  const goToAck = () => {
    setTab('text');
    setTimeout(() => {
      ackRef.current?.scrollIntoView({ block: 'start' });
      ackRef.current?.querySelector<HTMLInputElement>('input[type="checkbox"], button')?.focus({ preventScroll: true });
    }, 0);
  };

  // Initial anchor: from the library (pendingAnchor) or the address bar (#para-6).
  useEffect(() => {
    if (!doc || !sections.length || anchorDone.current === doc.id) return;
    anchorDone.current = doc.id;
    const pend = pendingAnchor.peek();
    if (pend && pend.route === route.route) {
      pendingAnchor.value = null;
      if (pend.anchor === 'ack') goToAck();
      else {
        const p = parsePara(pend.anchor);
        if (p) goToPara(p);
      }
      return;
    }
    if (currentPath() === route.route && location.hash) {
      const p = parsePara(location.hash);
      if (p && !goToPara(p, { url: false })) setGotoErr(`The address names paragraph ${paraKey(p)}, which ${route.docNo} does not have.`);
    }
  }, [doc, sections]);

  useEffect(() => {
    const onHash = () => {
      if (currentPath() !== route.route) return;
      const p = parsePara(location.hash);
      if (p) goToPara(p, { url: false });
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [route.route]);

  // Track the section at the top of the view.
  const onScroll = () => {
    const sc = scrollRef.current;
    const body = bodyEl();
    if (!sc || !body) return;
    const top = sc.getBoundingClientRect().top + 24;
    let cur: string | null = null;
    body.querySelectorAll<HTMLElement>(':scope > h2[data-para]').forEach((h) => {
      if (h.getBoundingClientRect().top <= top) cur = h.dataset.para ?? cur;
    });
    if (cur !== current) setCurrent(cur);
  };

  const submitGoto = () => {
    const p = parsePara(goto);
    if (!p) {
      setGotoErr('Enter a paragraph as a number, for example 6 or 4.2.');
      return;
    }
    if (!goToPara(p, { focus: true })) {
      setGotoErr(`${route.docNo} has no paragraph ${paraKey(p)}. Sections 1 to ${sections.length}.`);
      return;
    }
    setGotoErr(null);
  };

  const focusGoto = () => {
    setTab('text');
    setTimeout(() => {
      gotoRef.current?.focus();
      gotoRef.current?.select();
    }, 0);
  };

  /* ---------------------------------------------- actions */

  const paraLink = (): string => {
    const k = target ?? current;
    return `${location.origin}${toUrl(route.route)}${k ? `#para-${k}` : ''}`;
  };

  const copy = (text: string, what: string) => {
    const fallback = () =>
      show({
        title: 'Copy',
        kind: 'info',
        body: (
          <>
            <p>The clipboard is not available to this session. Select the {what} below and copy it with Ctrl+C.</p>
            <input class="dv-input dv-input--mono dv-copyfield" readOnly value={text} onFocus={(e) => e.currentTarget.select()} aria-label={what} />
          </>
        ),
      });
    if (!navigator.clipboard) return fallback();
    navigator.clipboard.writeText(text).then(() => services.notify(`Copied ${what}: ${text}`, { from: 'Directives' }), fallback);
  };

  const copyParaLink = () => {
    if (!sections.length) {
      show({ title: 'Copy link', kind: 'info', body: <p>{route.docNo} has no numbered paragraphs. The link will open the directive at its start.</p> });
    }
    copy(paraLink(), 'paragraph link');
  };

  const print = () => services.print(route.id);

  const goPrev = () => {
    if (prev) win.navigate(prev.route);
    else show({ title: 'Previous directive', kind: 'info', body: <p>{route.docNo} is the lowest-numbered directive held.</p> });
  };
  const goNext = () => {
    if (next) win.navigate(next.route);
    else show({ title: 'Next directive', kind: 'info', body: <p>{route.docNo} is the highest-numbered directive held.</p> });
  };

  const goSuperseded = () => {
    const p = row.supersedes[0];
    if (!p) {
      show({ title: 'Superseded issue', kind: 'info', body: <p>{route.docNo} is an original issue. It supersedes no earlier directive.</p> });
      return;
    }
    const held = services.docs.byDocNo(p.docNo);
    if (held) win.navigate(held.route);
    else refuseOpen(services, show, p.docNo, `${p.docNo} is superseded by ${route.docNo} and is not held in the electronic library. Cite the current issue.`, route.docNo);
  };
  const goCurrent = () => {
    if (!successor) {
      show({ title: 'Current issue', kind: 'info', body: <p>{route.docNo} is the current issue. No later directive supersedes it.</p> });
      return;
    }
    const held = services.docs.byDocNo(successor);
    if (held) win.navigate(held.route);
    else refuseOpen(services, show, successor, `${successor} is not held in the electronic library.`, route.docNo);
  };

  const recordAck = () => {
    if (ack.kind === 'current') {
      show({
        title: 'Acknowledge reading',
        kind: 'info',
        reference: ack.rec.receipt,
        body: (
          <p>
            Acknowledgement of {route.docNo} revision {route.revision} is already recorded ({formatOscDate(ack.rec.at)} {zuluLocal(ack.rec.at)}). A further
            acknowledgement is taken only when the directive is revised.
          </p>
        ),
      });
      return;
    }
    if (!ackChecked) {
      setAckErr('Block 1. Confirm that you have read the directive before the acknowledgement is recorded.');
      goToAck();
      return;
    }
    const receipt = ackReceipt(route.docNo, route.revision, YY, acks.length + 1);
    services.audit.log('form.submit', route.docNo, ackDetail(services.session.operatorId.peek(), route.docNo, route.revision, receipt, route.title));
    setAckErr(null);
    setAckChecked(false);
    services.notify(`Acknowledgement of ${shortNo(route.docNo)} recorded. Receipt ${receipt}.`, { from: 'Directives' });
  };

  /* ---------------------------------------------- keyboard */

  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && !e.altKey && k === 'p') {
      e.preventDefault();
      print();
    } else if (e.ctrlKey && !e.altKey && k === 'g') {
      e.preventDefault();
      focusGoto();
    } else if (e.altKey && !e.ctrlKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.altKey && !e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    } else if (e.altKey && !e.ctrlKey && e.key === 'Home') {
      e.preventDefault();
      win.navigate('/directives');
    }
  };

  /* ---------------------------------------------- menus */

  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: 'Directives &library', shortcut: 'Alt+Home', onSelect: () => win.navigate('/directives') },
        { separator: true },
        { label: '&Print...', shortcut: 'Ctrl+P', onSelect: print, disabled: !doc },
        { separator: true },
        { label: '&Close', onSelect: () => win.close() },
      ],
    },
    {
      label: '&Edit',
      items: [
        { label: 'Copy document &number', onSelect: () => copy(route.docNo, 'document number') },
        { label: 'Copy &link to paragraph', onSelect: copyParaLink, disabled: !doc },
        { separator: true },
        { label: '&Go to paragraph...', shortcut: 'Ctrl+G', onSelect: focusGoto, disabled: !doc },
      ],
    },
    {
      label: '&View',
      items: [
        { label: '&Text', radio: true, checked: tab === 'text', onSelect: () => setTab('text') },
        { label: '&Supersession', radio: true, checked: tab === 'chain', onSelect: () => setTab('chain') },
        { separator: true },
        { label: 'Paragraph &pane', checked: pane && !narrow, onSelect: () => (narrow ? show({ title: 'Paragraph pane', kind: 'info', body: <p>The window is too narrow for the paragraph pane. Use the paragraph list above the text.</p> }) : setPane(!pane)) },
        { separator: true },
        { label: 'P&revious directive', shortcut: 'Alt+Left', onSelect: goPrev },
        { label: '&Next directive', shortcut: 'Alt+Right', onSelect: goNext },
      ],
    },
    {
      label: '&Directive',
      items: [
        { label: '&Acknowledge reading...', onSelect: goToAck, disabled: !doc },
        { separator: true },
        { label: 'Open &superseded issue', onSelect: goSuperseded },
        { label: 'Open &current issue', onSelect: goCurrent },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: 'Directive &numbering', onSelect: () => show(numberingNotice()) },
        { label: '&About Directives', onSelect: () => show(aboutNotice()) },
      ],
    },
  ];

  /* ---------------------------------------------- render */

  const ackLine =
    ack.kind === 'current'
      ? `Acknowledged ${formatOscDate(ack.rec.at)}`
      : ack.kind === 'earlier'
        ? `Rev ${ack.rec.revision} acknowledged; rev ${route.revision} outstanding`
        : 'Not acknowledged';

  const paraList = (
    <nav class="dv-paras" aria-label="Paragraphs">
      <h2 class="dv-paras__h">Paragraphs</h2>
      {!sections.length ? <p class="dv-paras__none">{doc ? 'This directive has no numbered paragraphs.' : 'Retrieving the paragraph index.'}</p> : null}
      <ul class="dv-paras__list">
        {sections.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              class="dv-paras__btn"
              aria-current={current === s.key ? 'true' : undefined}
              onClick={() => goToPara({ sec: Number(s.key) }, { focus: true })}
            >
              <span class="dv-paras__n">{s.key}.</span>
              <span>{s.text}</span>
            </button>
          </li>
        ))}
      </ul>
      <hr class="dv-paras__sep" />
      <ul class="dv-paras__list">
        <li>
          <button type="button" class="dv-paras__btn" onClick={goToAck}>
            <span class="dv-paras__n" />
            <span>Acknowledgement</span>
          </button>
        </li>
      </ul>
    </nav>
  );

  const ackBlock = (
    <div class="dv-ack" ref={ackRef}>
      <GroupBox title="Acknowledgement of reading" on="paper">
        {ack.kind === 'current' ? (
          <p>
            Revision {route.revision} acknowledged {formatOscDate(ack.rec.at)} at {zuluLocal(ack.rec.at)}. Receipt{' '}
            <span class="dv-ack__receipt">{ack.rec.receipt}</span>.
          </p>
        ) : (
          <>
            {ack.kind === 'earlier' ? (
              <p>
                Revision {ack.rec.revision} was acknowledged {formatOscDate(ack.rec.at)} (receipt <span class="dv-ack__receipt">{ack.rec.receipt}</span>).
                Revision {route.revision} requires a new acknowledgement.
              </p>
            ) : (
              <p>
                Record that you have read this directive. The acknowledgement is entered in the workstation audit trail against operator{' '}
                <span class="dv-mono">{services.session.operatorId.value}</span> and is reported to the office of primary responsibility,{' '}
                {row.oprFull}.
              </p>
            )}
            <Checkbox
              label={`1. I have read ${route.docNo}, revision ${route.revision}, and understand the requirements that apply to me.`}
              checked={ackChecked}
              onChange={(c) => {
                setAckChecked(c);
                if (c) setAckErr(null);
              }}
              error={ackErr}
            />
          </>
        )}
        <div class="dv-ack__actions">
          <Button label={ack.kind === 'current' ? 'Acknowledgement &recorded' : '&Record acknowledgement'} variant={ack.kind === 'current' ? 'default' : 'primary'} onClick={recordAck} />
          <span class="dv-dim">{status === 'SUPERSEDED' ? `This issue is superseded${successor ? ` by ${shortNo(successor)}` : ''}.` : ''}</span>
        </div>
      </GroupBox>
    </div>
  );

  const narrowPicker = sections.length ? (
    <div class="dv-filter">
      <span class="dv-inline">
        <label for="dv-para-pick">Paragraph</label>
        <select
          id="dv-para-pick"
          class="dv-input"
          value={current ?? ''}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v === 'ack') goToAck();
            else if (v) goToPara({ sec: Number(v) });
          }}
        >
          <option value="">Start of text</option>
          {sections.map((s) => (
            <option key={s.key} value={s.key}>
              {s.key}. {s.text}
            </option>
          ))}
          <option value="ack">Acknowledgement</option>
        </select>
      </span>
    </div>
  ) : null;

  const docPane = (
    <div class="dv-doc" ref={scrollRef} onScroll={onScroll} tabIndex={0} aria-label={`${route.docNo} text`}>
      <div class="dv-doc-inner">
        {view ? (
          <>
            <DocumentView
              doc={view}
              markings={markings}
              onNavigate={(r) => (services.docs.byRoute(r)?.app === 'directives' ? win.navigate(r) : services.openRoute(r))}
              onRedactionHover={(i) =>
                services.audit.log(
                  'redaction.hover',
                  view.docNo,
                  `Operator ${services.session.operatorId.peek()} examined withheld material in ${view.docNo} (${i.auth} ${i.ref}). No release was made.`,
                )
              }
              slots={{ MarkingStrip: Strip, Stamp }}
            />
            {ackBlock}
          </>
        ) : err ? (
          <ErrorState
            code="MWSDOC-0x0412"
            title={`${err} could not be retrieved`}
            body="The controlled copy did not reach this workstation. The request has been logged. Retry, or open another directive from the library."
            actions={
              <StateButton
                onClick={() => {
                  setErr(null);
                  services.docs.load(route.id).then(
                    (d) => {
                      setDoc(d);
                      rememberDoc(d);
                      if (readLogged.current !== d.id) {
                        readLogged.current = d.id;
                        services.audit.log('doc.read', d.docNo);
                      }
                    },
                    () => setErr(route.docNo),
                  );
                }}
              >
                Retry
              </StateButton>
            }
          />
        ) : (
          <div class="dv-loading">
            <ProgressBar label={`Retrieving ${route.docNo} from MERIDIAN Records`} />
          </div>
        )}
      </div>
    </div>
  );

  const chainView = (
    <div class="dv-fill">
      <div class="dv-chains">
        <PropertyGrid
          caption="SUPERSESSION"
          columns={2}
          rows={[
            { label: 'Directive', value: route.docNo, mono: true },
            { label: 'Status', value: status },
            { label: 'Supersedes', value: row.supersedes.length ? row.supersedes.map((p) => p.docNo).join(', ') : 'None (original issue)', mono: true },
            { label: 'Superseded by', value: successor ?? 'None', mono: true },
            { label: 'Effective', value: formatOscDate(row.effective), mono: true },
            { label: 'OPR', value: oprName(row.opr) === row.opr ? row.oprFull : `${row.oprFull} (${oprName(row.opr)})` },
          ]}
        />
        {library.loadedCount.value < library.entries.value.length ? (
          <ProgressBar label="Reading supersession lines of the directives held" value={library.loadedCount.value} max={library.entries.value.length} showValue="count" />
        ) : null}
        {chain.length > 1 ? (
          <Chain docNos={chain} graph={g} self={route.docNo} onOpen={(no) => {
            const r = services.docs.byDocNo(no);
            if (r && r.id !== route.id) win.navigate(r.route);
          }} />
        ) : (
          <p class="dv-chains__intro">
            No supersession is recorded for {route.docNo}: it replaces no earlier directive, and no directive held replaces it.
          </p>
        )}
      </div>
    </div>
  );

  const showPane = pane && !narrow;

  return (
    <div class="dv" ref={rootRef} tabIndex={-1} onKeyDown={onKey as unknown as (e: Event) => void}>
      <MenuBar menus={menus} label="Directive menu" />
      <Toolbar label="Directive toolbar">
        <ToolbarButton label="Library" icon={<Icon id="home" size={16} />} onClick={() => win.navigate('/directives')} title="Directives library (Alt+Home)" />
        <ToolbarButton label="Previous" onClick={goPrev} title={prev ? `Previous: ${shortNo(prev.docNo)} (Alt+Left)` : 'Lowest-numbered directive'} />
        <ToolbarButton label="Next" onClick={goNext} title={next ? `Next: ${shortNo(next.docNo)} (Alt+Right)` : 'Highest-numbered directive'} />
        <ToolbarSeparator />
        <ToolbarButton label="Print" icon={<Icon id="print" size={16} />} onClick={print} disabled={!doc} title="Print with cover sheet (Ctrl+P)" />
        <ToolbarButton label="Acknowledge" icon={<Icon id="check" size={16} />} onClick={goToAck} disabled={!doc} />
        <ToolbarSeparator />
        <span class="dv-inline">
          <label for="dv-goto">Para</label>
          <input
            id="dv-goto"
            ref={gotoRef}
            class="dv-input dv-input--mono dv-input--num"
            value={goto}
            inputMode="decimal"
            aria-describedby={gotoErr ? 'dv-goto-err' : undefined}
            onInput={(e) => setGoto(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitGoto();
              }
            }}
          />
        </span>
        <ToolbarButton label="Go" onClick={submitGoto} disabled={!doc} title="Go to paragraph (Ctrl+G)" />
      </Toolbar>
      {gotoErr ? (
        <div class="dv-filter" id="dv-goto-err">
          <FieldMessage>{gotoErr}</FieldMessage>
        </div>
      ) : null}
      {status === 'SUPERSEDED' ? (
        <div class="dv-filter" role="note">
          <strong>SUPERSEDED.</strong>
          <span>
            {route.docNo} is superseded{successor ? ` by ${successor}` : ''}. It is retained for reference; cite the current issue.
          </span>
          {successor ? <Button size="small" label="Open &current issue" onClick={goCurrent} /> : null}
        </div>
      ) : null}
      <div class="dv-main">
        <Tabs
          label="Directive views"
          panel="flush"
          active={tab}
          onChange={(id) => setTab(id as Tab)}
          tabs={[
            { id: 'text', label: 'Text' },
            { id: 'chain', label: 'Supersession' },
          ]}
        >
          {tab === 'text' ? (
            <>
              {!showPane ? narrowPicker : null}
              <div class="dv-reader">
                {showPane ? (
                  <Splitter initial={210} min={140} max={420} label="Paragraph pane width">
                    {paraList}
                    {docPane}
                  </Splitter>
                ) : (
                  docPane
                )}
              </div>
            </>
          ) : (
            chainView
          )}
        </Tabs>
      </div>
      <StatusBar
        live
        panes={[
          { id: 'doc', fill: true, mono: true, content: `${route.docNo} · Rev ${route.revision} · Effective ${formatOscDate(row.effective)}` },
          { id: 'para', width: '22ch', content: sections.length ? (current ? `Para ${current} of ${sections.length}` : `Top of text, ${sections.length} paras`) : doc ? 'No paragraphs' : 'Retrieving' },
          { id: 'status', width: '12ch', content: status },
          { id: 'ack', width: '30ch', content: ackLine },
        ]}
      />
      {noticeNode}
    </div>
  );
}
