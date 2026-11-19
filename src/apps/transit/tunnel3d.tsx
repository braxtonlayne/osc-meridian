/**
 * Tunnel 3D view. @graphics/tunnel3d is imported on first use so its model and the three.js
 * scene chunk load only when this view opens.
 */
import { useEffect, useState } from 'preact/hooks';
import type { TunnelTrain } from '@graphics/tunnel3d';
import type { Snapshot } from './views';

type Mod = typeof import('@graphics/tunnel3d');

export function Tunnel3DView({ state, selected, onSelect, reducedMotion }: { state: Snapshot | null; selected: string | null; onSelect: (k: string | null) => void; reducedMotion: boolean }) {
  const [mod, setMod] = useState<Mod | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    import('@graphics/tunnel3d')
      .then((m) => live && setMod(m))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  if (failed) return <p class="tr-note tr-pad">The 3D tunnel model could not be loaded on this workstation. Use the line diagram or geographic view.</p>;
  if (!mod) return <p class="tr-note tr-pad">Loading tunnel model.</p>;
  const trains: TunnelTrain[] = (state?.trains ?? []).map((t) => ({ id: t.id, kind: t.kind === 'RAIL' ? 'rail' : 'tram', link: t.link, pos: t.pos, label: t.label, suppressed: t.suppressed }));
  const { TunnelView } = mod;
  return (
    <div class="tr-3d">
      <TunnelView trains={trains} selected={selected ?? ''} onSelect={(k) => onSelect(k || null)} reducedMotion={reducedMotion} />
    </div>
  );
}
