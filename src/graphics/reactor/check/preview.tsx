/**
 * Rendered check for @graphics/reactor. Dev-only: bundled by render.mjs, never
 * imported by the application. The window frame here is a stand-in for the shell.
 */
import type { ComponentChildren } from 'preact';
import { render } from 'preact';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import '../../../design/tokens.css';
import canonJson from '@canon';
import type { Canon } from '@core/canon-types';
import { Gauge, ReactorOneLine, ReadoutRow, SealStateIndicator, TelemetryChart, buildPlant, solve } from '../index';
import type { TelemetrySeries } from '../index';

const canon = canonJson as unknown as Canon;

function Win({
  id,
  title,
  status,
  children,
  w,
  h,
}: {
  id: string;
  title: string;
  status?: string;
  children: ComponentChildren;
  w?: number;
  h?: number;
}) {
  return (
    <div id={id} class="ck-win" style={{ width: w ? `${w}px` : undefined, height: h ? `${h}px` : undefined }}>
      <div class="ck-title">
        <span>{title}</span>
        <span class="ck-title__btns">
          <i>_</i>
          <i>x</i>
        </span>
      </div>
      <div class="ck-content">{children}</div>
      {status ? <div class="ck-status">{status}</div> : null}
    </div>
  );
}

/** Deterministic noise so renders are repeatable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function trend(seed: number, base: number, swing: number, noise: number, n = 288): number[] {
  const r = rng(seed);
  let drift = 0;
  return Array.from({ length: n }, (_, i) => {
    drift = drift * 0.96 + (r() - 0.5) * noise;
    return base + Math.sin((i / n) * Math.PI * 2 - 1.2) * swing + drift;
  });
}

const T0 = Date.UTC(2008, 4, 30, 0, 0, 0) / 1000;
const xs = Array.from({ length: 288 }, (_, i) => T0 + i * 300);

function Panel() {
  const plant = buildPlant(canon, 'RX-A03');
  if (!plant) return null;
  const s = solve(plant);
  const mw = s.totalMW;
  const rated = plant.reactor.electricMWe;
  const power: TelemetrySeries[] = [
    { label: 'STATION LOAD', unit: 'MW', data: [xs, trend(11, mw, mw * 0.06, 0.05)], digits: 2 },
    { label: 'UNIT G-1', unit: 'MW', data: [xs, trend(12, mw * 1.02, mw * 0.06, 0.05)], digits: 2 },
    { label: 'BUS A', unit: 'kV', data: [xs, trend(13, plant.mvKV, 0.04, 0.02)], digits: 2 },
  ];
  const air: TelemetrySeries[] = [
    { label: 'CO2 LEVEL 3', unit: 'ppm', data: [xs, trend(21, 720, 110, 14)], digits: 0 },
    { label: 'CO2 LEVEL 6', unit: 'ppm', data: [xs, trend(22, 640, 80, 12)], digits: 0 },
    { label: 'DIFF PRESS', unit: 'in wg', data: [xs, trend(23, 0.28, 0.02, 0.01)], digits: 2 },
  ];
  const water: TelemetrySeries[] = [
    { label: 'POTABLE TANK', unit: '%', data: [xs, trend(31, 81, 6, 0.6)], digits: 1 },
    { label: 'TREATMENT FLOW', unit: 'gpm', data: [xs, trend(32, 142, 30, 5)], digits: 0 },
  ];
  const seal: TelemetrySeries[] = [
    {
      label: 'RAIL LOCK 1 (0 SEALED / 1 CYCLING / 2 VENTED)',
      unit: 'state',
      stepped: true,
      digits: 0,
      data: [xs, xs.map((_, i) => (i > 96 && i < 99 ? 1 : i >= 99 && i < 104 ? 2 : i >= 104 && i < 107 ? 1 : i > 250 ? (i < 253 ? 1 : 2) : 0))],
    },
  ];
  return (
    <div class="ck-panel">
      <div class="ck-col">
        <fieldset class="ck-group">
          <legend>Power</legend>
          <div class="ck-gauges">
            <Gauge tag="JI-101" label="Unit output" value={s.genMW} min={0} max={Math.ceil(rated)} unit="MW" warn={rated * 0.8} alarm={rated * 0.95} />
            <Gauge tag="EI-110" label="Bus A volts" value={13.76} min={12} max={15} unit="kV" warn={{ lo: 13.1, hi: 14.5 }} alarm={{ lo: 12.4, hi: 14.9 }} />
            <Gauge tag="SI-101" label="Frequency" value={60.02} min={58} max={62} unit="Hz" kind="dial" warn={{ lo: 59.5, hi: 60.5 }} alarm={{ lo: 59, hi: 61 }} />
            <Gauge tag="LI-420" label="Diesel fuel" value={96.4} min={0} max={100} unit="%" kind="dial" warn={{ lo: 50 }} alarm={{ lo: 25 }} />
          </div>
        </fieldset>
        <fieldset class="ck-group">
          <legend>Air and water</legend>
          <div class="ck-gauges">
            <Gauge tag="AI-301" label="CO2 level 3" value={1140} min={0} max={2000} unit="ppm" warn={1000} alarm={1500} />
            <Gauge tag="AI-305" label="Oxygen" value={20.7} min={17} max={23} unit="%" warn={{ lo: 19.5, hi: 22 }} alarm={{ lo: 18.5, hi: 23 }} />
            <Gauge tag="LI-501" label="Potable tank" value={81.3} min={0} max={100} unit="%" warn={{ lo: 40 }} alarm={{ lo: 20 }} />
            <Gauge tag="PI-512" label="FW pump B" value={0} min={0} max={160} unit="psig" warn={{ lo: 60 }} alarm={{ lo: 30 }} />
          </div>
        </fieldset>
        <fieldset class="ck-group">
          <legend>Seal</legend>
          <div class="ck-seals">
            <SealStateIndicator state="SEALED" label="Envelope seal" />
            <SealStateIndicator state="CYCLING" label="Portal lock 2" />
            <SealStateIndicator state="VENTED" label="Rail lock 1" />
          </div>
        </fieldset>
      </div>
      <div class="ck-col ck-col--wide">
        <div class="ck-th">
          <span>Tag</span>
          <span>Point</span>
          <span>Value</span>
          <span>Unit</span>
          <span>State</span>
        </div>
        <div class="ck-rows">
          <ReadoutRow tag="JI-100" label="Station load" value={s.totalMW} digits={2} unit="MW" />
          <ReadoutRow tag="JI-101" label="Unit G-1 output" value={s.genMW} digits={2} unit="MW" />
          <ReadoutRow tag="XI-001" label="Reactor thermal power" value={78.0} unit="% RTP" status="DEGRADED" word="LIMITED" />
          <ReadoutRow tag="PI-512" label="Feedwater pump B discharge" value={0} unit="psig" status="FAULT" word="OUT OF SVC" />
          <ReadoutRow tag="XS-D1" label="Diesel generator DG-1" value="STBY" status="OFFLINE" word="STANDBY" />
          <ReadoutRow tag="52-U1" label="Utility tie breaker" value="OPEN" status="OFFLINE" word="ISOLATED" />
          <ReadoutRow tag="AI-301" label="Carbon dioxide, level 3" value={1140} digits={0} unit="ppm" status="DEGRADED" word="HIGH" />
          <ReadoutRow tag="FI-520" label="Water treatment flow" value={142} digits={0} unit="gpm" />
        </div>
        <div class="ck-charts">
          <div class="ck-chart">
            <div class="ck-cap">POWER, 24 H</div>
            <TelemetryChart series={power} height={160} />
          </div>
          <div class="ck-chart">
            <div class="ck-cap">AIR, 24 H</div>
            <TelemetryChart series={air} height={160} />
          </div>
          <div class="ck-chart">
            <div class="ck-cap">WATER, 24 H</div>
            <TelemetryChart series={water} height={140} />
          </div>
          <div class="ck-chart">
            <div class="ck-cap">SEAL STATE, 24 H</div>
            <TelemetryChart series={seal} height={118} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Sheet() {
  return (
    <div class="ck-sheet">
      <div id="contact" class="ck-contact">
        {canon.reactors.map((r) => (
          <div class="ck-cell">
            <div class="ck-celltitle">
              {r.id} {r.site} {r.status}
            </div>
            <ReactorOneLine reactorId={r.id} class="ck-fit" />
          </div>
        ))}
      </div>
      <Win
        id="gauges"
        title="ALPHA-03 ARCHIVE SITE TANGO - Telemetry"
        status="8 points  |  scan 5 s  |  last update 2355Z (1855 CDT) 30 MAY 2008"
        w={1400}
        h={900}
      >
        <Panel />
      </Win>
      {canon.reactors.map((r) => (
        <div id={`oneline-${r.id}`} class="ck-full">
          <ReactorOneLine reactorId={r.id} />
        </div>
      ))}
      <div id="oneline-live" class="ck-full">
        <ReactorOneLine reactorId="RX-A01" live={{ breakers: { '52-G1': 'OPEN', '52-BT': 'OPEN' }, loadMW: 9.2 }} />
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) render(<Sheet />, root);
