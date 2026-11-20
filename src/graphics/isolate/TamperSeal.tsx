/**
 * TamperSeal: a numbered wire-and-tag security seal threaded through the tab of a
 * guarded cover (the @graphics/panel GuardedSwitch unit, 150 x 160) and an eye on the
 * panel face. Intact: the wire runs taut from the cover tab to the eye and the tag hangs
 * from the crimp. Broken: the wire is cut at the crimp and both ends hang free.
 *
 * Drawn to overlay the GuardedSwitch unit exactly (same viewBox). Tokens only, no motion.
 * The overlay draws nothing interactive; the app puts the break-seal control beside it.
 */
import './isolate-graphics.css';

export interface TamperSealProps {
  /** Seal number printed on the tag, e.g. "TS-A03-07714". */
  no: string;
  broken: boolean;
  /** Overlay size; defaults to the GuardedSwitch unit (150 x 160). */
  width?: number;
  height?: number;
}

const VW = 150;
const VH = 160;
/* cover tab bottom centre (GuardedSwitch draws the tab at 63..87 x 138..143) */
const TX = 75;
const TY = 142;
/* eye on the panel face, lower left of the unit */
const EX = 22;
const EY = 150;
/* crimp (lead) on the wire between tab and eye */
const CX = 48;
const CY = 147;

export function TamperSeal({ no, broken, width = VW, height = VH }: TamperSealProps) {
  const tagX = CX - 13;
  const tagY = CY + 3;
  return (
    <svg
      class={broken ? 'ts-seal is-broken' : 'ts-seal'}
      width={width}
      height={height}
      viewBox={`0 0 ${VW} ${VH}`}
      role="img"
      aria-label={`Tamper seal ${no}, ${broken ? 'broken' : 'intact'}`}
    >
      {/* eye bolt on the panel face */}
      <circle cx={EX} cy={EY} r={3.2} class="ts-eye" />
      <circle cx={EX} cy={EY} r={1.3} class="ts-eyehole" />
      {broken ? (
        <g>
          {/* cut ends: one hangs from the tab, one from the eye */}
          <path d={`M${TX - 2} ${TY} q 2 6 -3 11`} class="ts-wire" />
          <path d={`M${EX + 1} ${EY + 2} q 4 3 9 1`} class="ts-wire" />
          {/* crimp and tag dropped, lying lower and turned */}
          <g transform={`rotate(18 ${CX + 10} ${CY + 6})`}>
            <rect x={CX + 6} y={CY + 2} width={7} height={5} class="ts-crimp" />
            <rect x={tagX + 18} y={tagY + 2} width={30} height={9} class="ts-tag" />
            <text x={tagX + 33} y={tagY + 8.6} text-anchor="middle" class="ts-tagt">
              {no.slice(-5)}
            </text>
          </g>
          <text x={VW - 22} y={VH - 11} text-anchor="end" class="ts-word">
            SEAL BROKEN
          </text>
        </g>
      ) : (
        <g>
          {/* taut wire: tab -> crimp -> eye */}
          <path d={`M${TX} ${TY} L${CX + 3} ${CY} L${EX + 2} ${EY}`} class="ts-wire" />
          <rect x={CX - 1} y={CY - 2.5} width={7} height={5} class="ts-crimp" />
          {/* tag hangs from the crimp */}
          <line x1={CX + 2.5} y1={CY + 2.5} x2={CX + 2.5} y2={tagY} class="ts-wire" />
          <rect x={tagX} y={tagY} width={32} height={9} class="ts-tag" />
          <text x={tagX + 16} y={tagY + 6.6} text-anchor="middle" class="ts-tagt">
            {no.slice(-5)}
          </text>
        </g>
      )}
    </svg>
  );
}
