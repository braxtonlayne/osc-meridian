/** Strike app: the estimate view (inputs, national map with point cursor, local plot, results). */
import type { ComponentChildren } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import { geoCircle, geoPath } from 'd3-geo';
import type { Facility, FacilityId } from '@core/canon-types';
import { Button, DataTable, GroupBox, Redaction, Select, StatusLight, TextField, type Column } from '@design/index';
import { UsMap, MarkerGlyph } from '@graphics/map';
import { LocalPlot, spanFor } from '@graphics/strike';
import { compass, destination, fmtCoord, type Evaluation, type Pt, type SiteResult } from './model';
import { S, canon, classDef, conditionStatus, depthBand, fmtInt, fmtKt, fmtMi, fmtPsi, fmtRatio, frag, useSize } from './shared';

export type ResultRow = { kind: 'site'; r: SiteResult } | { kind: 'withheld'; id: FacilityId } | { kind: 'delta'; id: FacilityId };

export interface EstimateViewProps {
  anchorText: string;
  onAnchorText: (t: string) => void;
  onApplyAnchor: () => void;
  anchorError: string | null;
  point: Pt | null;
  pointLabel: string;
  onPoint: (p: Pt, label: string, site?: FacilityId) => void;
  kt: number;
  onKt: (kt: number) => void;
  rangeMi: number;
  onRange: (mi: number) => void;
  ev: Evaluation | null;
  /** Inputs differ from the evaluation shown. */
  stale: boolean;
  onRun: () => void;
  onRegister: () => void;
  onPrint: () => void;
  registerNote: ComponentChildren;
  selectedSite: string | null;
  onSelectSite: (id: string | null) => void;
  showWithheld: boolean;
  showDelta: boolean;
  /** Held facilities (position known) for the national map. */
  plotted: Facility[];
  ownSite: string;
  onRxHover: (id: string, auth: string, ref: string) => void;
  depthNote: string;
  cursorStart: Pt;
}

export function EstimateView(p: EstimateViewProps) {
  const ev = p.ev;
  const rows = useMemo<ResultRow[]>(() => {
    if (!ev) return [];
    const out: ResultRow[] = ev.rows.filter((r) => r.distanceMi <= p.rangeMi).map((r) => ({ kind: 'site' as const, r }));
    if (p.showWithheld) for (const id of ev.notEvaluated) out.push({ kind: 'withheld', id });
    if (p.showDelta) for (const id of ev.delta) out.push({ kind: 'delta', id });
    return out;
  }, [ev, p.rangeMi, p.showWithheld, p.showDelta]);
  const beyond = ev ? ev.rows.filter((r) => r.distanceMi > p.rangeMi).length : 0;

  return (
    <div class="stk-est">
      <div class="stk-inputs">
        <Caveat />
        <GroupBox title="Point of event">
          <form
            class="stk-anchor"
            onSubmit={(e) => {
              e.preventDefault();
              p.onApplyAnchor();
            }}
          >
            <TextField
              label="Point"
              layout="stacked"
              mono
              upper
              value={p.anchorText}
              onInput={p.onAnchorText}
              error={p.anchorError}
              hint="24 MI S OF LEXINGTON, a designation, or 37.69N 84.50W"
              name="anchor"
            />
            <Button type="submit" size="small" label="&Set point" />
          </form>
          <dl class="stk-readout">
            <dt>Set</dt>
            <dd class="mono">{p.point ? p.pointLabel : 'No point set'}</dd>
            <dt>Position</dt>
            <dd class="mono">{p.point ? fmtCoord(p.point) : ''}</dd>
          </dl>
        </GroupBox>
        <GroupBox title="Yield and listing">
          <Select
            label="Yield"
            layout="stacked"
            value={String(p.kt)}
            onChange={(v) => p.onKt(Number(v))}
            options={S.yieldsKt.map((k) => ({ value: String(k), label: fmtKt(k) }))}
            name="yield"
          />
          <Select
            label="List installations within"
            layout="stacked"
            value={String(p.rangeMi)}
            onChange={(v) => p.onRange(Number(v))}
            options={frag.listingRangesMi.map((m) => ({ value: String(m), label: `${m} mi` }))}
            name="range"
          />
        </GroupBox>
        <div class="stk-actions">
          <Button variant="primary" label="&Run estimate" onClick={p.onRun} title="Run planning model PM-3 (F5)" />
          <Button label="Enter in re&gister..." onClick={p.onRegister} title="Enter this estimate in the planning register (Ctrl+S)" />
          <Button label="&Print sheet..." onClick={p.onPrint} title="Print a planning estimate sheet (Ctrl+P)" />
        </div>
        <p class="stk-note">{p.stale && ev ? 'Inputs changed since the last run. Run the estimate to update the results.' : p.registerNote}</p>
        <ContourTable kt={ev?.kt ?? p.kt} />
      </div>

      <div class="stk-mapcell">
        <div class="stk-cap">National plot. Click the map, a marker, or focus it and use the arrow keys (Shift: {frag.cursorStepsMi[1]} mi, Alt: {frag.cursorStepsMi[2]} mi); Enter runs.</div>
        <NationalPlot plotted={p.plotted} point={p.point} ev={ev} onPoint={p.onPoint} onRun={p.onRun} selected={p.selectedSite} start={p.cursorStart} />
      </div>

      <div class="stk-plotcell">
        <div class="stk-cap">
          Local plot{ev ? `, ${fmtKt(ev.kt)}. Outer ring ${S.contours[0]!.psi} psi at ${fmtMi(ev.ranges[0]!.rangeMi)} mi` : ''}.
        </div>
        <LocalPlotFrame ev={ev} point={p.point} selected={p.selectedSite} onSelectSite={p.onSelectSite} onPoint={p.onPoint} />
      </div>

      <div class="stk-results">
        <div class="stk-cap">
          {ev
            ? `Results: ${ev.rows.filter((r) => r.distanceMi <= p.rangeMi).length} of ${ev.rows.length} evaluated installations within ${p.rangeMi} mi. ${beyond} beyond the listing range, all ${S.conditions[0]!.id}. ${ev.notEvaluated.length} not evaluated (position not held). ${ev.delta.length} DELTA not modelled.`
            : 'No estimate has been run in this window.'}
        </div>
        <ResultsTable rows={rows} selected={p.selectedSite} onSelect={p.onSelectSite} onRxHover={p.onRxHover} ownSite={p.ownSite} />
        <p class="stk-foot">{p.depthNote}</p>
      </div>
    </div>
  );
}

