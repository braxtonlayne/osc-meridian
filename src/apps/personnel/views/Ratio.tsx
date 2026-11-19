/** Standard facility personnel ratios, and the staffing calculator built on them. */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Button, DataTable, FieldGroup, FieldMessage, Fieldset, PropertyGrid, Select, TextField, type Column } from '@design/index';
import type { StaffLine } from '@core/canon-types';
import { canon, facilityById, fmt } from '../model';
import { computeEstablishment, fillForHeadcount, formatRatio, headcountForFill, isCommandFunction, parseFill, parseHeadcount, supportRatio, type RatioLine } from '../ratio';
import { calcPreset } from '../state';
import { Section, usePer } from '../ui';

const DEFAULT_FACILITY = 'ALPHA-03';

const fillText = (capacity: number, n: number) => fmt(fillForHeadcount(capacity, n), 2).replace(/,/g, '');

export function RatioView() {
  const per = usePer();
  const preset = calcPreset.peek();
  const startFac = facilityById.get(preset?.facility ?? '') ?? facilityById.get(DEFAULT_FACILITY) ?? canon.facilities[0]!;
  const [facId, setFacId] = useState<string>(startFac.id);
  const fac = facilityById.get(facId) ?? startFac;
  const [head, setHead] = useState<number>(Math.min(fac.capacity, preset?.headcount ?? fac.staff));
  const [fillRaw, setFillRaw] = useState<string>(fillText(fac.capacity, head));
  const [headRaw, setHeadRaw] = useState<string>(String(head));
  const [fillErr, setFillErr] = useState<string | null>(null);
  const [headErr, setHeadErr] = useState<string | null>(null);
  const [highlight] = useState<string[]>(preset?.highlight ?? []);

  useEffect(() => {
    calcPreset.value = null;
  }, []);

  const result = useMemo(() => computeEstablishment(canon.ratioModel.rows, fac.capacity, head), [fac.capacity, head]);

  useEffect(() => {
    per.setMessage(`${fac.id}: establishment ${fmt(result.establishment)} at ${fmt(result.fillPct, 2)}% of berthing.`);
  }, [fac.id, result.establishment]);

  const setAll = (n: number, capacity = fac.capacity) => {
    const v = Math.max(0, Math.min(capacity, n));
    setHead(v);
    setHeadRaw(String(v));
    setFillRaw(fillText(capacity, v));
    setFillErr(null);
    setHeadErr(null);
  };

  const onFacility = (id: string) => {
    const f = facilityById.get(id);
    if (!f) return;
    setFacId(id);
    setAll(f.staff, f.capacity);
  };

  const onFill = (raw: string) => {
    setFillRaw(raw);
    const r = parseFill(raw);
    if (!r.ok) {
      setFillErr(r.message);
      return;
    }
    setFillErr(null);
    const n = headcountForFill(fac.capacity, r.value);
    setHead(n);
    setHeadRaw(String(n));
    setHeadErr(null);
  };

  const onHead = (raw: string) => {
    setHeadRaw(raw);
    const r = parseHeadcount(raw, fac.capacity);
    if (!r.ok) {
      setHeadErr(r.message);
      return;
    }
    setHeadErr(null);
    setHead(r.value);
    setFillRaw(fillText(fac.capacity, r.value));
    setFillErr(null);
  };

  const ph4 = canon.phases.find((p) => p.n === 4);
  const ph5 = canon.phases.find((p) => p.n === 5);

  const cols: Column<RatioLine>[] = [
    { key: 'function', header: 'Function', render: (l) => (highlight.includes(l.function) ? <strong>{l.function}</strong> : l.function) },
    { key: 'pct', header: 'Ratio %', align: 'right', mono: true, sortValue: (l) => l.pct, render: (l) => fmt(l.pct) },
    { key: 'model', header: `Model (${fmt(canon.ratioModel.capacity)})`, align: 'right', mono: true, sortValue: (l) => l.modelCount, render: (l) => fmt(l.modelCount) },
    { key: 'posts', header: `Establishment (${fac.id})`, align: 'right', mono: true, sortValue: (l) => l.posts, render: (l) => fmt(l.posts) },
  ];

  const sumPct = canon.ratioModel.rows.reduce((a, r) => a + r.pct, 0);
  const sumModel = canon.ratioModel.rows.reduce((a, r) => a + r.count, 0);
  const cmdLine = fac.staffBreakdown.find((l) => isCommandFunction(l.role));
  const postedRatio = cmdLine ? supportRatio(fac.staff, cmdLine.count) : null;

  const bcols: Column<StaffLine>[] = [
    { key: 'role', header: 'Return line', render: (l) => l.role },
    { key: 'count', header: 'Posted', align: 'right', mono: true, sortValue: (l) => l.count, render: (l) => fmt(l.count) },
  ];

  const options = canon.classes.flatMap((k) =>
    canon.facilities
      .filter((f) => f.class === k.id)
      .map((f) => ({ value: f.id, label: `${f.id}${f.codename ? ` ${f.codename}` : ''} (berthing ${fmt(f.capacity)})` })),
  );

  return (
    <div class="per-view">
      <Fieldset legend="Staffing calculation" no="A">
        <FieldGroup labelWidth="150px">
          <Select block="1" label="Facility" value={facId} options={options} onChange={onFacility} />
          <TextField block="2" label="Fill, % of berthing" value={fillRaw} onInput={onFill} error={null} mono width={90} inputMode="decimal" />
          <TextField block="3" label="Establishment" value={headRaw} onInput={onHead} error={null} mono width={90} inputMode="numeric" />
        </FieldGroup>
        {fillErr ? <FieldMessage>{fillErr}</FieldMessage> : null}
        {headErr ? <FieldMessage>{headErr}</FieldMessage> : null}
        <div class="per-actions" role="group" aria-label="Presets">
          <Button size="small" label="&Posted strength" onClick={() => setAll(fac.staff)} />
          {ph4?.targetPct != null ? <Button size="small" label={`Phase &4 target (${fmt(ph4.targetPct)}%)`} onClick={() => setAll(headcountForFill(fac.capacity, ph4.targetPct!))} /> : null}
          {ph5?.targetPct != null ? <Button size="small" label={`Phase &5 target (${fmt(ph5.targetPct)}%)`} onClick={() => setAll(headcountForFill(fac.capacity, ph5.targetPct!))} /> : null}
          <Button size="small" label="&Full berthing" onClick={() => setAll(fac.capacity)} />
        </div>
      </Fieldset>

      <PropertyGrid
        caption="Result"
        columns={2}
        rows={[
          { label: 'Facility', value: `${fac.id}${fac.codename ? ` ${fac.codename}` : ''}`, mono: true },
          { label: 'Berthing', value: fmt(fac.capacity), mono: true },
          { label: 'Establishment', value: fmt(result.establishment), mono: true },
          { label: 'Fill', value: `${fmt(result.fillPct, 2)}%`, mono: true },
          { label: 'Posted strength', value: fmt(fac.staff), mono: true },
          { label: 'Establishment less posted', value: fmt(result.establishment - fac.staff), mono: true },
          { label: 'Command posts', value: fmt(result.commandPosts), mono: true },
          { label: 'Support to command', value: formatRatio(result.supportToCommand), mono: true },
        ]}
      />

      <Section title="Establishment by function">
        <DataTable
          label="Establishment by function"
          columns={cols}
          rows={result.lines}
          rowKey={(l) => l.function}
          selection="single"
          dense
          footer={
            <tr>
              <td>Total</td>
              <td class="is-right is-mono">{fmt(sumPct)}</td>
              <td class="is-right is-mono">{fmt(sumModel)}</td>
              <td class="is-right is-mono">{fmt(result.establishment)}</td>
            </tr>
          }
        />
        <p class="per-note">Basis: {canon.ratioModel.basis}. Lines are rounded by largest remainder so that they sum to the establishment.</p>
        <p class="per-note">{canon.ratioModel.note}</p>
      </Section>

      <Section title={`Posted strength return, ${fac.id}`}>
        <DataTable
          label={`Posted strength return, ${fac.id}`}
          columns={bcols}
          rows={fac.staffBreakdown}
          rowKey={(l) => l.role}
          selection="none"
          dense
          footer={
            <>
              <tr>
                <td>Total posted staff, {fac.id}</td>
                <td class="is-right is-mono">{fmt(fac.staff)}</td>
              </tr>
              {cmdLine ? (
                <tr>
                  <td>Support to command on return</td>
                  <td class="is-right is-mono">{formatRatio(postedRatio)}</td>
                </tr>
              ) : null}
            </>
          }
        />
      </Section>
    </div>
  );
}
