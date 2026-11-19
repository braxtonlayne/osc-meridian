/**
 * Facility Video (MERIDIAN Facility Video client): the network's DVR client. Camera tree by
 * site and level (or by recorder unit and channel), a 1/4/9/16 video wall drawn by
 * @graphics/cctv from the shared plant state, PTZ presets on PTZ heads, playback of the
 * recorders' last hour, and video stills to print. Document routes under /cctv/.
 *
 * Shared key `cctv` (types.ts) holds PTZ head positions, the recorder journal and record gaps and
 * the still serial. Everything else on the pictures comes from other apps' keys (doors, drill,
 * dispatch, hoist, muster, isolation), read only.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { TargetedKeyboardEvent } from 'preact';
import { Dialog, DocumentView, MenuBar, MessageBox, Select, StatusBar, Toolbar, ToolbarButton, ToolbarSeparator, ToolbarSpacer, Tree } from '@design/index';
import type { MenuBarMenu, StatusPane, TreeNode } from '@design/index';
import { Icon } from '@graphics/icons';
import { ScanPage } from '@graphics/scan';
import { MarkingStrip as GMarkingStrip, Stamp } from '@graphics/banners';
import { Seal } from '@graphics/seal';
import { ErrorState, RefusalState } from '@graphics/states';
import { renderBlank, renderFrame } from '@graphics/cctv';
import type { AppProps, DocJson, DrillState, IsolationState } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { useServices } from '@core/services';
import { readableByTier4 } from '@core/docs';
import { formatInWorldDate, siteLocal, zulu } from '@core/session';
import { seg04 as seg04Signal } from '@narrative/engine';
import { SEG04_LOG_HOLD_MS } from '@narrative/seg04';
import { canonModel } from '@sim/transit-sim';
import type { DoorsState } from '@apps/doors/types';
import type { HoistState } from '@apps/hoist/types';
import type { MusterState } from '@apps/muster/types';
import type { DispatchState } from '@apps/dispatch/types';
import {
  CAMERA_COUNT,
  CAM_BY_ID,
  CC,
  SEG04_FAR,
  SEG04_NEAR,
  SITES,
  SITE_BY_ID,
  accessFor,
  canon,
  clampView,
  dvrStamp,
  eventsFor,
  fpsFor,
  frameFor,
  hhmmss,
  motionBetween,
  presetsFor,
  sceneOf,
  siteListed,
  stillNo,
  unitChannels,
  viewAt,
} from './model';
import type { Access, CamEntry, PlantView, RecEvent, Viewer } from './model';
import { CCTV_EMPTY } from './types';
import type { CctvState, PtzView } from './types';
import { printStill } from './print';
import './cctv.css';

type Layout = 1 | 4 | 9 | 16;
type TreeMode = 'site' | 'recorder';
const LAYOUTS: Layout[] = [1, 4, 9, 16];
const TITLE = CC.client.title;
const ISO_NONE: IsolationState = { level: 0, initiations: [], active: false, clearsAt: null };
const MUSTER_NONE: MusterState = { runs: [], seq: 0 };
const MODEL = canonModel();
const RETAIN_MS = CC.recorder.retentionMin * 60_000;
const markingLabel = (m: MarkingId) => canon.markings.find((x) => x.id === m)?.label ?? m;

function MarkingStrip({ marking }: { marking: MarkingId }) {
  const m = canon.markings.find((x) => x.id === marking);
  return m ? <GMarkingStrip marking={m} /> : null;
}

interface Pb {
  /** Playback position at `wall` (ms). */
  at: number;
  wall: number;
  speed: number;
  playing: boolean;
}

interface Box {
  title: string;
  body: string;
  reference?: string;
  kind: 'info' | 'error';
}

interface Still {
  no: string;
  image: string;
  cam: CamEntry;
  t: number;
  stamp: string;
  playback: boolean;
}

const pbAt = (pb: Pb, wall: number, now: number) => Math.max(now - RETAIN_MS, Math.min(now, pb.playing ? pb.at + (wall - pb.wall) * pb.speed : pb.at));

