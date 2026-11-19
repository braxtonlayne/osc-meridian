/**
 * Rendered check for @graphics/map. Bundled and screenshotted by render.mjs;
 * not imported by the application. Uses the real design tokens.
 */
import { render } from 'preact';
import { useState } from 'preact/hooks';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '../../../design/tokens.css';
import { CLASS_ORDER, MapLegend, MarkerGlyph, UsMap } from '../index';
import type { FacilityId, MarkerState } from '../index';

const STATES: MarkerState[] = ['normal', 'hover', 'selected', 'dim'];

function Live({ id, width, height }: { id: string; width: number; height: number }) {
  const [sel, setSel] = useState<FacilityId | null>(null);
  return (
    <div id={id} class="ck-frame" data-selected={sel ?? ''}>
      <UsMap width={width} height={height} selected={sel} onSelect={setSel} revealDelta />
    </div>
  );
}

function Sheet() {
  return (
    <div class="ck-sheet">
      <div id="map-1200" class="ck-frame">
        <UsMap
          width={1200}
          height={760}
          revealDelta
          overlay={
            <div style={{ position: 'absolute', left: '652px', bottom: '8px' }}>
              <MapLegend revealDelta />
            </div>
          }
        />
      </div>
      <div id="map-600" class="ck-frame">
        <UsMap width={600} height={380} revealDelta />
      </div>
      <div id="map-selected" class="ck-frame">
        <UsMap
          width={1200}
          height={760}
          selected="ALPHA-03"
          showLabels="all"
          overlay={
            <div style={{ position: 'absolute', left: '652px', bottom: '8px' }}>
              <MapLegend />
            </div>
          }
        />
      </div>
      <div id="map-plain" class="ck-frame">
        <UsMap
          width={600}
          height={380}
          classes={['ALPHA', 'BETA']}
          layers={{ grid: false, states: false }}
          showLabels="all"
        />
      </div>
      <Live id="map-live" width={900} height={570} />
      <div id="glyphs" class="ck-glyphs">
        {[12, 17, 24, 48].map((size) => (
          <div class="ck-row">
            {CLASS_ORDER.map((cls) => STATES.map((state) => <MarkerGlyph cls={cls} size={size} state={state} />))}
          </div>
        ))}
        <MapLegend />
        <MapLegend revealDelta classes={['ALPHA', 'DELTA']} counts={false} />
      </div>
    </div>
  );
}

render(<Sheet />, document.getElementById('root') as HTMLElement);
