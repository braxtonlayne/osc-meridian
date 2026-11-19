/**
 * @graphics/depth3d: Preact wrapper.
 * Renders the SVG elevation straight away (so prerendered HTML and print have a drawing),
 * then mounts the interactive viewer over it. On paper only the elevation prints.
 */
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import './depth3d.css';
import { DepthSection2D } from './DepthSection2D';
import { mountDepthViewer, type DepthViewerHandle } from './index';

export interface DepthViewerProps {
  facilityId: string;
  /** Session tier (3 for the probationary analyst, 2 when acting). */
  tier: number;
  onSelectLevel?: (n: number) => void;
}

export function DepthViewer({ facilityId, tier, onSelectLevel }: DepthViewerProps): JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<DepthViewerHandle | null>(null);
  const onSelect = useRef(onSelectLevel);
  onSelect.current = onSelectLevel;
  const tierRef = useRef(tier);
  tierRef.current = tier;
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hd = mountDepthViewer(el, facilityId, {
      tier: tierRef.current,
      reducedMotion,
      onSelectLevel: (n) => {
        setSelected(n);
        onSelect.current?.(n);
      },
    });
    handle.current = hd;
    setLive(true);
    return () => {
      handle.current = null;
      hd.dispose();
      setLive(false);
      setSelected(null);
    };
  }, [facilityId]);

  useEffect(() => {
    handle.current?.setTier(tier);
  }, [tier]);

  return (
    <div class={`d3v-wrap${live ? ' is-live' : ''}`}>
      <div class="d3v-host" ref={host} />
      <div class="d3v-static">
        <DepthSection2D facilityId={facilityId} tier={tier} selected={selected} />
      </div>
    </div>
  );
}

export default DepthViewer;
