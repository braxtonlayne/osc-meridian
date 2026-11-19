/**
 * xterm.js console for the records host: a line editor (history, tab
 * completion, cursor keys), a pager for long output and plain-text writes.
 * xterm is imported dynamically so it stays inside this app's lazy chunk.
 */
import type { Terminal as XTerm } from '@xterm/xterm';
import type { FitAddon as XFit } from '@xterm/addon-fit';

export interface ConsoleCallbacks {
  /** A complete line was entered at the prompt. */
  onLine(line: string): void;
  /** Tab pressed: return the new line and any options to list. */
  onComplete(line: string): { line: string; options: string[] };
  /** Enter pressed while disconnected. */
  onReconnect(): void;
  /** Pager, busy and connection mode changes, for the status bar. */
  onMode(mode: ConsoleMode): void;
  onResize(cols: number, rows: number): void;
}

export type ConsoleMode = 'input' | 'more' | 'busy' | 'disconnected';

export interface ConsoleHandle {
  write(lines: string[], done?: () => void): void;
  prompt(): void;
  clear(): void;
  focus(): void;
  fit(): void;
  setBusy(b: boolean): void;
  setConnected(c: boolean): void;
  setPager(on: boolean): void;
  setFontSize(px: number): void;
  /** Type a line at the prompt and enter it, as if keyed. */
  submit(line: string): void;
  paste(text: string): void;
  selection(): string;
  selectAll(): void;
  transcript(): string;
  readonly cols: number;
  readonly rows: number;
  dispose(): void;
}

const ESC = '\x1b';
const LEAVE_FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x08\x0b-\x1f\x7f]/g;
const clean = (s: string) => s.replace(CONTROL, '');

