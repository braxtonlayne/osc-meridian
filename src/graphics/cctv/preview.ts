/**
 * Preview gallery for @graphics/cctv: one still per scene kind, at a fixed moment, so a change to
 * the renderer can be checked by eye (check/render.mjs captures it). Sample states, not canon.
 */
import '@design/index';
import { buildScene, renderFrame, passersAt, type FrameInput, type SceneSpec } from './index';

const SAMPLES: (SceneSpec & { note: string; f?: Partial<FrameInput>; t?: number })[] = [
  { id: 'A02-C07', kind: 'corridor', location: 'Level 2 lift lobby', level: 2, labels: { level: '2' }, note: 'lift lobby' },
  { id: 'B03-C05', kind: 'corridor', location: 'Operations level corridor', level: 2, note: 'corridor' },
  { id: 'A03-C01', kind: 'portal', location: 'Surface gate', level: 0, note: 'surface gate, day', f: { daylight: 1 } },
  { id: 'G08-C01', kind: 'portal', location: 'Surface access door', level: 0, note: 'surface door, night', f: { daylight: 0 } },
  { id: 'A02-C02', kind: 'portal', location: 'Adit portal', level: 1, note: 'portal, blast door half open', f: { doors: { primary: 0.5, secondary: 0 } } },
  { id: 'A01-C03', kind: 'portal', location: 'Personnel lift head airlock', level: 1, note: 'airlock, door opening', f: { doors: { primary: 0.4, secondary: null } } },
  { id: 'A02-C22', kind: 'platform', location: 'Level 11 platform 1', level: 11, labels: { platform: '1' }, note: 'platform, consist standing', f: { train: { d: 0, lamps: false, lit: true }, doors: { primary: null, secondary: 1 } } },
  { id: 'A02-C24', kind: 'platform', location: 'Level 11 platform 3', level: 11, labels: { platform: '3' }, note: 'platform, standby lighting', f: { lights: 'standby' } },
  { id: 'A03-C14', kind: 'vault', location: 'Level 6 vault door', level: 6, note: 'vault door' },
  { id: 'A02-C04', kind: 'hoist', location: 'Hoist H1 collar landing', level: 1, labels: { sign: '1' }, note: 'hoist landing, cage at landing', f: { cage: { present: true, gateOpen: 1 } } },
  { id: 'A02-C18', kind: 'plant', location: 'Level 9 generator hall', level: 9, note: 'generator hall' },
  { id: 'A02-C08', kind: 'plant', location: 'Level 2 air handling hall', level: 2, note: 'air handling hall' },
  { id: 'A02-C20', kind: 'plant', location: 'Level 10 depot road', level: 10, note: 'depot road' },
  { id: 'A02-C11', kind: 'assembly', location: 'Level 4 dining hall', level: 4, note: 'dining hall, meal', f: { seated: 40 } },
  { id: 'G08-C05', kind: 'assembly', location: 'Shelter hall', level: 2, note: 'shelter hall, muster', f: { standing: 20, seated: 3 } },
  { id: 'G08-C06', kind: 'corridor', location: 'Bunk room corridor', level: 2, note: 'bunk room corridor, night', f: { lights: 'night' } },
];

const W = 352;
const H = 240;
const T0 = Date.UTC(2008, 4, 19, 21, 14, 7);
const grid = document.getElementById('grid')!;
const act = { slotSec: 20, walkMps: 1.3, cartMps: 3.4, cartShare: 0.2 };

for (const s of SAMPLES) {
  const fig = document.createElement('figure');
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const cap = document.createElement('figcaption');
  cap.textContent = `${s.id} ${s.note}`;
  fig.append(cv, cap);
  grid.append(fig);
  const scene = buildScene(s);
  const ctx = cv.getContext('2d')!;
  // find a moment with somebody in shot, for the gallery
  let t = s.t ?? T0;
  for (let i = 0; i < 200 && !passersAt(scene, t, act, () => 0.9).length; i++) t += 3000;
  const f: FrameInput = {
    view: { yaw: 0, pitch: 0, zoom: 1 },
    lights: 'normal',
    daylight: 0.8,
    doors: { primary: null, secondary: null },
    train: null,
    cage: null,
    passers: passersAt(scene, t, act, () => 0.9),
    seated: 0,
    standing: 0,
    ...s.f,
  };
  renderFrame(ctx, W, H, scene, f, { title: `${s.id} ${s.location.toUpperCase()}`, stamp: '05-19-2008 17:14:07', tags: ['REC'] }, { blockPx: 8, blockMix: 0.16, levels: 112 });
}
