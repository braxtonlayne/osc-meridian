/** Tier record: composition, clearance and scope, the tier pyramid, and roster entries at the tier. */
import { Button, DataTable, PropertyGrid, type Column } from '@design/index';
import type { StaffLine, TierNo } from '@core/canon-types';
import { TierPyramid } from '@graphics/org';
import { canon, fmt, markingLabel, UNPOSTED } from '../model';
import { Section, usePer, useWidth } from '../ui';
import { dirPreset } from '../state';

export function TierView({ tier }: { tier: TierNo }) {
  const per = usePer();
  const t = canon.tiers.find((x) => x.tier === tier)!;
  const [ref, w] = useWidth<HTMLDivElement>();
  const lines: StaffLine[] = (t.composition as (StaffLine | string)[]).map((c) => (typeof c === 'string' ? { role: c, count: Number.NaN } : c));
  const counted = lines.every((l) => Number.isFinite(l.count));
  const cols: Column<StaffLine>[] = [
    { key: 'role', header: 'Composition', render: (l) => l.role },
    ...(counted ? [{ key: 'count', header: 'Strength', align: 'right' as const, mono: true, sortValue: (l: StaffLine) => l.count, render: (l: StaffLine) => fmt(l.count) }] : []),
  ];
  const listed = canon.roster.filter((p) => p.tier === tier && p.site !== UNPOSTED).length;
  return (
    <div class="per-view">
      <PropertyGrid
        caption={`Tier ${t.tier}: ${t.name}`}
        columns={2}
        rows={[
          { label: 'Tier', value: String(t.tier), mono: true },
          { label: 'Strength', value: fmt(t.count), mono: true },
          { label: 'Clearance', value: t.clearance },
          { label: 'Clearance marking', value: t.clearanceMarking ? markingLabel(t.clearanceMarking) : 'None assigned' },
          { label: 'Knowledge scope', value: t.knowledgeScope },
          { label: 'Directory entries', value: `${fmt(listed)} posted entries listed` },
        ]}
      />
      <Section title="Composition">
        <DataTable
          label={`Tier ${t.tier} composition`}
          columns={cols}
          rows={lines}
          rowKey={(l) => l.role}
          selection="none"
          dense
          footer={
            counted ? (
              <tr>
                <td>Tier {t.tier} total</td>
                <td class="is-right is-mono">{fmt(t.count)}</td>
              </tr>
            ) : undefined
          }
        />
      </Section>
      <Section title="Tier structure">
        <div ref={ref} class="per-scroll-x">
          <TierPyramid width={Math.max(660, Math.min(900, w))} height={320} highlightTier={t.tier} />
        </div>
      </Section>
      <div class="per-actions">
        <Button
          label="&Directory entries at this tier"
          onClick={() => {
            dirPreset.value = { query: '', tier: t.tier, site: null, divisionId: null };
            per.go('/personnel/directory');
          }}
        />
        <Button label="&Organisation chart" onClick={() => per.go('/personnel/org')} />
      </div>
    </div>
  );
}