function cssVar(el: HTMLElement, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

export async function mountConsole(el: HTMLElement, prompt: string, cb: ConsoleCallbacks, opts: { fontSize: number; pager: boolean }): Promise<ConsoleHandle> {
  const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit'), import('@xterm/xterm/css/xterm.css')]);
  const fontFamily = cssVar(el, '--font-mono') || 'monospace';
  try {
    await document.fonts.load(`${opts.fontSize}px ${fontFamily}`);
  } catch {
    /* fall back to whatever face is available */
  }
  const fg = cssVar(el, '--text-1');
  const term: XTerm = new Terminal({
    fontFamily,
    fontSize: opts.fontSize,
    lineHeight: 1.15,
    cursorBlink: false,
    cursorStyle: 'block',
    scrollback: 2000,
    convertEol: false,
    allowProposedApi: false,
    // Mirror output into an off-screen live region so screen readers hear it.
    screenReaderMode: true,
    theme: {
      background: cssVar(el, '--surface'),
      foreground: fg,
      cursor: fg,
      cursorAccent: cssVar(el, '--surface'),
      selectionBackground: cssVar(el, '--select-bg'),
      selectionForeground: cssVar(el, '--select-fg'),
    },
  });
  const fitAddon: XFit = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(el);
  try {
    fitAddon.fit();
  } catch {
    /* zero-size host during first layout */
  }

  let buf = '';
  let cur = 0;
  let mode: ConsoleMode = 'input';
  let pagerOn = opts.pager;
  let histIdx = -1;
  let draft = '';
  const history: string[] = [];
  let queue: string[] = [];
  let afterQueue: (() => void) | null = null;
  const log: string[] = [];

  const setMode = (m: ConsoleMode) => {
    mode = m;
    cb.onMode(m);
  };
  const maxInput = () => Math.max(8, term.cols - prompt.length - 1);
  const redraw = () => {
    term.write(`\r${ESC}[K${prompt}${buf}\r`);
    const x = prompt.length + cur;
    if (x > 0) term.write(`${ESC}[${x}C`);
  };
  const raw = (line: string) => {
    log.push(line);
    term.write(clean(line) + '\r\n');
  };
  const rowsOf = (line: string) => Math.max(1, Math.ceil(line.length / Math.max(1, term.cols)));

  const clearMore = () => term.write(`\r${ESC}[K`);
  const moreBar = () =>
    term.write(`${ESC}[7m${term.cols >= 72 ? `-- MORE -- (${queue.length} lines; Space next page, Enter next line, Q quit)` : `-- MORE (${queue.length}) --`}${ESC}[0m`);

  const flush = () => {
    if (!pagerOn) {
      for (const l of queue) raw(l);
      queue = [];
    } else {
      let used = 0;
      const limit = Math.max(2, term.rows - 1);
      while (queue.length && used + rowsOf(queue[0]!) <= limit) {
        const l = queue.shift()!;
        used += rowsOf(l);
        raw(l);
      }
      if (queue.length) {
        moreBar();
        setMode('more');
        return;
      }
    }
    const fn = afterQueue;
    afterQueue = null;
    if (mode === 'more') setMode('input');
    fn?.();
  };


  const showPrompt = () => {
    buf = '';
    cur = 0;
    histIdx = -1;
    term.write(prompt);
    if (mode !== 'disconnected' && mode !== 'busy') setMode('input');
  };

  const enter = (line: string) => {
    term.write('\r\n');
    log.push(prompt + line);
    if (line.trim()) {
      if (history[history.length - 1] !== line.trim()) history.push(line.trim());
    }
    buf = '';
    cur = 0;
    histIdx = -1;
    cb.onLine(line);
  };

  const insert = (text: string) => {
    const room = maxInput() - buf.length;
    if (room <= 0) return;
    const t = clean(text).slice(0, room);
    buf = buf.slice(0, cur) + t + buf.slice(cur);
    cur += t.length;
    if (cur === buf.length) term.write(t);
    else redraw();
  };

  const recall = (dir: -1 | 1) => {
    if (!history.length) return;
    if (histIdx === -1) {
      if (dir === 1) return;
      draft = buf;
      histIdx = history.length - 1;
    } else {
      histIdx += dir;
      if (histIdx >= history.length) {
        histIdx = -1;
        buf = draft;
        cur = buf.length;
        redraw();
        return;
      }
      histIdx = Math.max(0, histIdx);
    }
    buf = history[histIdx]!.slice(0, maxInput());
    cur = buf.length;
    redraw();
  };

  const handleInput = (data: string) => {
    if (mode === 'busy') return;
    if (mode === 'disconnected') {
      if (data === '\r') cb.onReconnect();
      return;
    }
    if (mode === 'more') {
      const k = data.toLowerCase();
      if (k === ' ') {
        clearMore();
        setMode('input');
        flush();
      } else if (k === '\r') {
        clearMore();
        if (queue.length) raw(queue.shift()!);
        if (queue.length) {
          moreBar();
        } else {
          setMode('input');
          flush();
        }
      } else if (k === 'q' || k === ESC || k === '\x03') {
        clearMore();
        queue = [];
        setMode('input');
        flush();
      }
      return;
    }
    switch (data) {
      case '\r':
        enter(buf);
        return;
      case '\x7f':
      case '\b':
        if (cur > 0) {
          buf = buf.slice(0, cur - 1) + buf.slice(cur);
          cur--;
          redraw();
        }
        return;
      case `${ESC}[3~`:
        if (cur < buf.length) {
          buf = buf.slice(0, cur) + buf.slice(cur + 1);
          redraw();
        }
        return;
      case `${ESC}[A`:
        recall(-1);
        return;
      case `${ESC}[B`:
        recall(1);
        return;
      case `${ESC}[C`:
        if (cur < buf.length) {
          cur++;
          term.write(data);
        }
        return;
      case `${ESC}[D`:
        if (cur > 0) {
          cur--;
          term.write(data);
        }
        return;
      case `${ESC}[H`:
      case `${ESC}OH`:
      case '\x01':
        cur = 0;
        redraw();
        return;
      case `${ESC}[F`:
      case `${ESC}OF`:
      case '\x05':
        cur = buf.length;
        redraw();
        return;
      case '\t': {
        const r = cb.onComplete(buf.slice(0, cur));
        if (r.options.length) {
          term.write('\r\n');
          raw(r.options.join('  '));
          term.write(prompt + buf);
          cur = buf.length;
          return;
        }
        if (r.line !== buf.slice(0, cur)) {
          buf = (r.line + buf.slice(cur)).slice(0, maxInput());
          cur = Math.min(r.line.length, buf.length);
          redraw();
        }
        return;
      }
      case '\x03':
        term.write('^C\r\n');
        log.push(prompt + buf + '^C');
        showPrompt();
        return;
      case '\x0c':
        api.clear();
        redraw();
        return;
      case '\x15':
        buf = buf.slice(cur);
        cur = 0;
        redraw();
        return;
      default:
        if (data.startsWith(ESC)) return;
        // Pasted or typed text; a pasted newline enters the line.
        if (/[\r\n]/.test(data)) {
          const parts = data.split(/\r\n|\r|\n/);
          parts.forEach((part, i) => {
            insert(part);
            if (i < parts.length - 1 && mode === 'input') enter(buf);
          });
          return;
        }
        insert(data);
    }
  };

  // The terminal keeps Tab for completion, so it needs its own way out for keyboard users:
  // Ctrl+Shift+Tab (where the browser passes it through), or Esc followed by Tab / Shift+Tab.
  let escArmed = false;
  const leave = (dir: 1 | -1) => {
    const scope = el.closest<HTMLElement>('[data-win-id]') ?? document.body;
    const all = [...scope.querySelectorAll<HTMLElement>(LEAVE_FOCUSABLE)].filter(
      (n) => n.getClientRects().length > 0 && !n.closest('[role="menubar"], [role="menu"]') && (n === el || !el.contains(n)),
    );
    const list = [el, ...all.filter((n) => n !== el)].sort((a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const at = list.indexOf(el);
    const next = list[at + dir] ?? list[dir === 1 ? 0 : list.length - 1];
    if (next && next !== el) next.focus();
    else term.blur();
  };

  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown') return true;
    if (e.key === 'Tab' && (e.ctrlKey ? e.shiftKey : escArmed)) {
      escArmed = false;
      e.preventDefault();
      leave(e.ctrlKey || e.shiftKey ? -1 : 1);
      return false;
    }
    if (e.key !== 'Shift') escArmed = e.key === 'Escape';
    // Leave window menus (F10, Alt+letter) and shell shortcuts (Ctrl+K search) to the host window.
    if (e.key === 'F10' || (e.altKey && !e.ctrlKey)) return false;
    if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) return false;
    if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) return false; // native paste event follows
    if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && term.hasSelection()) {
      void navigator.clipboard?.writeText(term.getSelection()).catch(() => undefined);
      return false;
    }
    return true;
  });

  const subs = [
    term.onData(handleInput),
    term.onResize(({ cols, rows }) => cb.onResize(cols, rows)),
  ];
  const ro = new ResizeObserver(() => {
    try {
      fitAddon.fit();
    } catch {
      /* hidden */
    }
  });
  ro.observe(el);

  const api: ConsoleHandle = {
    write(lines, done) {
      queue.push(...lines);
      afterQueue = done ?? null;
      flush();
    },
    prompt: showPrompt,
    clear() {
      term.clear();
      term.write(`\r${ESC}[K`);
    },
    focus: () => term.focus(),
    fit() {
      try {
        fitAddon.fit();
      } catch {
        /* hidden */
      }
    },
    setBusy(b) {
      setMode(b ? 'busy' : 'input');
    },
    setConnected(c) {
      setMode(c ? 'input' : 'disconnected');
    },
    setPager(on) {
      pagerOn = on;
    },
    setFontSize(px) {
      term.options.fontSize = px;
      api.fit();
    },
    submit(line) {
      if (mode !== 'input') return;
      buf = line.slice(0, maxInput());
      cur = buf.length;
      redraw();
      enter(buf);
    },
    paste(text) {
      if (mode === 'input') handleInput(text);
    },
    selection: () => term.getSelection(),
    selectAll: () => term.selectAll(),
    transcript: () => log.join('\n'),
    get cols() {
      return term.cols;
    },
    get rows() {
      return term.rows;
    },
    dispose() {
      ro.disconnect();
      for (const s of subs) s.dispose();
      term.dispose();
    },
  };
  return api;
}
