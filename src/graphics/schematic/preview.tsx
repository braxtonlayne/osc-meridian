/**
 * Rendered check for @graphics/schematic. Dev-only; not imported by the app.
 * Fills the viewport with the diagram and sample traffic.
 *   #perf   30 trains stepped 4x/s; logs mean commit time to the console.
 *   #rail   network="RAIL"        #east  network="EASTERN"
 */
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import { LineDiagram, SCHEMATIC_LAYOUT, blockKey, type DiagramNetwork, type Occupancy, type SchematicTrain } from './index';

// Sample consist identities are preview data, not canon.
const SAMPLE: SchematicTrain[] = [
  { id: 'r1', kind: 'RAIL', link: '02', pos: 0.19, dir: 1, label: 'M2W-0714' },
  { id: 'r2', kind: 'RAIL', link: '02', pos: 0.67, dir: -1, label: 'M2E-0709' },
  { id: 'r3', kind: 'RAIL', link: '03', pos: 0.4, dir: 1, label: 'M3W-0712' },
  { id: 'r4', kind: 'RAIL', link: '01', pos: 0.55, dir: -1, label: 'M1E-0716' },
  { id: 'r5', kind: 'RAIL', link: '06', pos: 0.58, dir: 1, label: 'M6S-0705' },
  { id: 'r6', kind: 'RAIL', link: '05', pos: 0.26, dir: 1, label: 'M5S-0718' },
  { id: 'x1', kind: 'RAIL', link: '04', pos: 0.86, dir: 1, label: 'M4S-0000', suppressed: true },
  { id: 't1', kind: 'TRAM', link: 'ALPHA-01>BETA-01', pos: 0.3, dir: 1, label: 'E101' },
  { id: 't2', kind: 'TRAM', link: 'ALPHA-01>BETA-10', pos: 0.8, dir: -1, label: 'E310' },
  { id: 't3', kind: 'TRAM', link: 'ALPHA-05>BETA-03', pos: 0.72, dir: 1, label: 'S203' },
  { id: 't4', kind: 'TRAM', link: 'ALPHA-04>BETA-07', pos: 0.5, dir: -1, label: 'W407' },
  { id: 't5', kind: 'TRAM', link: 'ALPHA-02>BETA-04', pos: 0.75, dir: 1, label: 'W204' },
  { id: 't6', kind: 'TRAM', link: 'ALPHA-03>BETA-09', pos: 0.5, dir: 1, label: 'C109' },
  { id: 't7', kind: 'TRAM', link: 'BETA-08>GAMMA-11', pos: 0.5, dir: 1, label: 'W811' },
];

const OCC: Record<string, Occupancy> = {
  '04': 'DARK',
  [blockKey('04', 4)]: 'OCCUPIED',
  [blockKey('02', 2)]: 'OCCUPIED',
  [blockKey('02', 6)]: 'OCCUPIED',
  [blockKey('03', 2)]: 'OCCUPIED',
  [blockKey('01', 2)]: 'OCCUPIED',
  [blockKey('06', 5)]: 'OCCUPIED',
  [blockKey('05', 2)]: 'OCCUPIED',
  [blockKey('05', 4)]: 'POSSESSION',
  [blockKey('05', 5)]: 'POSSESSION',
  'ALPHA-05>BETA-12': 'POSSESSION',
  'BETA-11>GAMMA-14': 'DARK',
  'ALPHA-01>BETA-01': 'OCCUPIED',
  [blockKey('ALPHA-05>BETA-03', 2)]: 'OCCUPIED',
  [blockKey('ALPHA-01>BETA-10', 2)]: 'OCCUPIED',
};

function perfTrains(step: number): SchematicTrain[] {
  const links = SCHEMATIC_LAYOUT.links;
  return Array.from({ length: 30 }, (_, i): SchematicTrain => {
    const l = links[(i * 7) % links.length]!;
    const raw = (i * 0.137 + step * 0.004 * (1 + (i % 3))) % 2;
    return { id: `p${i}`, kind: l.kind, link: l.key, pos: raw <= 1 ? raw : 2 - raw, dir: raw <= 1 ? 1 : -1, label: `${l.kind === 'RAIL' ? 'M' : 'T'}${100 + i}` };
  });
}

function App() {
  const hash = location.hash;
  const perf = hash === '#perf';
  const network: DiagramNetwork = hash === '#rail' ? 'RAIL' : hash === '#east' ? 'EASTERN' : 'ALL';
  const [size, setSize] = useState({ w: innerWidth, h: innerHeight });
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(hash === '#sel' ? '05' : null);

  useEffect(() => {
    const on = () => setSize({ w: innerWidth, h: innerHeight });
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    if (!perf) return;
    const times: number[] = [];
    let n = 0;
    const id = setInterval(() => {
      const t0 = performance.now();
      setStep((s) => s + 1);
      // Preact commits on a microtask-debounced queue; measure to the next task.
      setTimeout(() => {
        times.push(performance.now() - t0);
        if (++n === 40) {
          clearInterval(id);
          const mean = times.reduce((a, b) => a + b, 0) / times.length;
          console.log(`PERF 30 trains, 40 updates: mean ${mean.toFixed(2)} ms, max ${Math.max(...times).toFixed(2)} ms`);
          document.title = 'perf-done';
        }
      }, 0);
    }, 250);
    return () => clearInterval(id);
  }, [perf]);

  return (
    <LineDiagram
      width={size.w}
      height={size.h}
      network={network}
      trains={perf ? perfTrains(step) : SAMPLE}
      occupancy={OCC}
      selected={selected}
      onSelectLink={setSelected}
      onSelectNode={setSelected}
    />
  );
}

render(<App />, document.getElementById('root')!);