export function Caveat() {
  return (
    <div class="stk-caveat" role="note">
      <strong>{frag.caveat}</strong> {S.model.id} rev {S.model.revision}.
    </div>
  );
}

function ContourTable({ kt }: { kt: number }) {
  const k = Math.cbrt(kt);
  return (
    <table class="stk-mini">
      <caption>Contours at {fmtKt(kt)}</caption>
      <thead>
        <tr>
          <th>psi</th>
          <th>Range mi</th>
        </tr>
      </thead>
      <tbody>
        {S.contours.map((c) => (
          <tr key={c.psi}>
            <td class="num">{c.psi.toLocaleString('en-US')}</td>
            <td class="num">{fmtMi(c.rangeCoeffMi * k)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------------------------------------------------------- national map */

function NationalPlot({ plotted, point, ev, onPoint, onRun, selected, start }: { plotted: Facility[]; point: Pt | null; ev: Evaluation | null; onPoint: EstimateViewProps['onPoint']; onRun: () => void; selected: string | null; start: Pt }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const projRef = useRef<((xy: [number, number]) => [number, number] | null) | null>(null);
  const move = (deg: number, mi: number) => {
    const from = point ?? start;
    const to = destination(from, deg, mi, frag.earthRadiusMi);
    onPoint(to, `CURSOR ${fmtCoord(to)}`);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as Element | null;
    if (t && t.closest('.um-marker')) return;
    const step = e.altKey ? frag.cursorStepsMi[2] : e.shiftKey ? frag.cursorStepsMi[1] : frag.cursorStepsMi[0];
    const dirs: Record<string, number> = { ArrowUp: 0, ArrowRight: 90, ArrowDown: 180, ArrowLeft: 270 };
    if (e.key in dirs) {
      e.preventDefault();
      move(dirs[e.key]!, step);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!point) onPoint(start, `CURSOR ${fmtCoord(start)}`);
      else onRun();
    }
  };
  return (
    <div
      class="stk-mapframe"
      ref={ref}
      tabIndex={0}
      role="application"
      aria-label={`Point cursor${point ? ` at ${fmtCoord(point)}` : ''}. Arrow keys move the point; Enter runs the estimate.`}
      onKeyDown={onKeyDown}
    >
      {size.w > 40 && size.h > 40 ? (
        <UsMap
          width={size.w}
          height={size.h}
          facilities={plotted}
          selected={selected && plotted.some((f) => f.id === selected) ? (selected as FacilityId) : null}
          onSelect={(id) => {
            const f = plotted.find((x) => x.id === id);
            if (f && typeof f.lat === 'number' && typeof f.lon === 'number') onPoint({ lat: f.lat, lon: f.lon }, id, id);
          }}
          showLabels="alpha"
          label="National plot of installations held at this workstation"
        >
          {({ width, height, projection }) => {
            projRef.current = (xy) => (projection.invert ? (projection.invert(xy) as [number, number] | null) : null);
            const path = geoPath(projection);
            const gz = point ? projection([point.lon, point.lat]) : null;
            const outer = ev ? ev.ranges[0]!.rangeMi : 0;
            const ring = ev && point ? path(geoCircle().center([ev.point.lon, ev.point.lat]).radius((outer / frag.earthRadiusMi) * (180 / Math.PI))()) : null;
            return (
              <g>
                <rect
                  class="stk-hit"
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  onClick={(e: MouseEvent) => {
                    const svg = (e.currentTarget as SVGRectElement).ownerSVGElement;
                    if (!svg) return;
                    const b = svg.getBoundingClientRect();
                    const ll = projRef.current?.([e.clientX - b.left, e.clientY - b.top]);
                    if (ll) onPoint({ lon: ll[0], lat: ll[1] }, `MAP ${fmtCoord({ lon: ll[0], lat: ll[1] })}`);
                  }}
                />
                {ring ? <path class="stk-ring" d={ring} /> : null}
                {gz ? (
                  <g class="stk-gz" transform={`translate(${Math.round(gz[0]) + 0.5},${Math.round(gz[1]) + 0.5})`} aria-hidden="true">
                    <path d="M-9,0H-3M3,0H9M0,-9V-3M0,3V9" />
                    <circle r={6} />
                  </g>
                ) : null}
              </g>
            );
          }}
        </UsMap>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- local plot */

function LocalPlotFrame({ ev, point, selected, onSelectSite, onPoint }: { ev: Evaluation | null; point: Pt | null; selected: string | null; onSelectSite: (id: string) => void; onPoint: EstimateViewProps['onPoint'] }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const center = ev?.point ?? point;
  return (
    <div class="stk-plotframe" ref={ref}>
      {center && size.w > 40 && size.h > 40 ? (
        (() => {
          const outer = ev ? ev.ranges[0]!.rangeMi : 0;
          const span = spanFor(outer, frag.plotMarginFactor, frag.plotMinSpanMi);
          const half = (span / 2) * (Math.max(size.w, size.h) / Math.min(size.w, size.h)) * 1.5;
          const sites = (ev?.rows ?? []).filter((r) => r.distanceMi <= half).map((r) => ({ id: r.id, cls: r.cls, point: r.point, note: r.op.band === 'below' ? undefined : r.condition }));
          return (
            <LocalPlot
              width={size.w}
              height={size.h}
              center={center}
              spanMi={span}
              rings={ev ? ev.ranges : []}
              sites={sites}
              radiusMi={frag.earthRadiusMi}
              selected={selected}
              onSelectSite={onSelectSite}
              onPick={(pt) => onPoint(pt, `PLOT ${fmtCoord(pt)}`)}
              label={ev ? `Local plot: ${fmtKt(ev.kt)} at ${fmtCoord(ev.point)}, ${ev.ranges.length} contours, ${sites.length} installations shown` : 'Local plot: point set, estimate not run'}
            />
          );
        })()
      ) : (
        <div class="stk-plotempty">{center ? '' : 'Set a point to draw the local plot.'}</div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- table */

function ResultsTable({ rows, selected, onSelect, onRxHover, ownSite }: { rows: ResultRow[]; selected: string | null; onSelect: (id: string | null) => void; onRxHover: (id: string, auth: string, ref: string) => void; ownSite: string }) {
  const sextant = canon.compartments.find((c) => c.id === frag.positionWithholding.compartment);
  const idOf = (r: ResultRow) => (r.kind === 'site' ? r.r.id : r.id);
  const fac = (r: ResultRow) => canon.facilities.find((f) => f.id === idOf(r))!;
  const bar = (r: ResultRow, len: number) =>
    r.kind === 'withheld' ? (
      <Redaction len={len} auth={`FE (${sextant?.id ?? frag.positionWithholding.compartment})`} reference={sextant?.briefingDocNo ?? ''} id={`pos-${r.id}`} onHover={(i) => onRxHover(`pos-${r.id}`, i.auth, i.ref)} />
    ) : null;
  const columns: Column<ResultRow>[] = [
    {
      key: 'site',
      header: 'Installation',
      width: 116,
      mono: true,
      sortValue: (r) => idOf(r),
      render: (r) => (
        <span class="stk-site">
          <MarkerGlyph cls={fac(r).class} size={14} />
          {idOf(r)}
          {idOf(r) === ownSite ? <span class="stk-own"> (own)</span> : null}
        </span>
      ),
    },
    { key: 'h', header: 'Class', width: 54, mono: true, sortValue: (r) => (r.kind === 'site' ? r.r.hClass : r.kind === 'withheld' ? (S.facilities.find((x) => x.facility === r.id)?.hardeningClass ?? '') : 'DELTA'), render: (r) => (r.kind === 'site' ? r.r.hClass : r.kind === 'withheld' ? (S.facilities.find((x) => x.facility === r.id)?.hardeningClass ?? '') : '') },
    { key: 'dist', header: 'Dist mi', width: 70, align: 'right', mono: true, sortValue: (r) => (r.kind === 'site' ? r.r.distanceMi : Infinity), render: (r) => (r.kind === 'site' ? fmtMi(r.r.distanceMi) : bar(r, 5)) },
    { key: 'brg', header: 'From point', width: 74, mono: true, sortValue: (r) => (r.kind === 'site' ? r.r.bearing : 999), render: (r) => (r.kind === 'site' ? (r.r.distanceMi < 0.005 ? 'AT POINT' : compass(r.r.bearing, frag.compassPoints)) : bar(r, 3)) },
    {
      key: 'depth',
      header: 'Depth ft',
      width: 76,
      align: 'right',
      mono: true,
      sortValue: (r) => (r.kind === 'site' ? r.r.depthFt : -1),
      render: (r) => (r.kind === 'site' ? `${fmtInt(r.r.depthFt)}${r.r.depthBasis === 'planning' ? ' P' : r.r.depthBasis === 'release' ? ' R' : ''}` : ''),
    },
    { key: 'band', header: 'Depth band', width: 112, sortValue: (r) => depthBand(fac(r)), render: (r) => (r.kind === 'delta' ? '' : depthBand(fac(r))) },
    { key: 'rated', header: 'Rated psi', width: 70, align: 'right', mono: true, sortValue: (r) => (r.kind === 'site' ? r.r.ratedPsi : -1), render: (r) => (r.kind === 'site' ? fmtInt(r.r.ratedPsi) : r.kind === 'withheld' ? fmtInt(classDef(S.facilities.find((x) => x.facility === r.id)?.hardeningClass ?? '')?.ratedPsi ?? 0) : '') },
    { key: 'eff', header: 'Eff. psi', width: 66, align: 'right', mono: true, title: 'Effective rating at model depth', sortValue: (r) => (r.kind === 'site' ? r.r.effectivePsi : -1), render: (r) => (r.kind === 'site' ? fmtInt(r.r.effectivePsi) : '') },
    { key: 'psi', header: 'Site psi', width: 70, align: 'right', mono: true, sortValue: (r) => (r.kind === 'site' ? (r.r.op.band === 'below' ? 0 : r.r.op.psi) : -1), render: (r) => (r.kind === 'site' ? fmtPsi(r.r.op) : '') },
    { key: 'ratio', header: 'Ratio', width: 54, align: 'right', mono: true, sortValue: (r) => (r.kind === 'site' ? (r.r.ratio ?? 99) : -1), render: (r) => (r.kind === 'site' ? (r.r.ratio === null ? 'n/a' : fmtRatio(r.r.ratio)) : '') },
    {
      key: 'cond',
      header: 'Estimated condition',
      width: 150,
      sortValue: (r) => (r.kind === 'site' ? S.conditions.findIndex((c) => c.id === r.r.condition) : r.kind === 'withheld' ? 10 : 11),
      render: (r) =>
        r.kind === 'site' ? (
          <StatusLight status={conditionStatus(r.r.condition)} word={r.r.condition} />
        ) : r.kind === 'withheld' ? (
          <span class="stk-dim">NOT EVALUATED</span>
        ) : (
          <span class="stk-dim">NOT MODELLED</span>
        ),
    },
    {
      key: 'egress',
      header: 'Egress / note',
      wrap: true,
      sortable: false,
      render: (r) =>
        r.kind === 'site' ? (
          r.r.egress.length ? `Rail: ${r.r.egress.map((e) => `SEG ${e.no} to ${e.to}`).join(', ')}` : ''
        ) : r.kind === 'withheld' ? (
          'Position not held at this workstation.'
        ) : (
          <>
            {S.notModelled.text} Withheld: {frag.deltaWithholding.authority}, ref {frag.deltaWithholding.reference}.
          </>
        ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={idOf}
      label={`Estimate results, ${rows.length} rows`}
      selection="single"
      selected={selected ? [selected] : []}
      onSelectionChange={(k) => onSelect(k[0] ?? null)}
      defaultSort={{ key: 'dist', dir: 'asc' }}
      dense
      zebra
      rowClass={(r) => (r.kind === 'site' ? undefined : 'stk-row-dim')}
      empty={<span>No estimate run. Set a point and a yield, then Run estimate (F5).</span>}
    />
  );
}
