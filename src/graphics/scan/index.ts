/**
 * @graphics/scan: scanned-document treatment kit.
 * See README.md. Everything is drawn in code and deterministic from a seed.
 */
import './scan.css';

export { ScanPage, ScanEffects, PunchHoles, Toner, Speckle, CopyLine, EdgeShadow, scanRotation } from './ScanPage';
export type { ScanPageProps, ScanEffectsProps, PunchHolesProps, TonerProps, SpeckleProps } from './ScanPage';

export { MarginNote, RoutingInitials, Handwriting, NoteInk, InkSvg, InkCircle, InkUnderline, InkArrow, composeInk, textOf } from './Handwriting';
export type { MarginNoteProps, RoutingInitialsProps, HandwritingProps, InkMarkProps, InkGeometry, NoteMark, ComposeOptions } from './Handwriting';

export { RoutingSlip } from './RoutingSlip';
export type { RoutingSlipProps, RoutingEntry, RoutingAction } from './RoutingSlip';

export { enhanceScans, parseInitials, shortDate } from './enhance';

export { handStyle, HAND_IDS, writeText, inkPath, underlineStroke, circleStroke, arrowStrokes, checkStroke } from './pen';
export type { HandStyle, InkKind, Pt, PenOptions, WrittenText } from './pen';

export { GLYPHS, SUPPORTED_CHARS } from './glyphs';
