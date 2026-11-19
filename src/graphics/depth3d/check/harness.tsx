// Check page for @graphics/depth3d (dev only; bundled by check/render.mjs, never by the app).
// Query: ?site=ALPHA-01&mode=3d|2d|wrapper|svg&tier=3
import { render } from 'preact';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/700.css';
import { DepthSection2D, DepthViewer, mountDepthViewer, type DepthViewerHandle } from '../index';

const q = new URLSearchParams(location.search);
const site = q.get('site') ?? 'ALPHA-01';
const mode = q.get('mode') ?? '3d';
const tier = Number(q.get('tier') ?? '3');
const app = document.getElementById('app')!;
const picks: number[] = [];
const w = window as unknown as { viewer?: DepthViewerHandle; picks: number[] };
w.picks = picks;

if (mode === 'wrapper') {
  render(<DepthViewer facilityId={site} tier={tier} onSelectLevel={(n) => picks.push(n)} />, app);
} else if (mode === 'svg') {
  app.style.height = 'auto';
  render(<DepthSection2D facilityId={site} tier={tier} width={760} height={640} />, app);
} else {
  w.viewer = mountDepthViewer(app, site, {
    tier,
    reducedMotion: true,
    renderer: mode === '2d' ? '2d' : 'auto',
    onSelectLevel: (n) => picks.push(n),
  });
}
