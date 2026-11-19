/**
 * Reactor console for one installation: identity, canon status and status note, derived
 * station instruments (from @graphics/reactor/model), the station one-line diagram, and the
 * TALLOW-controlled fuel block. Imports the reactor modules directly so uPlot (TelemetryChart)
 * stays out of this chunk.
 */
import { useMemo } from 'preact/hooks';
import { GroupBox, PropertyGrid, StatusLight } from '@design/index';
import { ReactorOneLine } from '@graphics/reactor/OneLine';
import { Gauge, ReadoutRow } from '@graphics/reactor/gauges';
import { buildPlant, solve } from '@graphics/reactor/model';
import type { Reactor } from '@core/canon-types';
import { canon, division, facility, fmtN, houseDate, siteReleased } from './data';
import { Bar, LinkButton, useRsv } from './parts';
import { workOrderPattern } from './workorders';

const WITHHELD_SITE = 'BETA SITE';

/** The status note with each work order number as a link into the work order lookup. */
export function NoteWithOrders({ note, onOrder }: { note: string; onOrder: (wo: string) => void }) {
  const re = workOrderPattern(canon.divisions.map((d) => d.id));
  const out: (string | { wo: string })[] = [];
  let last = 0;
  for (let m = re.exec(note); m; m = re.exec(note)) {
    if (m.index > last) out.push(note.slice(last, m.index));
    out.push({ wo: m[0] });
    last = m.index + m[0].length;
  }
  if (last < note.length) out.push(note.slice(last));
  return (
    <span>
      {out.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : (
          <LinkButton key={i} onClick={() => onOrder(p.wo)} title={`Look up citations of ${p.wo}`}>
            {p.wo}
          </LinkButton>
        ),
      )}
    </span>
  );
}

