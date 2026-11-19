/**
 * TierPyramid: four stacked bands, Tier 1 at the top, with a strength bracket
 * at the side. Band width uses a square-root scale of headcount (stated on the
 * chart); the bracket is linear. Every figure is read from canon.
 */
import type { JSX } from 'preact';
import { UNPOSTED_LABEL, canon, fmt } from './model';
import './org.css';

export interface TierPyramidProps {
  width: number;
  height: number;
  /** Tier to pick out (1 to 4). */
  highlightTier?: number;
}

const TOP = 24;
const BOTTOM = 34;
const BRACKET_W = 262;
const INNER_LABEL_W = 138;

const half = (v: number): number => Math.round(v) + 0.5;

export function TierPyramid({ width, height, highlightTier }: TierPyramidProps): JSX.Element {
  const tiers = [...canon.tiers].sort((a, b) => a.tier - b.tier);
  const h = canon.headline;
  const labelW = Math.round(Math.min(250, Math.max(150, width * 0.22)));
  const bandsX0 = labelW + 12;
  const bandsX1 = Math.max(bandsX0 + 80, width - BRACKET_W - 14);
  const bandsW = bandsX1 - bandsX0;
  const mid = (bandsX0 + bandsX1) / 2;
  const y0 = TOP;
  const y1 = Math.max(y0 + 80, height - BOTTOM);
  const bandH = (y1 - y0) / Math.max(1, tiers.length);
  const maxRoot = Math.sqrt(Math.max(1, ...tiers.map((t) => t.count)));

  // Bracket: linear in headcount, top = posted, bottom = the difference.
  const bx = half(width - BRACKET_W + 12);
  const ox = half(width - BRACKET_W + 12 + INNER_LABEL_W + 12);
  const split = half(y0 + (y1 - y0) * (h.staffPosted / Math.max(1, h.staffTotal)));
  const top = half(y0);
  const bot = half(y1);

  return (
    <div class="tp" style={{ width: `${width}px`, height: `${height}px` }} role="group" aria-label="Personnel by tier">
      <svg class="tp-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
        {tiers.map((t, i) => {
          const w = Math.max(6, Math.round((bandsW * Math.sqrt(t.count)) / maxRoot));
          const y = y0 + i * bandH;
          const inside = w >= 64;
          return (
            <g key={t.tier}>
              <path class="tp-rule" d={`M0 ${half(y)}H${bandsX1}`} />
              <rect
                class={`tp-band${t.tier === highlightTier ? ' is-hl' : ''}`}
                x={half(mid - w / 2)}
                y={half(y)}
                width={w}
                height={Math.round(bandH)}
              />
              <text class="tp-count" x={inside ? mid : mid + w / 2 + 8} y={y + bandH / 2 + 4} text-anchor={inside ? 'middle' : 'start'}>
                {fmt(t.count)}
              </text>
            </g>
          );
        })}
        <path class="tp-rule" d={`M0 ${bot}H${bandsX1}`} />
        <path class="tp-bracket" d={`M${bx - 6} ${top}H${bx}V${bot}H${bx - 6}M${bx - 6} ${split}H${bx + 6}`} />
        <path class="tp-bracket" d={`M${ox - 6} ${top}H${ox}V${bot}H${ox - 6}`} />
      </svg>

      <div class="tp-head" style={{ left: '6px', width: `${labelW - 6}px` }}>TIER AND CLEARANCE</div>
      <div class="tp-head" style={{ left: `${bandsX0}px`, width: `${bandsW}px`, textAlign: 'center' }}>HEADCOUNT</div>
      <div class="tp-head" style={{ left: `${bx + 8}px`, width: `${BRACKET_W - 24}px` }}>STRENGTH RECONCILIATION</div>

      {tiers.map((t, i) => (
        <div
          key={t.tier}
          class={`tp-label${t.tier === highlightTier ? ' is-hl' : ''}`}
          style={{ left: '0', top: `${y0 + i * bandH + 1}px`, width: `${labelW}px`, height: `${bandH - 1}px` }}
        >
          <span class="tp-label__tier">TIER {t.tier}</span>
          <span class="tp-label__name">{t.name}</span>
          <span class="tp-label__clr">{t.clearance}</span>
        </div>
      ))}

      <div class="tp-fig" style={{ left: `${bx + 8}px`, top: `${(y0 + split) / 2}px`, width: `${INNER_LABEL_W - 4}px` }}>
        <span class="tp-fig__k">Total posted staff</span>
        <span class="tp-fig__v">{fmt(h.staffPosted)}</span>
      </div>
      <div class="tp-fig is-unposted" style={{ left: `${bx + 8}px`, top: `${(split + y1) / 2}px`, width: `${INNER_LABEL_W - 4}px` }}>
        <span class="tp-fig__k">{UNPOSTED_LABEL}</span>
        <span class="tp-fig__v">{fmt(h.staffUnposted)}</span>
      </div>
      <div class="tp-fig" style={{ left: `${ox + 8}px`, top: `${(y0 + y1) / 2}px`, width: `${Math.max(60, width - ox - 12)}px` }}>
        <span class="tp-fig__k">Total personnel</span>
        <span class="tp-fig__v">{fmt(h.staffTotal)}</span>
      </div>

      <div class="tp-foot" style={{ top: `${y1 + 5}px` }}>
        Band width is proportional to the square root of headcount. Bracket lengths are proportional to headcount; the bracket is not aligned
        to the tier bands.
      </div>
    </div>
  );
}
