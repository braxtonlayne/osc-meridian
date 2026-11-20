/**
 * Video still to print: the frame as the client displayed it, with the still number, camera,
 * recorder channel and stamp, between marking lines. Same mechanism as the shell's document print
 * (a .print-root under <body>, body[data-print-doc], window.print()).
 */
import { render } from 'preact';

export interface StillSpec {
  stillNo: string;
  image: string;
  markingLabel: string;
  rows: [string, string][];
  footer: string;
}

function Still({ s }: { s: StillSpec }) {
  return (
    <div class="cctv-print">
      <p class="cctv-print-mark">{s.markingLabel}</p>
      <h1 class="cctv-print-title">VIDEO STILL {s.stillNo}</h1>
      <img class="cctv-print-img" src={s.image} alt={`Video still ${s.stillNo}`} />
      <table class="cctv-print-table">
        <tbody>
          {s.rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="cctv-print-foot">{s.footer}</p>
      <p class="cctv-print-mark">{s.markingLabel}</p>
    </div>
  );
}

export async function printStill(s: StillSpec): Promise<void> {
  const root = document.createElement('div');
  root.className = 'print-root cctv-print-root';
  document.body.appendChild(root);
  render(<Still s={s} />, root);
  document.body.dataset.printDoc = s.stillNo;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    removeEventListener('afterprint', cleanup);
    render(null, root);
    root.remove();
    delete document.body.dataset.printDoc;
  };
  addEventListener('afterprint', cleanup);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  try {
    window.print();
  } finally {
    setTimeout(cleanup, 1500);
  }
}