export default function App({ win, route }: AppProps) {
  const services = useServices();
  const acct = services.account.def.value;
  const operator = services.session.operatorId.value;
  const tierNow = services.session.tier.value;
  const comps = services.session.compartments.value;
  const viewer: Viewer = { def: acct, tier: tierNow, compartments: comps };
  const clearanceSig = `${tierNow}|${comps.join(',')}`;
  const tier4 = acct.tier === 4;
  const satisfies = (k: string) => services.clearance.satisfies(k as never);

  /* ---- shared plant state */
  const cctv = services.shared.get<CctvState>('cctv', CCTV_EMPTY).value;
  const iso = services.shared.get<IsolationState>('isolation', ISO_NONE).value;
  const drill = services.shared.get<DrillState | null>('drill', null).value;
  const dispatch = services.shared.get<DispatchState>('dispatch', []).value;
  const doors = services.shared.get<DoorsState | null>('doors', null).value;
  const hoist = services.shared.get<HoistState | null>('hoist', null).value;
  const muster = services.shared.get<MusterState>('muster', MUSTER_NONE).value;
  const s4 = seg04Signal.value;
  const plant: PlantView = { isolation: iso, drill, dispatch: Array.isArray(dispatch) ? dispatch : [], doors, hoist, muster, cctv: cctv?.v === 1 ? cctv : CCTV_EMPTY, seg04: s4, seg04HoldMs: SEG04_LOG_HOLD_MS, model: MODEL };
  const plantRef = useRef(plant);
  plantRef.current = plant;

  /* ---- view state */
  const sites = SITES.filter((s) => siteListed(viewer, s.facility));
  const ownSite = SITE_BY_ID.get(acct.site) ?? sites[0]!;
  const [layout, setLayout] = useState<Layout>(4);
  const [tiles, setTiles] = useState<(string | null)[]>(() => {
    const own = ownSite.cams.filter((c) => !c.unassigned && accessFor(viewer, c).allowed).map((c) => c.id);
    return Array.from({ length: 16 }, (_, i) => own[i] ?? null);
  });
  const [sel, setSel] = useState(0);
  const [treeMode, setTreeMode] = useState<TreeMode>('site');
  const [treeSel, setTreeSel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([`site:${ownSite.facility}`]);
  const [pb, setPb] = useState<Pb | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [still, setStill] = useState<Still | null>(null);
  const [message, setMessage] = useState('Connected.');
  const [now, setNow] = useState(() => Date.now());
  const [shown, setShown] = useState(true);
  const [doc, setDoc] = useState<DocJson | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  const isDocRoute = !!route && route.app === 'cctv' && route.family === 'cctv';
  const selId = tiles[sel] ?? null;
  const selCam = selId ? (CAM_BY_ID.get(selId) ?? null) : null;
  const selAccess: Access | null = selCam ? accessFor(viewer, selCam) : null;
  const tAt = pb ? pbAt(pb, now, now) : now;

  /* ---- visibility: render only while the window is shown */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const check = () => setShown(el.getClientRects().length > 0 && document.visibilityState === 'visible');
    const ro = new ResizeObserver(check);
    ro.observe(el);
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', check);
    };
  }, [isDocRoute]);

  /* ---- clock (1 Hz for the chrome; the video loop runs at the layout's rate) */
  useEffect(() => {
    if (!shown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [shown]);

  /* ---- video loop */
  const pbRef = useRef(pb);
  pbRef.current = pb;
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const viewerRef = useRef(viewer);
  viewerRef.current = viewer;
  useEffect(() => {
    if (!shown || isDocRoute) return;
    const fps = fpsFor(layout);
    const res = layout === 1 ? CC.recorder.singleRes : CC.recorder.multiRes;
    const q = { blockPx: CC.recorder.blockPx, blockMix: CC.recorder.blockMix, levels: CC.recorder.grayLevels };
    let tick = 0;
    const draw = () => {
      const wall = Date.now();
      const p = pbRef.current;
      const t = p ? pbAt(p, wall, wall) : wall;
      // tiles are refreshed in turn across the frame interval, as the recorder multiplexes them
      const n = layout;
      const per = Math.max(1, Math.ceil(n / 4));
      const start = (tick * per) % n;
      tick++;
      for (let k = 0; k < (n <= 4 ? n : per); k++) {
        const i = n <= 4 ? k : (start + k) % n;
        const cv = canvases.current[i];
        if (!cv) continue;
        if (cv.width !== res[0] || cv.height !== res[1]) {
          cv.width = res[0];
          cv.height = res[1];
        }
        const c = cv.getContext('2d');
        if (!c) continue;
        paintTile(c, res[0], res[1], tilesRef.current[i] ?? null, i, t, wall, !!p, p?.speed ?? 1, q);
      }
    };
    draw();
    // in larger layouts each tick paints a quarter of the tiles, so the tick runs four times as often
    const id = window.setInterval(draw, 1000 / fps / (layout <= 4 ? 1 : 4));
    return () => window.clearInterval(id);
  }, [shown, layout, isDocRoute]);

  function paintTile(c: CanvasRenderingContext2D, w: number, h: number, id: string | null, i: number, t: number, wall: number, playback: boolean, speed: number, q: { blockPx: number; blockMix: number; levels: number }) {
    const chLabel = `CH ${i + 1}`;
    if (!id) return renderBlank(c, w, h, ['NO VIDEO'], { title: chLabel, stamp: '', tags: [] }, 16);
    const cam = CAM_BY_ID.get(id);
    if (!cam) return renderBlank(c, w, h, ['NO VIDEO'], { title: chLabel, stamp: '', tags: [] }, 16);
    const site = SITE_BY_ID.get(cam.facility)!;
    const a = accessFor(viewerRef.current, cam);
    const stamp = dvrStamp(t, site.zone);
    if (!a.allowed) return renderBlank(c, w, h, ['NO PERMISSION'], { title: cam.osd, stamp, tags: [] });
    const scene = sceneOf(cam);
    const f = frameFor(cam, scene, t, wall, plantRef.current, acct.site, playback);
    const tags = playback ? [`PB x${speed}`, ...f.tags.filter((x) => x !== 'PB')] : f.tags;
    const osd = { title: cam.osd, stamp, tags };
    if (f.blank) {
      renderBlank(c, w, h, f.blank, osd);
      return;
    }
    renderFrame(c, w, h, scene, f.input, osd, q);
  }

  /* ---- recorder journal: isolation link changes (idempotent across tabs) */
  const isoNow = iso.active && (iso.clearsAt === null || iso.clearsAt > now) ? 1 : 0;
  useEffect(() => {
    const last = [...(cctv.journal ?? [])].reverse().find((j) => j.k === 'iso');
    if ((last?.v ?? 0) === isoNow) return;
    services.shared.update<CctvState>('cctv', CCTV_EMPTY, (prev) => {
      const l = [...prev.journal].reverse().find((j) => j.k === 'iso');
      if ((l?.v ?? 0) === isoNow) return prev;
      const cut = Date.now() - RETAIN_MS;
      return { ...prev, journal: [...prev.journal.filter((j) => j.at >= cut), { at: Date.now(), k: 'iso', v: isoNow }] };
    });
  }, [isoNow]);

  /* ---- segment 04: the platform recorders at both ends drop the interval */
  useEffect(() => {
    if (!s4) return;
    if (cctv.gaps.some((g) => g.camera === SEG04_NEAR && g.from === s4.start)) return;
    let created = false;
    services.shared.update<CctvState>('cctv', CCTV_EMPTY, (prev) => {
      if (prev.gaps.some((g) => g.camera === SEG04_NEAR && g.from === s4.start)) return prev;
      created = true;
      const to = s4.end + SEG04_LOG_HOLD_MS;
      const cut = Date.now() - RETAIN_MS;
      return {
        ...prev,
        gaps: [...prev.gaps.filter((g) => g.to >= cut), { camera: SEG04_NEAR, from: s4.start, to, note: CC.seg04.eventText, notified: true }, { camera: SEG04_FAR, from: s4.start, to, note: CC.seg04.eventText, notified: true }],
      };
    });
    if (!created) return;
    const msg = CC.mail.recordGap;
    if (acct.id === 'deputy') {
      if (!services.mail.delivered.value.includes(msg)) services.mail.deliver(msg, { slots: gapSlots(s4.start, s4.end) });
    } else if (!services.traces.all.value.some((x) => x.msgId === msg)) {
      services.traces.post({ to: 'deputy', kind: 'mail.deliver', msgId: msg, subject: `Recording suspended, ${SEG04_NEAR}` });
    }
  }, [s4?.start]);

  /* ---- segment 04 seen live on the wall */
  const seenSeg04 = useRef<number | null>(null);
  useEffect(() => {
    if (!s4 || pb || !shown || seenSeg04.current === s4.start) return;
    const on = tiles.slice(0, layout).find((id) => id === SEG04_NEAR || id === SEG04_FAR);
    if (!on || now < s4.start || now > s4.end) return;
    const cam = CAM_BY_ID.get(on)!;
    if (!accessFor(viewer, cam).allowed) return;
    seenSeg04.current = s4.start;
    services.audit.log('control', 'cctv:view', `Operator ${operator} had ${on} (${cam.facility} ${cam.location}) on the video wall during an unscheduled movement on rail segment 04.`, { camera: on, facility: cam.facility, seg04: '1', live: '1' });
  }, [now, s4?.start, tiles, layout, pb, shown]);

  /* ---- documents */
  const docAllowed = !isDocRoute || (!(tier4 && !readableByTier4(route!)) && (!route!.access || satisfies(route!.access.compartment ? `${route!.access.compartment}` : `T${route!.access.tier}`)));
  useEffect(() => {
    if (!isDocRoute) {
      setDoc(null);
      return;
    }
    if (!docAllowed) {
      services.audit.log('window.open', route!.docNo, `Operator ${operator} requested ${route!.docNo} in Facility Video. Request refused: ${tier4 ? 'Tier 4 access determination, DIR-0301' : `requires Tier ${route!.access?.tier ?? 3} access determination`}.`, { app: 'cctv', doc: route!.docNo });
      services.sound.play('error');
      return;
    }
    let live = true;
    setDoc(null);
    setDocErr(null);
    win.setBusy(true);
    services.docs
      .load(route!.id)
      .then((d) => {
        if (!live) return;
        setDoc(d);
        services.audit.log('doc.read', d.docNo, `Displayed ${d.docNo} (${markingLabel(d.marking)}) to operator ${operator} in Facility Video.`);
      })
      .catch((e: unknown) => live && setDocErr(e instanceof Error ? e.message : String(e)))
      .finally(() => live && win.setBusy(false));
    return () => {
      live = false;
      win.setBusy(false);
    };
  }, [route?.id, docAllowed, clearanceSig]);

  /* ---- title and marking */
  const marking: MarkingId = isDocRoute ? (docAllowed ? route!.marking : 'TSSCI-OSC') : 'TSSCI-OSC';
  useEffect(() => {
    if (isDocRoute) win.setTitle(route!.title, route!.docNo);
    else win.setTitle(selCam ? `${TITLE}: ${selCam.unassigned ? `${chLabel(selCam)} ${CC.unassigned.osdTitle}` : `${selCam.id} ${selCam.location}`}` : TITLE, '');
    win.setMarking(marking);
    win.setStatus(isDocRoute ? route!.docNo : pb ? 'PLAYBACK' : 'LIVE');
  }, [route?.id, selCam?.id, marking, !!pb]);

  /* ---- helpers */
  const timeSlot = (ms = Date.now()) => {
    const d = new Date(ms);
    return `${zulu(d)} (${siteLocal(d)})`;
  };
  function gapSlots(from: number, to: number): Record<string, string> {
    const near = CAM_BY_ID.get(SEG04_NEAR)!;
    return { date: formatInWorldDate(), from: timeSlot(from), to: timeSlot(to + SEG04_LOG_HOLD_MS), camera: near.id, unit: `${near.unit} CH${near.channel}`, location: near.location, far: SEG04_FAR, event: CC.seg04.eventText };
  }
  const deliverOnce = (msg: string, slots: Record<string, string>) => {
    if (!services.mail.delivered.value.includes(msg)) services.mail.deliver(msg, { slots });
  };
  const chLabel = (c: CamEntry) => `${c.unit} CH${String(c.channel).padStart(2, '0')}`;

  /* ---- refusals */
  function refuseCamera(cam: CamEntry, a: Access) {
    services.audit.log('window.open', `cctv:view`, `Operator ${operator} requested video from ${cam.id} (${cam.facility}, ${cam.location}) in Facility Video. Request refused: ${a.requirement ?? a.reason ?? 'not authorised'}`, { app: 'cctv', camera: cam.id, facility: cam.facility, tier: String(cam.tier) });
    setBox({ title: 'Video request refused', body: `${a.reason ?? ''} ${a.requirement ? `Requirement: ${a.requirement}` : ''}`.trim(), reference: `Ref ${CC.docs.rules} · Code VR-403`, kind: 'error' });
    setMessage(`${cam.id}: video request refused.`);
    const count = services.audit.entries.value.filter((e) => e.kind === 'window.open' && e.subject === 'cctv:view').length + 1;
    if (count >= CC.mail.restrictedAfter) deliverOnce(CC.mail.restricted, { date: formatInWorldDate(), time: timeSlot(), camera: cam.id, facility: cam.facility, location: cam.location, count: String(count), operator });
  }
  function refuseAction(title: string, body: string, action: string) {
    services.audit.log('window.open', `cctv:${action}`, `Operator ${operator} attempted ${title.toLowerCase()} in Facility Video. Refused: ${body}`, { app: 'cctv', action, camera: selCam?.id ?? '' });
    setBox({ title, body, reference: `Ref ${CC.docs.rules}`, kind: 'error' });
    setMessage(`${title}: refused.`);
  }

  /* ---- camera selection */
  function assign(camId: string, tile = sel) {
    const cam = CAM_BY_ID.get(camId);
    if (!cam) return;
    const a = accessFor(viewer, cam);
    if (!a.listed) return;
    if (!a.allowed) return refuseCamera(cam, a);
    setTiles((prev) => prev.map((x, i) => (i === tile ? camId : x)));
    setSel(tile);
    services.sound.play('shutter');
    setMessage(cam.unassigned ? `${chLabel(cam)} (${CC.unassigned.osdTitle}) on channel ${tile + 1}.` : `${cam.id} on channel ${tile + 1}. ${cam.facility}, ${cam.location}.`);
    if (cam.unassigned) {
      services.audit.log('control', 'cctv:view', `Operator ${operator} displayed recorder channel ${chLabel(cam)} (${cam.facility}), which has no camera in the camera schedule.`, { camera: cam.id, facility: cam.facility, unit: cam.unit, channel: String(cam.channel), unassigned: '1' });
    }
  }
  function selectTile(i: number) {
    if (i < 0 || i >= layout) return;
    setSel(i);
    const id = tiles[i];
    if (id) setTreeSel(`cam:${id}`);
  }
  function clearTile() {
    setTiles((prev) => prev.map((x, i) => (i === sel ? null : x)));
    services.sound.play('button');
    setMessage(`Channel ${sel + 1} cleared.`);
  }
  function setLayoutTo(l: Layout) {
    setLayout(l);
    if (sel >= l) setSel(0);
    services.sound.play('button');
    setMessage(`${l === 1 ? 'Single' : `${l}-way`} layout, ${fpsFor(l)} frames per second per channel.`);
  }
  function fullscreen(i: number) {
    if (layout === 1) {
      setLayoutTo(4);
      return;
    }
    const id = tiles[i];
    if (!id) return;
    setTiles((prev) => {
      const next = [...prev];
      next[i] = prev[0] ?? null;
      next[0] = id;
      return next;
    });
    setSel(0);
    setLayoutTo(1);
  }
  function fillSite(fac: string) {
    const s = SITE_BY_ID.get(fac);
    if (!s) return;
    const ok = s.cams.filter((c) => !c.unassigned && accessFor(viewer, c).allowed).map((c) => c.id);
    if (!ok.length) {
      const c = s.cams.find((x) => !x.unassigned);
      if (c) refuseCamera(c, accessFor(viewer, c));
      return;
    }
    setTiles(Array.from({ length: 16 }, (_, i) => ok[i] ?? null));
    setSel(0);
    services.sound.play('shutter');
    setMessage(`${fac}: ${Math.min(ok.length, 16)} of ${s.cams.filter((c) => !c.unassigned).length} cameras on the wall.`);
  }

  /* ---- PTZ */
  const ptzRec = selCam ? plant.cctv.ptz[selCam.id] : undefined;
  const selView = selCam ? viewAt(selCam, ptzRec, now) : null;
  const presets = selCam ? presetsFor(selCam) : [];
  function canSteer(action: string): boolean {
    if (!selCam || !selAccess?.allowed) return false;
    if (!selCam.ptz) {
      refuseAction('Camera control', `${selCam.id} is a fixed camera. It has no pan, tilt or zoom.`, action);
      return false;
    }
    if (pb) {
      refuseAction('Camera control', 'Camera control is not available in playback. Return to live view first.', action);
      return false;
    }
    if (!selAccess.steer) {
      refuseAction('Camera control', `${acct.auditReader ? 'Review access is view only.' : `Control of ${selCam.facility} cameras is held by the site's security control room.`} The camera was not moved.`, action);
      return false;
    }
    return true;
  }
  function steer(target: PtzView, preset: number, action: 'preset' | 'ptz', words: string) {
    if (!selCam || !selView) return;
    const t = Date.now();
    const from = viewAt(selCam, plant.cctv.ptz[selCam.id], t).view;
    const v = clampView(target);
    services.shared.update<CctvState>('cctv', CCTV_EMPTY, (prev) => ({ ...prev, ptz: { ...prev.ptz, [selCam.id]: { ...v, preset, from, at: t, by: acct.id } } }));
    services.sound.play('button');
    services.audit.log('control', `cctv:${action}`, `Operator ${operator} ${words} camera ${selCam.id} (${selCam.facility}, ${selCam.location}) from Facility Video.`, {
      camera: selCam.id,
      facility: selCam.facility,
      preset: String(preset),
      yaw: v.yaw.toFixed(0),
      pitch: v.pitch.toFixed(0),
      zoom: v.zoom.toFixed(2),
    });
    setMessage(`${selCam.id}: ${preset ? `preset ${preset} ${presets.find((p) => p.n === preset)?.name ?? ''}` : 'moved'}.`);
    const own = selCam.facility === acct.site;
    deliverOnce(tier4 ? CC.mail.ptzSite : CC.mail.ptzNetwork, { date: formatInWorldDate(), time: timeSlot(t), camera: selCam.id, facility: selCam.facility, location: selCam.location, operator, own: own ? 'yes' : 'no' });
  }
  function recall(n: number) {
    if (!canSteer('preset')) return;
    const p = presets.find((x) => x.n === n);
    if (!p) return refuseAction('Preset', `Preset ${n} is not stored on ${selCam!.id}.`, 'preset');
    steer({ yaw: p.yaw, pitch: p.pitch, zoom: p.zoom }, n, 'preset', `recalled preset ${n} (${p.name}) on`);
  }
  function nudge(dYaw: number, dPitch: number, dZoom: number) {
    if (!canSteer('ptz') || !selView) return;
    const s = CC.recorder.ptzStepDeg / selView.view.zoom;
    const v = selView.view;
    const words = dZoom ? (dZoom > 0 ? 'zoomed in' : 'zoomed out') : dYaw ? `panned ${dYaw > 0 ? 'right' : 'left'}` : `tilted ${dPitch > 0 ? 'up' : 'down'}`;
    steer({ yaw: v.yaw + dYaw * s, pitch: v.pitch + dPitch * s, zoom: v.zoom + dZoom * CC.recorder.zoomStep }, 0, 'ptz', words);
  }

  /* ---- playback */
  function startPlayback(back = 5) {
    if (isDocRoute) win.navigate('/cctv');
    const t = Date.now();
    setPb({ at: t - back * 60_000, wall: t, speed: 1, playing: true });
    services.sound.play('button');
    const on = tiles.slice(0, layout).filter(Boolean) as string[];
    services.audit.log('control', 'cctv:playback', `Operator ${operator} retrieved recorded video from ${on.length} channel${on.length === 1 ? '' : 's'} in Facility Video (${on.slice(0, 4).join(', ')}${on.length > 4 ? ', ...' : ''}).`, { cameras: on.join(','), from: new Date(t - back * 60_000).toISOString() });
    setMessage(`Playback from ${back} min ago.`);
  }
  function live() {
    setPb(null);
    services.sound.play('button');
    setMessage('Live view.');
  }
  const pbSet = (fn: (p: Pb, at: number) => Pb) =>
    setPb((p) => {
      if (!p) return p;
      const w = Date.now();
      return fn(p, pbAt(p, w, w));
    });
  const playPause = () => (pb ? pbSet((p, at) => ({ ...p, at, wall: Date.now(), playing: !p.playing })) : startPlayback());
  const seek = (to: number) => pbSet((p) => ({ ...p, at: Math.max(Date.now() - RETAIN_MS, Math.min(Date.now(), to)), wall: Date.now() }));
  const jump = (sec: number) => pbSet((p, at) => ({ ...p, at: Math.max(Date.now() - RETAIN_MS, Math.min(Date.now(), at + sec * 1000)), wall: Date.now() }));
  const setSpeed = (speed: number) => pbSet((p, at) => ({ ...p, at, wall: Date.now(), speed }));

  const events: RecEvent[] = useMemo(() => {
    if (!pb || !selCam || !selAccess?.allowed) return [];
    const to = Date.now();
    const from = to - RETAIN_MS;
    return eventsFor(selCam, from, to, plant, motionBetween(selCam, from, to)).filter((e) => e.at <= to);
  }, [!!pb, selCam?.id, Math.floor(now / 15000), cctv, doors, drill, dispatch]);

  /* ---- stills */
  function snapshot() {
    if (!selCam || !selAccess?.allowed) {
      setBox({ title: 'Video still', body: 'Select a channel showing video first.', kind: 'info' });
      return;
    }
    const cv = canvases.current[sel];
    if (!cv) return;
    const site = SITE_BY_ID.get(selCam.facility)!;
    const image = cv.toDataURL('image/png');
    services.sound.play('shutter');
    setStill({ no: stillNo(plant.cctv.stills + 1), image, cam: selCam, t: tAt, stamp: dvrStamp(tAt, site.zone), playback: !!pb });
  }
  function printSnapshot(s: Still) {
    let serial = 0;
    services.shared.update<CctvState>('cctv', CCTV_EMPTY, (prev) => {
      serial = prev.stills + 1;
      return { ...prev, stills: serial };
    });
    const no = stillNo(serial || plant.cctv.stills + 1);
    const site = SITE_BY_ID.get(s.cam.facility)!;
    services.sound.play('print');
    services.audit.log('control', 'cctv:print', `Operator ${operator} printed video still ${no} from ${s.cam.id} (${s.cam.facility}, ${s.cam.location}), ${s.playback ? 'recorded' : 'live'} picture of ${s.stamp} site time.`, {
      still: no,
      camera: s.cam.id,
      facility: s.cam.facility,
      at: new Date(s.t).toISOString(),
      playback: s.playback ? '1' : '0',
    });
    void printStill({
      stillNo: no,
      image: s.image,
      markingLabel: markingLabel('TSSCI-OSC'),
      rows: [
        ['Camera', s.cam.unassigned ? CC.unassigned.osdTitle : `${s.cam.id}, ${s.cam.location}`],
        ['Facility', s.cam.facility],
        ['Recorder', chLabel(s.cam)],
        ['Picture time', `${s.stamp} site time ${site.zone.abbr} (${hhmmss(s.t, { abbr: 'Z', offsetH: 0 })}Z)`],
        ['Source', s.playback ? 'Recorded video (playback)' : 'Live video'],
        ['Printed by', `${operator}, ${formatInWorldDate()} ${timeSlot()}`],
      ],
      footer: `${CC.client.product} ${CC.client.release}. Video stills are controlled records under ${CC.docs.rules}.`,
    });
    deliverOnce(tier4 ? CC.mail.printSite : CC.mail.printNetwork, { date: formatInWorldDate(), time: timeSlot(), still: no, camera: s.cam.unassigned ? CC.unassigned.osdTitle : s.cam.id, facility: s.cam.facility, location: s.cam.unassigned ? chLabel(s.cam) : s.cam.location, operator });
    setStill(null);
    setMessage(`Video still ${no} sent to the printer.`);
  }

  /* ---- documents */
  const openDoc = (docNo: string) => {
    const r = services.docs.byDocNo(docNo);
    if (r) win.navigate(r.route);
    else setBox({ title: 'Document', body: `${docNo} is not held in the document store at this workstation.`, kind: 'error', reference: 'Ref OSC-DIR-0319' });
  };
  const goHome = () => win.navigate('/cctv');

  /* ---- tree */
  const camNode = (c: CamEntry): TreeNode => {
    const a = accessFor(viewer, c);
    return { id: `cam:${c.id}`, label: c.unassigned ? `CH${String(c.channel).padStart(2, '0')}  ${CC.unassigned.osdTitle}` : `${c.id}  ${c.location}`, meta: a.allowed ? (c.ptz ? 'PTZ' : undefined) : 'no access', icon: <Icon id="cctv" size={16} /> };
  };
  const nodes: TreeNode[] = sites.map((s) => {
    const ok = s.cams.filter((c) => !c.unassigned && accessFor(viewer, c).allowed).length;
    const total = s.cams.filter((c) => !c.unassigned).length;
    const children: TreeNode[] =
      treeMode === 'site'
        ? s.levels.map((l) => ({ id: `lvl:${s.facility}:${l.n}`, label: l.label, children: s.cams.filter((c) => !c.unassigned && c.level === l.n).map(camNode) }))
        : s.units.map((u) => ({
            id: `unit:${s.facility}:${u}`,
            label: u,
            meta: CC.client.recorderModel,
            children: unitChannels(s, u).map(({ channel, cam }) => (cam ? { ...camNode(cam), label: cam.unassigned ? camNode(cam).label : `CH${String(channel).padStart(2, '0')}  ${cam.id}` } : { id: `none:${u}:${channel}`, label: `CH${String(channel).padStart(2, '0')}  (no camera)`, disabled: true })),
          }));
    return { id: `site:${s.facility}`, label: s.facility, meta: `${ok}/${total}`, icon: <Icon id="camera-grid" size={16} />, children };
  });
  const onTreeActivate = (n: TreeNode) => {
    if (n.id.startsWith('cam:')) {
      if (isDocRoute) goHome();
      assign(n.id.slice(4));
      setTreeOpen(false);
    } else if (n.id.startsWith('site:')) {
      if (isDocRoute) goHome();
      fillSite(n.id.slice(5));
    }
  };

  /* ---- menus */
  const ptzMenu = presets.length
    ? presets.map((p) => ({ label: `Preset &${p.n}  ${p.name}`, shortcut: String(p.n), radio: true, checked: selView?.preset === p.n, onSelect: () => recall(p.n) }))
    : [{ label: 'No presets (fixed camera)', disabled: true }];
  const menus: MenuBarMenu[] = [
    {
      label: '&File',
      items: [
        { label: '&Video still...', shortcut: 'Ctrl+S', onSelect: snapshot },
        { label: '&Print video still...', shortcut: 'Ctrl+P', onSelect: snapshot },
        { label: '&Export clip...', onSelect: () => refuseAction('Export', 'Export of recorded video to file or removable media is not permitted from a MERIDIAN workstation. Recorded video is released by the site security office on a records request.', 'export') },
        { separator: true },
        { label: '&Close', shortcut: 'Alt+F4', onSelect: () => win.close() },
      ],
    },
    {
      label: '&View',
      items: [
        ...LAYOUTS.map((l, i) => ({ label: l === 1 ? '&Single camera' : `&${l}-way`, shortcut: `Ctrl+${i + 1}`, radio: true, checked: layout === l, onSelect: () => (isDocRoute && goHome(), setLayoutTo(l)) })),
        { separator: true },
        { label: 'Cameras by &site and level', radio: true, checked: treeMode === 'site', onSelect: () => setTreeMode('site') },
        { label: 'Cameras by &recorder', radio: true, checked: treeMode === 'recorder', onSelect: () => setTreeMode('recorder') },
        { separator: true },
        { label: '&Next channel', shortcut: 'PgDn', onSelect: () => selectTile((sel + 1) % layout) },
        { label: 'Pre&vious channel', shortcut: 'PgUp', onSelect: () => selectTile((sel + layout - 1) % layout) },
        { label: '&Clear channel', shortcut: 'Del', onSelect: clearTile },
      ],
    },
    {
      label: '&Site',
      items: sites.map((s) => ({ label: s.facility === acct.site ? `${s.facility} (own site)` : s.facility, onSelect: () => (isDocRoute && goHome(), fillSite(s.facility)) })),
    },
    {
      label: '&Camera',
      items: [
        ...ptzMenu,
        { separator: true },
        { label: 'Pan &left', shortcut: 'Left', disabled: !selCam?.ptz, onSelect: () => nudge(-1, 0, 0) },
        { label: 'Pan &right', shortcut: 'Right', disabled: !selCam?.ptz, onSelect: () => nudge(1, 0, 0) },
        { label: 'Tilt &up', shortcut: 'Up', disabled: !selCam?.ptz, onSelect: () => nudge(0, 1, 0) },
        { label: 'Tilt &down', shortcut: 'Down', disabled: !selCam?.ptz, onSelect: () => nudge(0, -1, 0) },
        { label: 'Zoom &in', shortcut: '+', disabled: !selCam?.ptz, onSelect: () => nudge(0, 0, 1) },
        { label: 'Zoom &out', shortcut: '-', disabled: !selCam?.ptz, onSelect: () => nudge(0, 0, -1) },
      ],
    },
    {
      label: '&Playback',
      items: [
        { label: pb ? '&Pause' : '&Play recorded video', shortcut: 'Space', onSelect: playPause },
        { label: 'Back &1 minute', disabled: !pb, onSelect: () => jump(-60) },
        { label: '&Forward 1 minute', disabled: !pb, onSelect: () => jump(60) },
        { label: 'Go to &start of recording', disabled: !pb, onSelect: () => seek(Date.now() - RETAIN_MS) },
        { separator: true },
        ...CC.recorder.playbackSpeeds.map((s) => ({ label: `Speed x${s}`, radio: true, disabled: !pb, checked: pb?.speed === s, onSelect: () => setSpeed(s) })),
        { separator: true },
        { label: '&Live view', shortcut: 'Esc', disabled: !pb, onSelect: live },
      ],
    },
    {
      label: '&Help',
      items: [
        { label: `Operating instructions (${CC.docs.instructions})`, shortcut: 'F1', onSelect: () => openDoc(CC.docs.instructions) },
        { label: `Viewing rules (${CC.docs.rules})`, onSelect: () => openDoc(CC.docs.rules) },
        { separator: true },
        {
          label: `&About ${TITLE}`,
          onSelect: () =>
            setBox({
              title: `About ${TITLE}`,
              kind: 'info',
              body: `${CC.client.product} ${CC.client.release}. ${CAMERA_COUNT} cameras on ${SITES.reduce((n, s) => n + s.units.length, 0)} ${CC.client.recorderModel} recorders at ${SITES.length} sites, ${CC.recorder.retentionMin} minutes retrievable. Contract ${CC.client.contract}; maintained by ${CC.client.maintainer}.`,
            }),
        },
      ],
    },
  ];

  /* ---- keyboard */
  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>) => {
    const tgt = e.target as HTMLElement;
    const inTree = !!tgt.closest('.cctv-tree');
    if (e.ctrlKey && !e.altKey && /^[1-4]$/.test(e.key)) {
      e.preventDefault();
      setLayoutTo(LAYOUTS[Number(e.key) - 1]!);
    } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      snapshot();
    } else if (e.key === 'F1') {
      e.preventDefault();
      openDoc(CC.docs.instructions);
    } else if (inTree || isDocRoute || e.ctrlKey || e.altKey) {
      return;
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      selectTile((sel + 1) % layout);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      selectTile((sel + layout - 1) % layout);
    } else if (e.key === 'Delete') {
      clearTile();
    } else if (e.key === ' ' && tgt.closest('.cctv-wall')) {
      e.preventDefault();
      playPause();
    } else if (e.key === 'Escape' && pb) {
      live();
    } else if (tgt.closest('.cctv-wall') && selCam?.ptz) {
      const k: Record<string, () => void> = { ArrowLeft: () => nudge(-1, 0, 0), ArrowRight: () => nudge(1, 0, 0), ArrowUp: () => nudge(0, 1, 0), ArrowDown: () => nudge(0, -1, 0), '+': () => nudge(0, 0, 1), '=': () => nudge(0, 0, 1), '-': () => nudge(0, 0, -1) };
      if (k[e.key]) {
        e.preventDefault();
        k[e.key]!();
      } else if (/^[1-9]$/.test(e.key)) recall(Number(e.key));
    } else if (tgt.closest('.cctv-wall') && pb && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      jump(e.key === 'ArrowLeft' ? -10 : 10);
    }
  };

  /* ---- status bar */
  const selSite = selCam ? SITE_BY_ID.get(selCam.facility) : null;
  const panes: StatusPane[] = [
    { id: 'msg', fill: true, content: message },
    { id: 'cam', width: 170, mono: true, label: 'Channel', content: selCam ? chLabel(selCam) : `CH ${sel + 1}` },
    { id: 'acc', width: 190, label: 'Access', content: selAccess ? (selAccess.allowed ? (selAccess.steer ? `${selAccess.basis}, control` : `${selAccess.basis}, view`) : 'refused') : '--' },
    { id: 'mode', width: 200, mono: true, label: 'Mode', content: pb ? `PB x${pb.speed} ${hhmmss(tAt, selSite?.zone ?? ownSite.zone)}${pb.playing ? '' : ' PAUSE'}` : `LIVE ${fpsFor(layout)} FPS` },
    { id: 'mk', width: 150, label: 'Marking', content: markingLabel(marking) },
  ];

  /* ---- body */
  let body;
  if (isDocRoute) {
    if (!docAllowed) {
      body = (
        <RefusalState
          authority={tier4 ? 'Facilities Engineering' : 'Classification Control, Office of Internal Assurance'}
          reference={tier4 ? 'DIR-0301' : 'OSC-DIR-0412'}
          reason={tier4 ? 'Requires Tier 3 access determination.' : `Requires Tier ${route!.access?.tier ?? 3} access determination. Display of ${route!.docNo} to this operator is not authorised.`}
          docNo={route!.docNo}
        />
      );
    } else if (docErr) {
      body = <ErrorState code="RD-DOC-0404" title="Record not available" body={`${route!.docNo} could not be retrieved from the document store.`} detail={docErr} />;
    } else if (!doc) {
      body = <p class="cctv-note">Retrieving {route!.docNo}.</p>;
    } else {
      body = (
        <div class="cctv-docpad">
          <DocumentView
            doc={doc}
            markings={canon.markings}
            onNavigate={(r) => services.openRoute(r)}
            onRedactionHover={(i) => services.audit.log('redaction.hover', doc.docNo, `Operator ${operator} examined withheld material in ${doc.docNo} (${i.auth} ${i.ref}). No release was made.`)}
            slots={{ ScanPage: ScanPage as never, MarkingStrip, Seal: Seal as never, Stamp: Stamp as never }}
          />
        </div>
      );
    }
  } else {
    const cols = Math.sqrt(layout);
    const span = 60 * 60_000;
    const from = now - span;
    body = (
      <div class={`cctv-body${treeOpen ? ' cctv-body--tree' : ''}`}>
        <aside class="cctv-side" aria-label="Cameras">
          <div class="cctv-tree">
            <Tree
              nodes={nodes}
              label="Cameras"
              selectedId={treeSel}
              onSelect={(n) => setTreeSel(n.id)}
              onActivate={onTreeActivate}
              expanded={expanded}
              onExpandedChange={setExpanded}
            />
          </div>
          <div class="cctv-ptz" aria-label="Camera control">
            <div class="cctv-ptz-head">{selCam ? (selCam.ptz ? `PTZ  ${selCam.id}` : `${selCam.unassigned ? CC.unassigned.osdTitle : selCam.id}  fixed`) : 'No camera'}</div>
            <div class="cctv-ptz-pad">
              <span />
              <button type="button" class="cctv-btn" disabled={!selCam?.ptz} onClick={() => nudge(0, 1, 0)} aria-label="Tilt up">
                Up
              </button>
              <span />
              <button type="button" class="cctv-btn" disabled={!selCam?.ptz} onClick={() => nudge(-1, 0, 0)} aria-label="Pan left">
                Left
              </button>
              <button type="button" class="cctv-btn" disabled={!selCam?.ptz} onClick={() => recall(1)} aria-label="Preset 1, home">
                Home
              </button>
              <button type="button" class="cctv-btn" disabled={!selCam?.ptz} onClick={() => nudge(1, 0, 0)} aria-label="Pan right">
                Right
              </button>
              <button type="button" class="cctv-btn" disabled={!selCam?.ptz} onClick={() => nudge(0, 0, -1)} aria-label="Zoom out">
                Wide
              </button>
              <button type="button" class="cctv-btn" disabled={!selCam?.ptz} onClick={() => nudge(0, -1, 0)} aria-label="Tilt down">
                Down
              </button>
              <button type="button" class="cctv-btn" disabled={!selCam?.ptz} onClick={() => nudge(0, 0, 1)} aria-label="Zoom in">
                Tele
              </button>
            </div>
            <div class="cctv-presets">
              {presets.map((p) => (
                <button type="button" key={p.n} class={`cctv-btn${selView?.preset === p.n ? ' is-on' : ''}`} onClick={() => recall(p.n)} title={`Preset ${p.n}`}>
                  {p.n} {p.name}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <section class="cctv-center" aria-label="Video">
          <div class={`cctv-wall cctv-wall--${layout}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} tabIndex={0} aria-label={`Video wall, ${layout === 1 ? 'single camera' : `${layout} channels`}`}>
            {Array.from({ length: layout }, (_, i) => (
              <div
                key={i}
                class={`cctv-tile${i === sel ? ' is-sel' : ''}`}
                onClick={() => selectTile(i)}
                onDblClick={() => fullscreen(i)}
                role="button"
                aria-pressed={i === sel}
                aria-label={`Channel ${i + 1}${tiles[i] ? `, ${tiles[i]}` : ', empty'}`}
              >
                <canvas ref={(el) => {
                    canvases.current[i] = el;
                  }} class="cctv-canvas" />
              </div>
            ))}
          </div>
          {pb ? (
            <div class="cctv-pb" aria-label="Playback">
              <div class="cctv-pb-bar">
                <ToolbarButton label={pb.playing ? 'Pause' : 'Play'} icon={<Icon id={pb.playing ? 'pause' : 'play'} size={16} />} onClick={playPause} />
                <ToolbarButton label="-1 min" icon={<Icon id="rewind" size={16} />} onClick={() => jump(-60)} />
                <ToolbarButton label="+1 min" onClick={() => jump(60)} />
                <Select label="Speed" layout="inline" value={String(pb.speed)} options={CC.recorder.playbackSpeeds.map((s) => ({ value: String(s), label: `x${s}` }))} onChange={(v) => setSpeed(Number(v))} />
                <span class="cctv-pb-time">{selSite ? dvrStamp(tAt, selSite.zone) : dvrStamp(tAt, ownSite.zone)}</span>
                <ToolbarButton label="Live" icon={<Icon id="record" size={16} />} onClick={live} />
              </div>
              <div
                class="cctv-timeline"
                role="slider"
                tabIndex={0}
                aria-label="Recording position"
                aria-valuemin={0}
                aria-valuemax={CC.recorder.retentionMin}
                aria-valuenow={Math.round((tAt - from) / 60_000)}
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  seek(from + ((e.clientX - r.left) / r.width) * span);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    jump(e.key === 'ArrowLeft' ? -60 : 60);
                  }
                }}
              >
                {events.map((ev, k) => (
                  <span key={k} class={`cctv-mark cctv-mark--${ev.kind === 'MOTION' ? 'm' : ev.kind === 'GAP' ? 'g' : 'e'}`} style={{ left: `${((ev.at - from) / span) * 100}%` }} title={`${hhmmss(ev.at, selSite!.zone)} ${ev.text}`} />
                ))}
                {plant.cctv.gaps
                  .filter((g) => g.camera === selCam?.id && g.to >= from)
                  .map((g, k) => (
                    <span key={`g${k}`} class="cctv-gap" style={{ left: `${(Math.max(0, g.from - from) / span) * 100}%`, width: `${((Math.min(now, g.to) - Math.max(from, g.from)) / span) * 100}%` }} />
                  ))}
                <span class="cctv-cursor" style={{ left: `${((tAt - from) / span) * 100}%` }} />
              </div>
              <ul class="cctv-events" aria-label="Recorder events">
                {events.length === 0 ? <li class="cctv-dim">No events recorded on this channel in the last {CC.recorder.retentionMin} minutes.</li> : null}
                {events
                  .filter((e) => e.kind !== 'MOTION' || events.length < 60)
                  .slice(-60)
                  .reverse()
                  .map((ev, k) => (
                    <li key={k}>
                      <button type="button" class="cctv-ev" onClick={() => seek(ev.at - 3000)}>
                        <span class="cctv-ev-t">{hhmmss(ev.at, selSite!.zone)}</span>
                        <span class="cctv-ev-k">{ev.kind}</span>
                        <span>{ev.text}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div class="cctv" ref={rootRef} onKeyDown={onKeyDown} data-clearance={clearanceSig}>
      <MenuBar menus={menus} label={`${TITLE} menu`} />
      <Toolbar label={`${TITLE} toolbar`}>
        <ToolbarButton label="Cameras" icon={<Icon id="camera-grid" size={16} />} pressed={treeOpen} title="Show the camera list (handheld)" onClick={() => setTreeOpen(!treeOpen)} />
        {LAYOUTS.map((l, i) => (
          <ToolbarButton key={l} label={l === 1 ? '1' : String(l)} pressed={!isDocRoute && layout === l} title={`${l === 1 ? 'Single camera' : `${l}-way`} (Ctrl+${i + 1})`} onClick={() => (isDocRoute && goHome(), setLayoutTo(l))} />
        ))}
        <ToolbarSeparator />
        <ToolbarButton label="Live" icon={<Icon id="record" size={16} />} pressed={!isDocRoute && !pb} onClick={() => (isDocRoute ? goHome() : pb ? live() : undefined)} />
        <ToolbarButton label="Playback" icon={<Icon id="rewind" size={16} />} pressed={!!pb} onClick={() => (pb ? playPause() : startPlayback())} />
        <ToolbarButton label="Still" icon={<Icon id="print" size={16} />} title="Video still (Ctrl+S)" onClick={snapshot} />
        <ToolbarSpacer />
        <ToolbarButton label="Instructions" pressed={isDocRoute && route?.docNo === CC.docs.instructions} onClick={() => openDoc(CC.docs.instructions)} />
        <ToolbarButton label="Rules" pressed={isDocRoute && route?.docNo === CC.docs.rules} onClick={() => openDoc(CC.docs.rules)} />
      </Toolbar>
      <main class="cctv-main">{body}</main>
      <StatusBar panes={panes} />
      {still ? (
        <Dialog
          open
          title={`Video still ${still.no}`}
          kind="info"
          icon={<Icon id="cctv" size={32} />}
          reference={`${still.cam.unassigned ? CC.unassigned.osdTitle : still.cam.id} · ${chLabel(still.cam)} · ${still.stamp}`}
          buttons={[
            { label: '&Print', value: 'print', isDefault: true },
            { label: '&Close', value: 'close', isCancel: true },
          ]}
          onClose={(v) => (v === 'print' ? printSnapshot(still) : setStill(null))}
        >
          <img class="cctv-still" src={still.image} alt={`Video still from ${still.cam.id}`} />
        </Dialog>
      ) : null}
      {box ? (
        <MessageBox open title={box.title} kind={box.kind} reference={box.reference} onOpen={(k) => k === 'error' && services.sound.play('error')} onClose={() => setBox(null)}>
          {box.body}
        </MessageBox>
      ) : null}
    </div>
  );
}
