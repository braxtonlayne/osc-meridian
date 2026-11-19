import { useEffect, useRef } from 'preact/hooks';
import { mountTunnelView } from './mount';
import type { TunnelTrain, TunnelViewHandle } from './types';

export interface TunnelViewProps {
  trains?: TunnelTrain[];
  selected?: string;
  onSelect?: (key: string) => void;
  reducedMotion?: boolean;
  projection?: 'orthographic' | 'perspective';
  class?: string;
  style?: string;
}

/**
 * Preact wrapper. The container fills its parent by default (give the parent a height).
 * `trains` and `selected` are pushed into the live scene; nothing is remounted when they change.
 */
export function TunnelView(props: TunnelViewProps) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<TunnelViewHandle | null>(null);
  const onSelect = useRef(props.onSelect);
  onSelect.current = props.onSelect;
  // Selections the scene has already made and reported. When the parent echoes one back through
  // `selected` it is dropped, so a late echo cannot undo a newer selection (fast key repeat).
  const echoes = useRef<string[]>([]);

  useEffect(() => {
    if (!host.current) return;
    const h = mountTunnelView(host.current, {
      trains: props.trains,
      selected: props.selected,
      reducedMotion: props.reducedMotion,
      projection: props.projection,
      onSelect: (key) => {
        if (onSelect.current) echoes.current.push(key);
        onSelect.current?.(key);
      },
    });
    handle.current = h;
    return () => {
      handle.current = null;
      echoes.current = [];
      h.dispose();
    };
    // Remount only when a mount-time option changes.
  }, [props.reducedMotion, props.projection]);

  useEffect(() => {
    handle.current?.update(props.trains ?? []);
  }, [props.trains]);

  useEffect(() => {
    const i = echoes.current.indexOf(props.selected ?? '');
    if (i >= 0) {
      echoes.current.splice(0, i + 1);
      return;
    }
    echoes.current = [];
    handle.current?.select(props.selected ?? null);
  }, [props.selected]);

  return <div ref={host} class={props.class ? `t3d-host ${props.class}` : 't3d-host'} style={props.style} />;
}
