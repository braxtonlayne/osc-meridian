/**
 * Static (no-JS) home page text for the pass-two set-piece applications (docs/SPEC-2.md §3).
 *
 * scripts/prerender.ts takes the list of apps from src/apps/index.ts (APPS); this table only
 * supplies the in-world title fallback and a description for the app's static home page. When an
 * app has document routes of its own (content/<appId>/*.md), the home page also carries their
 * full static text; until then it shows the title and this description.
 *
 * No figures here: every number belongs in canon and in the app's documents.
 */
import type { AppId } from '../../src/core/contracts';

export interface AppHomeText {
  /** In-world title (fallback; the registry title wins when present). */
  title: string;
  /** Paragraphs, plain text. */
  description: string[];
}

export const APP_HOME_TEXT: Partial<Record<AppId, AppHomeText>> = {
  strike: {
    title: 'Hardened Site Survivability Estimator (planning model PM-3)',
    description: [
      'Planning model PM-3 estimates the condition of programme facilities after a surface event of a selected yield at a selected point. Rings are drawn by cube-root scaling from the reference case, and each facility is read against its depth band and hardening class.',
      'PM-3 is a simplified planning model. It is not for engineering use, it does not model DELTA sites, and its outputs are estimates for exercise planning only. Every printout carries the same caveat.',
    ],
  },
  isolate: {
    title: 'Network Isolation, Manual Initiate',
    description: [
      'Manual initiation of network isolation separates every hub link, holds transit movements at the next station and drops inter-site circuits at the patch panels. The control is guarded: the cover must be lifted and the initiate button held.',
      'Each initiation is logged, reported to every account holder by message and reviewed by the Office of Internal Assurance. The isolation level never falls except through the restoration procedure.',
    ],
  },
  drill: {
    title: 'Seal Drill Coordinator',
    description: [
      'The Seal Drill Coordinator orders a network seal drill and follows its propagation site by site on the map, the schematic and the timeline. Sites acknowledge, seal and report; stragglers are listed until they report or the drill is aborted.',
      'A drill drives the door boards, facility video, public address, muster boards and transit holds through shared plant state. Drill times are taken from the canon seal times for each site.',
    ],
  },
  cctv: {
    title: 'Facility Video (DVR client)',
    description: [
      'The Facility Video client shows camera views per facility in single, quad and nine-way layouts, with preset positions for pan-tilt cameras and playback of the last hour of recording.',
      'Views reflect plant state: blast doors, drill status, train movements and hoist cages appear as they stand. Camera selection and playback are recorded in the workstation audit trail.',
    ],
  },
  plant: {
    title: 'Reactor Plant Panel',
    description: [
      'The Reactor Plant Panel presents rod banks, coolant pumps, turbine and scram for each programme installation, with annunciator tiles and trend plots.',
      'Live mode mirrors plant telemetry and is display-only unless the operator is qualified. The training simulator on the same panel runs a simplified point-kinetics model and is fully operable by every account.',
    ],
  },
  doors: {
    title: 'Door and Airlock Control',
    description: [
      'Door and Airlock Control is the per-facility board for blast doors, personnel airlocks, pressure differentials and decontamination cycles. Interlocks prevent both leaves of an airlock opening together.',
      'An override requires a stated reason and is logged. Seal drills and network isolation drive the board directly.',
    ],
  },
  dispatch: {
    title: 'Dispatcher Workstation',
    description: [
      'The Dispatcher Workstation sets a route, selects a consist, clears signals and dispatches a train, which then runs in the transit simulation and is visible in Transit Control and on facility video.',
      'Route conflicts, possessions and isolation holds are enforced at dispatch and en route.',
    ],
  },
  hoist: {
    title: 'Shaft Hoist Control',
    description: [
      'Shaft Hoist Control operates the personnel and freight hoists between the surface and the working levels of ALPHA sites: call, load, run the cage to a level, and stop.',
      'Gate and overspeed interlocks are enforced, and an emergency stop holds the cage until it is reset at the panel. Depths and speeds are taken from canon.',
    ],
  },
  environ: {
    title: 'Environmental Control (air revitalization)',
    description: [
      'Environmental Control runs the air handling trains, carbon dioxide scrubbers and filtration of a facility, including the CBRN filtration mode, and sets fan speeds.',
      'Carbon dioxide and oxygen levels respond over time to the population on site and to plant state. This is the home application of the environmental systems shift.',
    ],
  },
  pa: {
    title: 'Emergency Broadcast / Public Address',
    description: [
      'Emergency Broadcast selects zones, plays pre-recorded messages from the library as text with synthesized tone sequences, runs live tone tests and keeps the broadcast log.',
      'Seal drills and network isolation drive announcements automatically. Every broadcast is logged with its zones and originator.',
    ],
  },
  muster: {
    title: 'Muster Board',
    description: [
      'The Muster Board totals badge-reader muster by site, level and assembly point. A muster can be triggered from the board or by a drill.',
      'Totals are reconciled against posted staff and against personnel carried as DETACHED / UNPOSTED; differences stay on the board until they are accounted for.',
    ],
  },
  patch: {
    title: 'Hub Circuit Patch Panel',
    description: [
      'The Hub Circuit Patch Panel patches inter-site voice and data circuits, runs line tests and loopbacks and reports line quality.',
      'Hub link states from the panel feed the notification area of every workstation. Circuits are dead while the network is isolated.',
    ],
  },
};