export function ReactorConsole({ reactor: r, onOrder, report }: { reactor: Reactor; onOrder: (wo: string) => void; report?: { docNo: string; date: string } }) {
  const { satisfies } = useRsv();
  const plant = useMemo(() => buildPlant(canon, r.id), [r.id]);
  const s = useMemo(() => (plant ? solve(plant) : null), [plant]);
  const released = siteReleased(r.site, satisfies);
  const tallow = satisfies('TALLOW');
  const f = facility(r.site);
  const fe = division('FE');
  const lr = division('LR');

  if (!plant || !s) return null;
  const limitMW = plant.limitPct !== null ? (r.electricMWe * plant.limitPct) / 100 : undefined;
  const dgCap = plant.dgCount * plant.dgRatingMW;
  const pctRated = (s.totalMW / r.electricMWe) * 100;

  return (
    <div class="rsv-stack">
      <div class="rsv-cols">
        <GroupBox title="Installation">
          <PropertyGrid
            rows={[
              { label: 'Unit', value: r.id, mono: true },
              { label: 'Designation', value: r.designation },
              { label: 'Type', value: r.type },
              {
                label: 'Site',
                mono: true,
                value: released ? `${r.site}${f?.codename ? ` ${f.codename}` : ''}` : <Bar len={r.site.length + (f?.codename?.length ?? 0)} rxKey="SEXTANT" />,
              },
              { label: 'Rating', value: `${fmtN(r.thermalMWt)} MWt / ${fmtN(r.electricMWe, r.electricMWe % 1 ? 1 : 0)} MWe`, mono: true },
              { label: 'Commissioned', value: houseDate(r.commissioned), mono: true },
              { label: 'Operating division', value: fe ? `${fe.name} (${fe.id})` : '' },
              { label: 'Drawing', value: `${plant.drawing.no} rev ${plant.drawing.rev}`, mono: true },
            ]}
          />
        </GroupBox>
        <GroupBox title="Unit status">
          <div class="rsv-status">
            <StatusLight status={r.status} />
            <p class="rsv-status__note">
              <NoteWithOrders note={r.statusNote} onOrder={onOrder} />
            </p>
            <p class="rsv-note">
              {report ? `Status as reported in ${report.docNo} of ${houseDate(report.date)}. ` : ''}Instrument values below are derived from the unit rating and the reported status.
            </p>
          </div>
        </GroupBox>
      </div>

      <GroupBox title="Station instruments">
        <div class="rsv-gauges">
          <Gauge
            tag="JI-101"
            label="Station load"
            value={s.totalMW}
            min={0}
            max={r.electricMWe}
            unit="MW"
            digits={2}
            {...(limitMW !== undefined ? { warn: limitMW * 0.95, alarm: limitMW } : {})}
          />
          <Gauge tag="JI-102" label="Unit G-1 output" value={s.genMW} min={0} max={r.electricMWe} unit="MW" digits={2} />
          <Gauge
            tag="JI-103"
            label="Load, % rated"
            kind="dial"
            value={pctRated}
            min={0}
            max={100}
            unit="%"
            digits={0}
            {...(plant.limitPct !== null ? { warn: plant.limitPct - 5, alarm: plant.limitPct } : {})}
          />
          <Gauge tag="JI-201" label="Diesel sets" value={s.dieselMW} min={0} max={dgCap} unit="MW" digits={2} />
          <Gauge tag="JI-301" label="Surface supply" value={s.surfaceMW} min={0} max={plant.surfaceMW} unit="MW" digits={2} />
        </div>
        <div class="rsv-readouts">
          <ReadoutRow tag="52-G1" label="Generator breaker" value={s.breakers['52-G1'] ?? ''} status={s.breakers['52-G1'] === 'CLOSED' ? 'NOMINAL' : 'OFFLINE'} word={s.breakers['52-G1']} />
          <ReadoutRow tag="BUS-A" label={`${plant.mvKV} kV switchgear bus A`} value={s.busA ? 'LIVE' : 'DEAD'} status={s.busA ? 'NOMINAL' : 'OFFLINE'} word={s.busA ? 'ENERGIZED' : 'DE-ENERGIZED'} />
          <ReadoutRow tag="BUS-B" label={`${plant.mvKV} kV switchgear bus B`} value={s.busB ? 'LIVE' : 'DEAD'} status={s.busB ? 'NOMINAL' : 'OFFLINE'} word={s.busB ? 'ENERGIZED' : 'DE-ENERGIZED'} />
          <ReadoutRow tag="ATS-A" label="Essential bus E-A source" value={s.atsA} status={s.atsA === 'NORMAL' ? 'NOMINAL' : 'DEGRADED'} word={s.atsA} />
          <ReadoutRow tag="ATS-B" label="Essential bus E-B source" value={s.atsB} status={s.atsB === 'NORMAL' ? 'NOMINAL' : 'DEGRADED'} word={s.atsB} />
          <ReadoutRow
            tag="DG"
            label={`Diesel sets running (of ${plant.dgCount})`}
            value={String(s.dgRunning.filter(Boolean).length)}
            status={s.dgRunning.some(Boolean) ? 'DEGRADED' : 'NOMINAL'}
            word={s.dgRunning.some(Boolean) ? 'RUNNING' : 'STANDBY'}
          />
          {plant.isAlpha ? (
            <ReadoutRow tag="52-B3" label="Rail traction feeder" value={s.rail ? 'LIVE' : 'SHED'} status={s.rail ? 'NOMINAL' : 'OFFLINE'} word={s.rail ? 'ENERGIZED' : 'SHED'} />
          ) : null}
        </div>
      </GroupBox>

      <GroupBox title={`Station electrical one-line diagram, ${plant.drawing.no}`}>
        <div class="rsv-drawing">
          <ReactorOneLine reactorId={r.id} siteMask={released ? undefined : WITHHELD_SITE} />
        </div>
      </GroupBox>

      <GroupBox title="Fuel and refuelling">
        <PropertyGrid
          rows={[
            { label: 'Core fuel inventory', value: tallow ? 'Released: see the plant record below' : <Bar len={28} rxKey="TALLOW" /> },
            { label: 'Refuelling schedule', value: tallow ? 'Released: see the plant record below' : <Bar len={22} rxKey="TALLOW" /> },
            { label: 'Burn-down planning figure', value: tallow ? 'Released: see the plant record below' : <Bar len={18} rxKey="TALLOW" /> },
            { label: 'Diesel fuel storage', value: plant.dieselDays !== null ? `${plant.dieselDays} days runtime (network standard)` : '', mono: false },
            { label: 'Data owner', value: lr ? `${lr.name} (${lr.id})` : '' },
          ]}
        />
      </GroupBox>
    </div>
  );
}
