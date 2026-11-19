/**
 * Run dialog (Alt+R / Win+R / Directory > Run) and global search (Ctrl+K).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { interpretRun, pushRunHistory, runHistory, searchAll, services } from '@core/services';
import type { RunResult } from '@core/services';
import * as session from '@core/session';
import { isRx } from '@core/rx';
import { canonNow, markingById } from './adapters';
import type { SearchHit } from './adapters';
import { activeWin, cascade, tile, minimizeAll } from './wm';
import { focusInto, focusTaskbar } from './focus';
import { runOpen, searchOpen, doLock, doLogoff } from './state';
import { APPS } from '@apps/index';

function useModalKeys(onClose: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, []);
}


/**
 * Remember what had focus when a shell dialog opened and give it back on close (Esc, Enter,
 * Cancel). If that element has gone (the dialog opened a window, or closed the one it came
 * from), focus goes to the active window, else to the taskbar.
 */
function useReturnFocus(): void {
  const trigger = useRef<Element | null>(typeof document !== 'undefined' ? document.activeElement : null);
  useEffect(
    () => () => {
      const t = trigger.current;
      const w = activeWin.peek();
      requestAnimationFrame(() => {
        if (document.activeElement && document.activeElement !== document.body && !document.activeElement.closest('.dialog')) return;
        if (w && document.querySelector(`[data-win-id="${w.id}"]`)) {
          if (t instanceof HTMLElement && t.isConnected && t.closest(`[data-win-id="${w.id}"]`)) t.focus();
          else focusInto(w.id);
        } else if (t instanceof HTMLElement && t.isConnected && t !== document.body) t.focus();
        else focusTaskbar();
      });
    },
    [],
  );
}

/* ------------------------------------------------------------------ run */

const HELP =
  'Enter a route (/directives), a document number (OSC-DIR-0412), an application (registry, transit, personnel, records, mail, ledger, reserves, assurance, directives, forms, terminal, system) or a command: open <docno>, search <terms>, whoami, date, cascade, tile, minimize, lock, logoff, sound on|off, help.';

