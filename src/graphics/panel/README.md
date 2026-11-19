# @graphics/panel

The control-panel hardware shared by the pass-two operations apps (plant, doors, isolate, pa, patch, hoist,
environ, drill, muster, dispatch). It is drawn as 2008 switchgear and control-room hardware from a contractor's HMI
package: flat fills, 1px bevels, engraved plates in capitals, no glow, gradients, glass or bloom. All colour comes from
`src/design/tokens.css` (`var(--…)`, mixed with `color-mix` for unlit lenses). Status is the reactor module's
`StatusWord` (10px square plus a word). Every control is controlled (props in, callbacks out), operable from the
keyboard with a visible dotted focus, and plays no sound. Apps call `services.sound.play` from the callbacks.

```ts
import { GuardedSwitch, PushButton, Lamp, KeySwitch, SelectorSwitch, ToggleSwitch, Annunciator,
  EdgewiseMeter, ArcMeter, BarMeter, SegmentDisplay, Plate, PanelFrame, PanelSection,
  MimicSvg, MimicLine, MimicJunction, MimicBox, annunciatorStep, guardStep } from '@graphics/panel';
```

## Exports

| Component | Key props | Keyboard / ARIA |
|---|---|---|
| `GuardedSwitch` | `state: 'closed'\|'lifted'\|'armed'\|'actuated'`, `label`, `holdMs` (3000), `segments` (10), `progress` (static 0..1 for `armed`), `plate`, `words`, `disabled`, `reducedMotion`, `tag`; `onLift` `onClose` `onArm` `onAbort` `onActuate` | Cover is a button (Space/Enter lifts or closes, `aria-expanded`). The actuator is reachable only when lifted: hold Space/Enter or the pointer. Releasing early calls `onAbort`. **Escape** anywhere in the unit closes the cover. Hold bar is `role=progressbar`. |
| `PushButton` | `legend`, `label` (plate above), `mode: momentary\|latching`, `pressed`, `lit`, `color`, `size`, `disabled`; `onPress` `onRelease` `onChange(latched)` | Native button. Momentary: press on keydown or pointerdown. Latching: `aria-pressed`. |
| `Lamp` | `legend`, `lit`, `color`, `size`, `showState`, `words`, `tag` | `role=img`, the label carries ON/OFF. |
| `ToggleSwitch` | `checked`, `onChange`, `label`, `onLegend`/`offLegend`, `disabled` | `role=switch`; Space toggles, Up/Down set. |
| `SelectorSwitch` | `positions[]`, `value`, `onChange(i)`, `label`, `disabled`, `tag` | `role=slider`; arrows step (end stops), Home/End; click a legend to select it. |
| `KeySwitch` | as Selector, plus `keyPresent` (default true), `removableAt[]`, `keyNo`, `onLocked()` | Without the key it does not turn and calls `onLocked` so the app can refuse in-world. |
| `Annunciator` | `tiles: {id, legend, seq, priority?: alarm\|warning\|status, spare?}[]`, `columns`, `label`, `test`, `tileWidth`, `reducedMotion`, `buttons`; `onAck(ids)` `onReset(ids)` `onTest(on)` | Tiles are buttons with a roving tab stop; arrows/Home/End move; Enter acks an unacknowledged window or resets one in ringback. ACK / RESET / LAMP TEST pushbuttons sit under the grid. |
| `EdgewiseMeter`, `ArcMeter` | `label`, `value`, `min`, `max`, `unit`, `warn`, `alarm` (number = high, or `{lo, hi}`), `ticks`, `tag`, `showStatus` | `role=meter` with value text and limit word. Limits draw amber/red scale zones and the HIGH / HIGH-HIGH / LOW / LOW-LOW word (same rules as the reactor `Gauge`). |
| `BarMeter` | meter props plus `segments` (20), `length` (180), `readout` | Horizontal segmented bar graph with a readout field. For a vertical bar instrument use the reactor `Gauge`. |
| `SegmentDisplay` | `value`, `digits` (4), `decimals`, `variant: lcd\|led`, `size`, `label`, `unit` | `role=img`. Right-aligned; dots attach to the previous digit; overflow shows dashes. |
| `Plate` | `text`, `variant: light\|dark\|warning\|danger`, `size`, `screws`, `width`, `align` | Plain text. |
| `PanelFrame` | `title`, `panelNo`, `columns`, `gap`, `width` | `<section>` with the title as its name. Screws in the corners. |
| `PanelSection` | `title`, `columns`, `gap`, `span` | Etched group with a caption plate. |
| `MimicSvg`, `MimicLine` (`points`, `state: live\|dead\|flow`, `weight`), `MimicJunction`, `MimicBox` (`on` = running, filled) | Small mimic windows. The reactor module's one-line symbols are internal to `ReactorOneLine`, so these are the only mimic helpers. Use `ReactorOneLine` itself for a station diagram. |

Logic (pure, tested in `logic.test.ts`): `annunciatorStep(point, 'abnormal'|'normal'|'ack'|'reset')`,
`annunciatorRun`, `ANN_NORMAL`, `ANN_WORD`, `guardStep(state, 'lift'|'close'|'press'|'release'|'complete')`,
`holdProgress(elapsedMs, durationMs, segments)`, `rotaryAngles`, `stepPosition`, `scaleTicks`, `limitWord`,
`segmentCells`. Also exported: `useReducedMotion(prop?)`.

## Annunciator sequence (ISA-18.1 ring-back)

| Seq | Meaning | Drawing | Reduced motion |
|---|---|---|---|
| `normal` | process normal | dark window, faint legend | same |
| `unack` | alarm, not acknowledged (it locks in if the alarm clears) | slow flash, 1 s | static inverse: light window, 4px border and legend in the lit colour |
| `ack` | acknowledged, still abnormal | steady on | same |
| `ringback` | cleared after the alarm; RESET needed | dim flash, 2 s | static dim with a dashed border |

The app owns each window's `AnnPoint` and feeds process changes and operator actions through `annunciatorStep`.
Motion is turned off by the `reducedMotion` prop, by `prefers-reduced-motion`, or by `[data-motion="reduced"]` on
any ancestor. `reducedMotion={false}` forces flashing even under the OS preference.

## Guarded switch wiring

```tsx
const [s, setS] = useState<GuardState>('closed');
<GuardedSwitch state={s} label={['NETWORK ISOLATION', 'MANUAL INITIATE']} holdMs={3000} tag="HS-0001"
  onLift={() => { setS('lifted'); sound.play('relay'); }}
  onClose={() => setS('closed')}
  onActuate={() => { setS('actuated'); audit.log('control', 'ISOLATE', 'initiated', { level }); }} />
```

The component runs the hold timer itself and shows `armed` while it is held. `state="armed"` with `progress` is only
for static drawings. When the app moves `state` away from `lifted`, a hold in progress is dropped.

## Preview and rendered check

```
npx vite --port 5282 --strictPort          # then open /src/graphics/panel/preview.html
node src/graphics/panel/check/render.mjs   # with the server running
```

`check/<block>@1x.png` and `@2x.png` (light theme) cover every gallery block: guard states, live guard, pushbuttons,
lamps, switches, annunciator (flash phase on, flash phase off, reduced motion, lamp test, live), meters, bars and
segment displays, plates, mimic, and a composed sample panel. `interact-*.png` show a held actuator part way through,
actuated, keyboard focus on the actuator, annunciator focus and rotary focus. The script also asserts mouse and
keyboard sequences (lift, early release, full hold, Escape, ACK, RESET, arrow keys) and fails on page errors or any
cross-origin request. All figures on the preview page are sample data, not canon.
