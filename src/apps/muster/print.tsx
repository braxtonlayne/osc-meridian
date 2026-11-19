/**
 * Close-out report to print: the report sheet with marking strips, through the shell's print
 * mechanism (a .print-root under <body>, body[data-print-doc], window.print()).
 */
import { render } from 'preact';
import type { MarkingId } from '@core/canon-types';
import { MarkingStrip } from '@shell/adapters';
import { CloseoutSheet } from './views';
import type { RunView, Tally } from './model';

export interface CloseoutPrint {
  site: string;
  view: RunView;
  totals: Tally;
  discrepancies: string[];
  signer: string | null;
  initiator?: string;
  marking: MarkingId;
  printedBy: string;
  printedAt: string;
  copyNo: string;
}

export function printCloseout(spec: CloseoutPrint): void {
  const root = document.createElement('div');
  root.className = 'print-root mus-print-root';
  document.body.appendChild(root);
  render(
    <div class="mus-print">
      <MarkingStrip marking={spec.marking} />
      <CloseoutSheet site={spec.site} view={spec.view} totals={spec.totals} discrepancies={spec.discrepancies} signer={spec.signer} initiator={spec.initiator} />
      <p class="mus-print__foot">
        Copy {spec.copyNo}. Printed by {spec.printedBy}, {spec.printedAt}. Muster records are retained by Security Forces Command.
      </p>
      <MarkingStrip marking={spec.marking} />
    </div>,
    root,
  );
  document.body.dataset.printDoc = spec.view.run.id;
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
  setTimeout(() => {
    try {
      window.print();
    } finally {
      setTimeout(cleanup, 1000);
    }
  }, 50);
}