export function RunDialog() {
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const close = () => {
    runOpen.value = false;
  };
  useReturnFocus();
  useModalKeys(close);
  useEffect(() => ref.current?.focus(), []);

  const commands: Record<string, (arg: string) => RunResult> = {
    help: () => ({ ok: true, message: HELP }),
    '?': () => ({ ok: true, message: HELP }),
    whoami: () => ({
      ok: true,
      message: `${session.operatorId.peek()}  Tier ${session.tier.peek()}${session.actingTier2.peek() ? ' (acting)' : ''}  ${session.site.peek()}  compartments: ${session.compartments.peek().join(', ') || 'none'}  probation day ${session.probationDay.peek()}`,
    }),
    date: () => ({ ok: true, message: `${session.formatInWorldDate()}  ${session.zulu()} (${session.siteLocal()})` }),
    cascade: () => (cascade(), { ok: true }),
    tile: () => (tile(), { ok: true }),
    minimize: () => (minimizeAll(), { ok: true }),
    lock: () => (doLock(), { ok: true }),
    logoff: () => (doLogoff(), { ok: true }),
    logout: () => (doLogoff(), { ok: true }),
    search: (arg) => {
      searchOpen.value = true;
      pendingQuery = arg;
      return { ok: true };
    },
    find: (arg) => commands.search!(arg),
    sound: (arg) => {
      const on = arg.trim().toLowerCase() === 'on';
      if (arg.trim().toLowerCase() !== 'on' && arg.trim().toLowerCase() !== 'off') return { ok: false, message: 'Usage: sound on | sound off' };
      services.settings.set('sound', on);
      return { ok: true, message: `Sound cues ${on ? 'enabled' : 'disabled'}.` };
    },
    audit: () => (services.openRoute(services.docs.byRoute('/system/audit') ? '/system/audit' : '/system'), { ok: true }),
  };

  const submit = (e: Event) => {
    e.preventDefault();
    const res = interpretRun(value, commands);
    if (value.trim()) {
      pushRunHistory(value.trim());
      services.audit.log('terminal.cmd', value.trim(), `Operator ${session.operatorId.peek()} entered "${value.trim()}" in the Run dialog.`);
    }
    if (!res.ok) {
      services.sound.play('error');
      setMsg({ ok: false, text: res.message });
      return;
    }
    if (res.message) {
      setMsg({ ok: true, text: res.message });
      setValue('');
      return;
    }
    close();
  };

  return (
    <div class="modal-scrim" onPointerDown={close}>
      <div class="dialog run-dialog" role="dialog" aria-modal="true" aria-labelledby="run-h" onPointerDown={(e) => e.stopPropagation()}>
      <form onSubmit={submit}>
        <div class="dialog-title" id="run-h">
          Run
        </div>
        <div class="dialog-body">
          <p class="dialog-lede">Type a route, document number, application name or command, and MERIDIAN will open it.</p>
          <label for="run-input">Open:</label>
          <input
            id="run-input"
            ref={ref}
            list="run-history"
            value={value}
            autocomplete="off"
            spellcheck={false}
            onInput={(e) => setValue((e.target as HTMLInputElement).value)}
          />
          <datalist id="run-history">
            {runHistory.value.map((h) => (
              <option key={h} value={h} />
            ))}
            {APPS.map((a) => (
              <option key={a.id} value={a.homeRoute} />
            ))}
          </datalist>
          {msg && (
            <div class={`run-msg ${msg.ok ? '' : 'is-error'}`} role={msg.ok ? 'status' : 'alert'}>
              {msg.text}
            </div>
          )}
        </div>
        <div class="dialog-buttons">
          <button type="submit" class="sh-btn sh-btn-default">
            OK
          </button>
          <button type="button" class="sh-btn" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

let pendingQuery = '';

/* --------------------------------------------------------------- search */

interface PersonHit {
  pn: string;
  name: string;
  role: string;
  site: string;
}

export function SearchPalette() {
  const [q, setQ] = useState(() => {
    const p = pendingQuery;
    pendingQuery = '';
    return p;
  });
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [people, setPeople] = useState<PersonHit[]>([]);
  const [withheld, setWithheld] = useState(0);
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const close = () => {
    searchOpen.value = false;
  };
  useReturnFocus();
  useModalKeys(close);
  useEffect(() => ref.current?.focus(), []);

  useEffect(() => {
    let live = true;
    const term = q.trim();
    if (!term) {
      setHits([]);
      setPeople([]);
      setWithheld(0);
      return;
    }
    const t = setTimeout(() => {
      void searchAll(term).then((r) => {
        if (!live) return;
        setHits(r.hits);
        setWithheld(r.withheld);
        setSel(0);
      });
      const lower = term.toLowerCase();
      const tier = session.tier.peek();
      // Roster entries visible at the operator's tier or below; senior staff are not indexed for this tier.
      const ppl = canonNow()
        .roster.filter((p) => p.tier >= tier && !isRx(p.name) && (p.name.toLowerCase().includes(lower) || p.role.toLowerCase().includes(lower) || p.pn.toLowerCase().includes(lower)))
        .slice(0, 6)
        .map((p) => ({ pn: p.pn, name: p.name, role: p.role, site: p.site }));
      setPeople(ppl);
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const total = hits.length + people.length;
  const openAt = (i: number) => {
    if (i < hits.length) {
      services.openRoute(hits[i]!.route.route);
    } else {
      const directory = services.docs.byRoute('/personnel/directory');
      services.openRoute(directory ? '/personnel/directory' : '/personnel');
    }
    close();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSel((s) => Math.min(total - 1, s + 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSel((s) => Math.max(0, s - 1));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (total) openAt(sel);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  return (
    <div class="modal-scrim" onPointerDown={close}>
      <div class="dialog search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-h" onPointerDown={(e) => e.stopPropagation()}>
        <div class="dialog-title" id="search-h">
          Search MERIDIAN
        </div>
        <div class="dialog-body">
          <input
            ref={ref}
            class="search-input"
            role="combobox"
            aria-expanded={total > 0}
            aria-controls="search-results"
            aria-activedescendant={total ? `sr-${sel}` : undefined}
            aria-label="Search documents, facilities, people and forms"
            value={q}
            autocomplete="off"
            spellcheck={false}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            onKeyDown={onKey}
          />
          <div class="search-meta" role="status">
            {q.trim()
              ? `${hits.length} document${hits.length === 1 ? '' : 's'}${people.length ? `, ${people.length} personnel` : ''}${withheld ? `. ${withheld} further result${withheld === 1 ? '' : 's'} withheld at Tier ${session.tier.value}.` : '.'}`
              : 'Search covers documents, facilities, people and forms released to your tier. Searches are recorded.'}
          </div>
          <ul id="search-results" class="search-results" role="listbox" ref={listRef}>
            {hits.map((h, i) => (
              <li
                key={h.route.id}
                id={`sr-${i}`}
                role="option"
                aria-selected={i === sel}
                class={i === sel ? 'is-sel' : ''}
                onPointerEnter={() => setSel(i)}
                onClick={() => openAt(i)}
              >
                <span class="sr-docno mono">{h.route.docNo}</span>
                <span class="sr-title">{h.route.title}</span>
                <span class="sr-mark">{markingById(h.route.marking).label}</span>
                {h.snippet && <span class="sr-snip">{h.snippet}</span>}
              </li>
            ))}
            {people.map((p, j) => {
              const i = hits.length + j;
              return (
                <li key={p.pn} id={`sr-${i}`} role="option" aria-selected={i === sel} class={i === sel ? 'is-sel' : ''} onPointerEnter={() => setSel(i)} onClick={() => openAt(i)}>
                  <span class="sr-docno mono">{p.pn}</span>
                  <span class="sr-title">{p.name}</span>
                  <span class="sr-mark">{p.site}</span>
                  <span class="sr-snip">{p.role}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
