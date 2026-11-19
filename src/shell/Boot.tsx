/**
 * Pre-boot hardware self-test. Plain grey panel, < 2 s, skippable by any key
 * or click. With reduced motion every line is shown at once.
 */
import { useEffect, useState } from 'preact/hooks';

const LINES: [string, string][] = [
  ['Workstation', 'OSC-WS 7140  firmware 2.06.11'],
  ['Memory test (2048 MB)', 'OK'],
  ['Processor', '2 cores  OK'],
  ['Display adapter', '1280 x 1024  OK'],
  ['Fixed disk 0 (encrypted volume)', 'OK'],
  ['Token reader, slot 0', 'OK  token present'],
  ['QKD link module QLM-2', 'OK  key store 4 of 4'],
  ['Network interface (closed segment)', 'OK  link up'],
  ['Enclosure seal', 'INTACT'],
  ['Print spooler', 'OK'],
  ['Time source', 'ALPHA-03 site reference  OK'],
];

const STEP_MS = 120;

export function Boot({ onDone, reduced }: { onDone: () => void; reduced: boolean }) {
  const [shown, setShown] = useState(reduced ? LINES.length : 0);

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!reduced) {
      LINES.forEach((_, i) => timers.push(setTimeout(() => setShown(i + 1), (i + 1) * STEP_MS)));
    }
    timers.push(setTimeout(finish, reduced ? 500 : LINES.length * STEP_MS + 350));
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.key === 'Tab' || e.key === 'Shift')) return;
      e.preventDefault();
      finish();
    };
    window.addEventListener('keydown', skip, true);
    window.addEventListener('pointerdown', skip, true);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('pointerdown', skip, true);
    };
  }, []);

  return (
    <div class="boot" role="status" aria-live="polite" aria-label="Workstation self-test">
      <div class="boot-panel">
        <div class="boot-head">Power-on self-test</div>
        <table class="boot-table">
          <tbody>
            {LINES.slice(0, shown).map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div class="boot-progress" aria-hidden="true">
          {LINES.map((_, i) => (
            <span key={i} class={i < shown ? 'seg is-on' : 'seg'} />
          ))}
        </div>
        <div class="boot-foot">Press any key to continue</div>
      </div>
    </div>
  );
}
