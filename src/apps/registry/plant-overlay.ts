/**
 * Facility Registry: plant overlay on simulated telemetry.
 *
 * Where a site's plant is modelled by a set-piece application (shared plant state), the dossier
 * reads that state instead of the generic telemetry simulator, so the register, the environmental
 * control panel and the door board never disagree:
 *   - atmosphere (site CO2 and O2) from the environ historian (`environ` key, last sample);
 *   - portal seals from the door board (`doors` key over canon doors at the portal level).
 * Shared keys are read with type-only imports, as docs/CONTRACTS.md requires.
 */
import type { Reading, Portal } from '@sim/telemetry.worker';
import type { EnvironState } from '@apps/environ/types';
import type { DoorPosition, DoorsState } from '@apps/doors/types';
import { canon } from './shared';

interface DoorCanon {
  id: string;
  level: number;
  location: string;
  kind: string;
  normal: 'open' | 'closed';
}

const doorSites = (canon as unknown as { doors?: { facility: string; doors: DoorCanon[] }[] }).doors ?? [];

/** Current position of a door: last schedule step at or before `now`, else its canon normal. */
function positionOf(def: DoorCanon, doors: DoorsState | null, now: number): DoorPosition {
  const rec = doors?.doors?.[def.id];
  if (!rec || !rec.steps?.length) return def.normal === 'open' ? 'open' : 'closed-locked';
  let pos = rec.steps[0]!.pos;
  for (const s of rec.steps) if (s.from <= now) pos = s.pos;
  return pos;
}

/** Portal-level doors (portal doors and blast doors on the entry level) of a site, with their seal state. */
export function portalSeals(site: string, doors: DoorsState | null, now: number): Portal[] | null {
  const entry = doorSites.find((d) => d.facility === site);
  if (!entry) return null;
  const top = Math.min(...entry.doors.map((d) => d.level));
  const list = entry.doors.filter((d) => d.level === top && (d.kind === 'portal' || d.kind === 'blast'));
  if (!list.length) return null;
  return list.map((d) => {
    const pos = positionOf(d, doors, now);
    const state: Portal['state'] = pos === 'closed-locked' ? 'SEALED' : pos === 'open' ? 'VENTED' : 'CYCLING';
    return { tag: d.id, label: d.location, state };
  });
}

/** Apply the shared plant state to a simulated reading for `site`. */
export function overlayReading(r: Reading, site: string, environ: EnvironState | null, doors: DoorsState | null, now: number): Reading {
  let out = r;
  const last = environ && environ.site === site ? environ.log[environ.log.length - 1] : undefined;
  if (last) out = { ...out, air: { ...out.air, co2ppm: last.co2, o2Pct: Math.round(last.o2 * 100) / 100 } };
  const portals = portalSeals(site, doors, now);
  if (portals) out = { ...out, seal: { ...out.seal, portals } };
  return out;
}
