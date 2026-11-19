/**
 * Rendered check for @graphics/org. Not shipped. The view is chosen by the hash:
 *   #council (default)  #division=RD  #facility=ALPHA-01  #pyramid  #pyramid=3
 * and `&tier=N` sets the session tier (default 3).
 */
import { render } from 'preact';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '../../design/tokens.css';
import { OrgChart, TierPyramid } from './index';

const args = new Map(
  location.hash
    .slice(1)
    .split('&')
    .filter(Boolean)
    .map((kv) => {
      const [k, v] = kv.split('=');
      return [k ?? '', v ?? ''] as const;
    }),
);
const tier = Number(args.get('tier') || 3);
const log = (kind: string) => (id: string) => {
  document.title = `${kind} ${id}`;
};

function View() {
  if (args.has('pyramid')) {
    const hl = Number(args.get('pyramid')) || undefined;
    return <TierPyramid width={window.innerWidth} height={window.innerHeight} highlightTier={hl} />;
  }
  const root = args.get('division') || args.get('facility') || 'COUNCIL';
  return <OrgChart root={root} sessionTier={tier} onSelectPerson={log('person')} onSelectUnit={log('unit')} />;
}

document.body.style.margin = '0';
const el = document.getElementById('root');
if (el) {
  el.style.height = '100vh';
  render(<View />, el);
}
