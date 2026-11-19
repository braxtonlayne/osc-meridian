/**
 * @graphics/panel: shared control-panel hardware for the pass-two operations apps.
 * See README.md for props, keyboard behaviour and the rendered check.
 */
export { Plate, Lamp, PushButton, ToggleSwitch } from './controls';
export type { PlateProps, PlateVariant, LampProps, PushButtonProps, ToggleSwitchProps } from './controls';
export { SelectorSwitch, KeySwitch } from './rotary';
export type { SelectorSwitchProps, KeySwitchProps } from './rotary';
export { GuardedSwitch } from './guarded';
export type { GuardedSwitchProps } from './guarded';
export { Annunciator } from './annunciator';
export type { AnnunciatorProps, AnnunciatorTile, AnnPriority } from './annunciator';
export { EdgewiseMeter, ArcMeter, BarMeter, SegmentDisplay } from './meters';
export type { MeterProps, BarMeterProps, SegmentDisplayProps } from './meters';
export { PanelFrame, PanelSection, MimicLine, MimicJunction, MimicBox, MimicSvg } from './frame';
export type { PanelFrameProps, PanelSectionProps, MimicLineProps, MimicState } from './frame';
export { useReducedMotion } from './parts';
export type { LensColor, Legend } from './parts';
export {
  ANN_NORMAL,
  ANN_WORD,
  annunciatorRun,
  annunciatorStep,
  guardStep,
  holdProgress,
  limitWord,
  rotaryAngles,
  scaleTicks,
  segmentCells,
  stepPosition,
} from './logic';
export type { AnnEvent, AnnPoint, AnnSeq, GuardEvent, GuardState, HoldProgress, Limit, LimitWord } from './logic';
