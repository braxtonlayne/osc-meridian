/**
 * Shared plant state key `cctv` (owner: Facility Video; everyone else reads it with `import type`).
 *
 * The cameras themselves are canon (`cameras`, content/canon/extended-c.json). This key holds what
 * is physical about the video system and is the same for every account and tab:
 *
 * - `ptz`: where each pan-tilt-zoom camera points. A camera missing from the record sits on its
 *   preset 1 (HOME). While a move is in progress the view runs from `from` to the target over
 *   canon `apps.cctv.recorder.ptzMoveSec`, starting at `at`. A camera left off HOME parks itself
 *   after `recorder.parkMin` (readers apply that rule; nobody writes the park).
 * - `journal`: plant changes the recorder saw that the plant keys do not keep a history of
 *   (isolation link loss and restoration), newest last, trimmed to the retention window.
 * - `gaps`: intervals with no recorded video on a channel. Playback shows NO RECORDED VIDEO there.
 * - `stills`: serial of printed video stills (VS-08-NNNNN), network-wide.
 */
import type { AccountId } from '@core/contracts';

export interface PtzView {
  /** Pan and tilt from the camera's mounting axis, degrees; zoom multiplier (1 = widest). */
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface PtzRecord extends PtzView {
  /** Preset number recalled (0 = moved by hand off a preset). */
  preset: number;
  /** View at the start of the move. */
  from: PtzView;
  /** Wall-clock ms the move started. */
  at: number;
  by: AccountId;
}

export interface CctvJournalLine {
  /** Wall-clock ms. */
  at: number;
  /** "iso" (network isolation: 1 = isolated, 0 = restored). */
  k: string;
  v: number;
}

export interface RecordGap {
  camera: string;
  /** Wall-clock ms. */
  from: number;
  to: number;
  /** Recorder event text shown in the playback event list. */
  note: string;
  /** Site command notified of the gap (consequence sent once). */
  notified: boolean;
}

export interface CctvState {
  v: 1;
  ptz: Record<string, PtzRecord>;
  journal: CctvJournalLine[];
  gaps: RecordGap[];
  stills: number;
}

export const CCTV_EMPTY: CctvState = { v: 1, ptz: {}, journal: [], gaps: [], stills: 0 };
