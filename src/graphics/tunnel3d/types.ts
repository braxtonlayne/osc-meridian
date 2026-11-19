/** Public types for @graphics/tunnel3d. No three.js types leak through this file. */

export interface TunnelTrain {
  /** Stable identity across updates (the box is moved, not recreated). */
  id: string;
  kind: 'rail' | 'tram';
  /** Rail: segment number "01".."06". Tram: "FROM>TO" (either direction is accepted). */
  link: string;
  /** 0..1 along the link, measured from the first-named end. */
  pos: number;
  /** Consist ID shown beside the box. */
  label: string;
  /** Drawn as a plain grey box with no label. */
  suppressed?: boolean;
}

export interface TunnelViewOptions {
  trains?: TunnelTrain[];
  /** Link key or facility id. */
  selected?: string;
  /** Called on a user selection with the link key or facility id; called with '' when the selection is cleared. */
  onSelect?: (key: string) => void;
  /** Trains jump to position instead of gliding. Defaults to the prefers-reduced-motion media query. */
  reducedMotion?: boolean;
  /** Initial projection. Default 'orthographic'. */
  projection?: 'orthographic' | 'perspective';
}

export interface TunnelViewHandle {
  /** Stops rendering, removes listeners and DOM, releases every GPU resource and the GL context. */
  dispose(): void;
  /** Replace the train list. Cheap; call as often as the simulation ticks. */
  update(trains: TunnelTrain[]): void;
  /** Select a link or facility programmatically ('' or null clears). Does not fire onSelect. */
  select(key: string | null): void;
}
