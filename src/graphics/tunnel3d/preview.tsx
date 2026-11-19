// Preview / rendered-check page for @graphics/tunnel3d. Dev-only: not imported by the application.
// Open /src/graphics/tunnel3d/preview.html on the dev server. Query: ?static=1 freezes the sample trains,
// ?projection=perspective starts in perspective.
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import '@design/styles';
import { TunnelView, type TunnelTrain } from './index';

const q = new URLSearchParams(location.search);
const frozen = q.has('static');

interface Sample extends TunnelTrain {
  rate: number;
}

// Sample consists for the check only; the transit simulation supplies the real ones.
const SAMPLES: Sample[] = [
  { id: 'r1', kind: 'rail', link: '01', pos: 0.42, label: 'R-0117', rate: 0.02 },
  { id: 'r2', kind: 'rail', link: '02', pos: 0.63, label: 'R-0204', rate: 0.006 },
  { id: 'r3', kind: 'rail', link: '03', pos: 0.3, label: 'R-0309', rate: 0.011 },
  { id: 'r5', kind: 'rail', link: '05', pos: 0.55, label: 'R-0512', rate: -0.008 },
  { id: 'r6', kind: 'rail', link: '06', pos: 0.2, label: 'R-0621', rate: 0.007 },
  { id: 't1', kind: 'tram', link: 'ALPHA-01>BETA-10', pos: 0.5, label: 'T-E-031', rate: 0.012 },
  { id: 't2', kind: 'tram', link: 'BETA-03>ALPHA-05', pos: 0.35, label: 'T-S-014', rate: 0.01 },
  { id: 't3', kind: 'tram', link: 'ALPHA-04>BETA-07', pos: 0.7, label: 'T-W-022', rate: -0.009 },
  { id: 't4', kind: 'tram', link: 'ALPHA-02>BETA-04', pos: 0.45, label: 'T-W-008', rate: 0.01 },
  { id: 'x', kind: 'rail', link: '04', pos: 0.36, label: '', suppressed: true, rate: 0.012 },
];

function Preview() {
  const [trains, setTrains] = useState<TunnelTrain[]>(SAMPLES);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (frozen) return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const s = (performance.now() - t0) / 1000;
      setTrains(SAMPLES.map((t) => ({ ...t, pos: (((t.pos + t.rate * s) % 1) + 1) % 1 })));
    }, 250);
    return () => clearInterval(id);
  }, []);
  return (
    <TunnelView
      trains={trains}
      selected={selected}
      onSelect={(k) => {
        document.body.dataset.selected = k;
        setSelected(k || undefined);
      }}
      projection={q.get('projection') === 'perspective' ? 'perspective' : 'orthographic'}
    />
  );
}

const app = document.getElementById('app');
if (app) render(<Preview />, app);
