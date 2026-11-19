/** Facility Registry: national map and the dossier map inset. */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Facility, FacilityId } from '@core/canon-types';
import { MapLegend, UsMap } from '@graphics/map';

/** Track an element's content box. */
export function useSize<T extends HTMLElement>(): [{ current: T | null }, { w: number; h: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = (): void => {
      const w = Math.floor(el.clientWidth);
      const h = Math.floor(el.clientHeight);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    read();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

export interface NationalMapProps {
  plotted: Facility[];
  selected: FacilityId | null;
  onSelect: (id: FacilityId) => void;
  labels: 'alpha' | 'all' | 'none';
  /** Line under the map: what is plotted and what is withheld. */
  note: ComponentChildren;
  side: ComponentChildren;
}

export function NationalMap({ plotted, selected, onSelect, labels, note, side }: NationalMapProps) {
  const [ref, size] = useSize<HTMLDivElement>();
  return (
    <div class="reg-map">
      <div class="reg-map__frame" ref={ref}>
        {size.w > 40 && size.h > 40 ? (
          <UsMap
            width={size.w}
            height={size.h}
            facilities={plotted}
            selected={selected && plotted.some((f) => f.id === selected) ? selected : null}
            onSelect={onSelect}
            showLabels={labels}
            label="Map of registered installations"
          />
        ) : null}
      </div>
      <div class="reg-map__side">
        {side}
        <p class="reg-note">{note}</p>
        <MapLegend class="reg-map__legend" />
      </div>
    </div>
  );
}

/** Small locator map for a dossier side panel. */
export function MapInset({ f, width, height, onOpen }: { f: Facility; width: number; height: number; onOpen?: () => void }) {
  return (
    <div class="reg-inset">
      <UsMap
        width={width}
        height={height}
        facilities={[f]}
        selected={f.id}
        onSelect={() => onOpen?.()}
        showLabels="none"
        layers={{ states: true, grid: false, furniture: false }}
        label={`Location of ${f.id}`}
      />
    </div>
  );
}
