# @graphics/reactor

Reactor one-line diagrams and facility telemetry instruments (SPEC 8.1 telemetry tab, 8.7 reactor pages).
All colour comes from `src/design/tokens.css`; status colours appear only as 10px squares beside a word.

```ts
import { ReactorOneLine, Gauge, ReadoutRow, TelemetryChart, SealStateIndicator } from '@graphics/reactor';
```

## ReactorOneLine

```tsx
<ReactorOneLine reactorId="RX-A03" />
<ReactorOneLine reactorId="RX-A01" live={{ breakers: { '52-G1': 'OPEN' }, loadMW: 9.2 }} />
<ReactorOneLine reactorId="RX-B08" siteMask="BETA SITE" />  {/* site identity not released */}
```

Station electrical single-line diagram, drawn as an engineering sheet (zone border, notes, legend, title block).
SVG, 1160 x 730 user units, scales to its container and scrolls below 960px wide.

Topology: reactor -> TG-1 / G-1 -> 52-G1 -> switchgear bus A, tie 52-BT, bus B -> T-1A / T-1B -> ATS-A / ATS-B ->
essential buses E-A / E-B -> loads. Diesel sets DG-n feed the EDG bus through 52-Dn into the emergency side of both
ATS units. Utility tie (T-U1, 52-U1) is OPEN, site islanded. Surface supply (INV-S1, 52-S1) is the canon
"solar/geothermal at surface facilities". ALPHA sites add the rail traction feeder (52-B3, T-R1, REC-1).

Conventions: breaker = square, filled CLOSED / hollow OPEN, with the word beside it; transformer = two circles;
bus = heavy bar; energized conductors solid, de-energized dashed.

### What comes from canon, what is derived (`model.ts`)

| Shown | Source |
|---|---|
| Unit id, designation, MWt, MWe, status, status note | `canon.reactors[]` |
| Site id, codename, ALPHA/BETA | `canon.facilities[]` |
| Fuel storage days | `canon.reserves.items[ENERGY-DIESEL].value` |
| Agency, division name, "as of" date | `canon.meta`, `canon.divisions[FE]` |
| Station load | MWe x load fraction. Fraction is read from the status note when it quotes one ("71% rated thermal power to station load"), otherwise 58-70% by a hash of the unit id; capped 6 points under any "limited to NN%" in the note |
| Feeder loads | fixed shares of station load (ALPHA includes 24% rail traction; BETA has none) |
| Voltages | 13.8 kV / 4.16 kV at 10 MWe and above, else 4.16 kV / 480 V |
| DG, transformer, inverter ratings | next standard size above the derived duty (ALPHA 3 sets, BETA 2 sets, N+1) |
| Drawing no., rev, date | `FE-E-<unit>-0101`; rev and date hashed from the unit id, date after commissioning and never after APR 2008 |

Derived values are engineering dressing, not canon. Do not quote them in documents as headline figures.

### Status behaviour

- NOMINAL / DEGRADED: 52-G1 CLOSED, unit carries the station, diesels on standby, 52-S1 OPEN.
- OFFLINE / FAULT: 52-G1 OPEN, 52-A1 OPEN, ATS-A on EMERGENCY, diesels RUN and carry bus E-A, surface supply
  carries bus E-B through 52-S1, rail traction shed. This matches the RX-B08 note ("on diesel and surface supply").
- The title block always prints the unit status (square + word) and the canon status note.

### live

`live.breakers` overrides any breaker by tag: `52-G1 52-BT 52-U1 52-S1 52-A1 52-B1 52-B3 52-D1..3 52-EA1..3 52-EB1..3`.
Energization, ATS position and diesel start are recomputed from the result (an ATS goes to EMERGENCY when its normal
source is dead; diesels start when any ATS is on EMERGENCY). `live.loadMW` rescales the feeder loads so the fully
connected station totals that figure. `buildPlant(canon, id)` and `solve(plant, live)` are exported for sims that
want the same numbers.

## Gauge

```tsx
<Gauge tag="AI-301" label="CO2 level 3" value={1140} min={0} max={2000} unit="ppm" warn={1000} alarm={1500} />
<Gauge label="Frequency" value={60.02} min={58} max={62} unit="Hz" kind="dial"
       warn={{ lo: 59.5, hi: 60.5 }} alarm={{ lo: 59, hi: 61 }} />
```

Flat instrument, 116px wide. `kind="bar"` (default) is a vertical bar with scale; `kind="dial"` is a 240 degree dial.
`warn` / `alarm` are a high threshold (number) or `{ lo, hi }`; they draw the H / HH / L / LL flags and set the
status word (NORMAL, HIGH, HIGH-HIGH, LOW, LOW-LOW). A non-finite value reads `----` / NO DATA.
Optional: `tag`, `digits`.

## ReadoutRow

```tsx
<ReadoutRow tag="PI-512" label="Feedwater pump B discharge" value={0} unit="psig" status="FAULT" word="OUT OF SVC" />
```

One table-like row: tag, label, sunken value field, unit, status square + word. `status` is
`NOMINAL | DEGRADED | FAULT | OFFLINE` (default NOMINAL); `word` defaults to the status id. `StatusWord` is exported
for use on its own.

## TelemetryChart

The index exports a lazy wrapper: uPlot and its stylesheet load with the first chart rendered (a box of
`height` holds the place meanwhile), so importing one-lines or gauges from `@graphics/reactor` does not pull
uPlot in. `@graphics/reactor/TelemetryChart` is the eager component.

```tsx
<TelemetryChart height={160} series={[
  { label: 'STATION LOAD', unit: 'MW', data: [t, mw], digits: 2 },
  { label: 'BUS A', unit: 'kV', data: [t, kv] },
  { label: 'SEAL', unit: 'state', data: [t, s], stepped: true },
]} />
```

uPlot wrapper. `data` is `[x, y]` with x in Unix seconds, shown as Zulu (`1400Z`, date under the first tick of a day).
One y scale per distinct unit; the first unit gets the left axis, the second the right. Series are told apart by tone
and dash, not colour. The legend row shows the last value, or the value under the cursor. `height` includes the 22px
legend. Width follows the container. Series with different x arrays are joined. Changing only the data calls
`setData`; changing labels, units or height rebuilds the plot.

## SealStateIndicator

```tsx
<SealStateIndicator state="CYCLING" label="Portal lock 2" />
```

Door glyph, three-position annunciator and status word. SEALED = nominal square, CYCLING = degraded, VENTED = offline.

## Rendered check

```
node src/graphics/reactor/check/render.mjs
```

Bundles `check/preview.tsx` with esbuild, renders it in headless Chromium (Playwright) and writes:

- `check/contact.png` (1400 x 900): contact sheet of all eight one-lines
- `check/gauges.png` (1400 x 900): telemetry panel with gauges, readout rows, four trends, seal indicators
- `check/oneline-<id>.png`: each one-line at full size (1160 wide)
- `check/oneline-live.png`: RX-A01 with `52-G1` and `52-BT` forced OPEN (diesels pick up both essential buses)

The script also fails loudly on page errors and reports any drawing text that falls outside the sheet border.
