import { describe, expect, it } from 'vitest';
import canonJson from '@canon';
import type { Canon, FacilityId } from '@core/canon-types';
import { canonModel, createSim } from '@sim/transit-sim';
import { seg04Phase } from '@sim/seg04';
import { blockAt, blockId, expandDay, firstSerialOn, incNo, parseBlockSheet, parseTimetable, drawnBlockOf, diagramBlockCounts, speedOf, statusOf, withBlockSheets, type BlockSheet, type TimetableInput } from '@sim/transit-model';
import { hhmmLocal, parseZ, zoneForState } from '@sim/time';

const canon = canonJson as unknown as Canon;
const model = canonModel();
const SEG04_TEXT = 'Twelve block sections, numbered from the ALPHA-05 end: 04-01 (ALPHA-05 platform 7 throat) to 04-12 (ALPHA-02 platform 3 throat).';
const SHEETS: Record<string, BlockSheet> = {
  '01': { blocks: 6, origin: 'ALPHA-01' as FacilityId },
  '04': { blocks: 12, origin: 'ALPHA-05' as FacilityId },
};

const TT: TimetableInput = {
  source: 'OSC-TRN-TT-08-02',
  tables: [
    [
      ['Seg', 'Path', 'Departs', 'Arrives', 'Consist', 'Running time (h)'],
      ['01', '1D01', 'ALPHA-01 1100Z (0700 EDT)', 'ALPHA-03 1306Z (0906 EDT)', 'R01-214', '2.1'],
      ['01', '1U02', 'ALPHA-03 1400Z (1000 EDT)', 'ALPHA-01 1606Z (1206 EDT)', 'R01-214', '2.1'],
      ['03', '3U02', 'ALPHA-04 2130Z (1430 PDT)', 'ALPHA-02 0142Z (1942 MDT)', 'R03-052', '4.2'],
      ['04', '', 'No paths. Not in revenue service.', '', '', ''],
      ['05', '5D01', 'ALPHA-03 1230Z (0830 EDT)', 'ALPHA-05 1836Z (1336 CDT)', 'R05-031', '6.1'],
      ['05', '5D03', 'ALPHA-03 2030Z (1630 EDT)', 'ALPHA-05 0236Z (2136 CDT)', 'R05-031', '6.1'],
    ],
    [
      ['Link', 'Paths each way', 'First departure from hub end', 'Standard consist', 'Notes'],
      ['ALPHA-03 to BETA-09', '2', '1100Z (0700 EDT)', 'TCE-011', 'Second path 2300Z (1900 EDT) Monday, Wednesday, Friday only'],
      ['BETA-09 to GAMMA-10', '2', '0900Z (0400 CDT)', 'TCE-014', 'Shuttle'],
    ],
  ],
  text: 'Dwell at hub platforms is 20 minutes for rail and 10 minutes for tram unless shown otherwise. Saturday and Sunday: first path in each direction only, except Segment 01, which keeps its full pattern. ALPHA-01 to BETA-01, 1 path each way, TEA-031.',
};

describe('transit model', () => {
  it('reads line speeds from canon text', () => {
    expect(speedOf(canon.transitTech.railSpeed!)).toBe(180);
    expect(model.railSpeed).toBe(180);
    expect(model.tramSpeed).toBe(90);
  });

  it('reads block arrangements from segment sheet text', () => {
    expect(parseBlockSheet('04', SEG04_TEXT)).toEqual({ blocks: 12, origin: 'ALPHA-05' });
    expect(parseBlockSheet('01', 'Six block sections, numbered from the ALPHA-01 end. Board designation 01-01 to 01-06.')).toEqual({ blocks: 6, origin: 'ALPHA-01' });
    expect(parseBlockSheet('06', 'Block sections. Twenty, 06-01 at ALPHA-01 to 06-20 at ALPHA-05.')).toEqual({ blocks: 20, origin: 'ALPHA-01' });
    const m = withBlockSheets(model, SHEETS);
    expect(m.byKey['01']!.blocks).toBe(6);
    expect(m.byKey['01']!.fromA).toBe(true);
    expect(blockAt(m.byKey['01']!, 0.01)).toBe(1);
  });

  it('gives segment 04 twelve blocks from the ALPHA-05 end, out of service', () => {
    const s = withBlockSheets(model, SHEETS).byKey['04']!;
    expect(s.blocks).toBe(12);
    expect(s.inService).toBe(false);
    expect(blockId(s, 7)).toBe('04-07');
    // chainage from the ALPHA-05 (b) end
    expect(blockAt(s, 0.99)).toBe(1);
    expect(blockAt(s, 0)).toBe(12);
    // drawn from the canon a end: block 1 (ALPHA-05 end) is the last drawn block
    expect(drawnBlockOf(s, 1)).toBe(12);
    expect(drawnBlockOf(s, 12)).toBe(1);
    expect(diagramBlockCounts(withBlockSheets(model, SHEETS))['04']).toBe(12);
  });

  it('parses the working timetable', () => {
    const tt = parseTimetable(TT, model);
    expect(tt.rail.map((p) => p.id)).toEqual(['1D01', '1U02', '3U02', '5D01', '5D03']);
    expect(tt.rail[2]!.arrMin).toBe(1440 + 102);
    expect(tt.noPaths).toEqual(['04']);
    expect(tt.dwellTramMin).toBe(10);
    expect(tt.weekendFullSegments).toEqual(['01']);
    const a = tt.tram.find((p) => p.link === 'ALPHA-03>BETA-09')!;
    expect(a.secondDepMin).toBe(23 * 60);
    expect(a.secondDays).toEqual([1, 3, 5]);
    expect(tt.tram.find((p) => p.link === 'ALPHA-01>BETA-01')?.consist).toBe('TEA-031');
  });

  it('runs at line speed against the booked time', () => {
    const tt = parseTimetable(TT, model);
    const day = Date.UTC(2026, 10, 19);
    const moves = expandDay(model, tt, day, 1);
    const m = moves.find((x) => x.pathId === '1D01')!;
    expect((m.bookedArrMs - m.depMs) / 60_000).toBe(126);
    // 387 mi at 180 mph = 129 min: three minutes behind the booked time
    expect(Math.round((m.expArrMs - m.depMs) / 60_000)).toBe(129);
    expect(statusOf(m, m.depMs - 1)).toBe('BOOKED');
    expect(statusOf(m, m.depMs + 1)).toBe('RUNNING');
    expect(moves.some((x) => x.link === '04')).toBe(false);
  });

  it('applies the weekend rule and day-specific tram paths', () => {
    const tt = parseTimetable(TT, model);
    const day = Date.UTC(2026, 10, 22);
    const sat = expandDay(model, tt, day, 6);
    expect(sat.filter((m) => m.link === '05').map((m) => m.pathId)).toEqual(['5D01']);
    expect(sat.filter((m) => m.link === '01')).toHaveLength(2);
    expect(sat.filter((m) => m.link === 'ALPHA-03>BETA-09')).toHaveLength(2);
    const mon = expandDay(model, tt, day, 1);
    expect(mon.filter((m) => m.link === 'ALPHA-03>BETA-09')).toHaveLength(4);
  });

  it('places a running consist and occupies its block', () => {
    const sim = createSim();
    const tt = parseTimetable(TT, model);
    const now = Date.UTC(2026, 10, 19, 12, 0);
    const st = sim.state(now, { timetable: tt, seg04: null, logBase: null, places: [], sheets: SHEETS });
    const t = st.trains.find((x) => x.pathId === '1D01')!;
    expect(t.dir).toBe(1);
    expect(t.pos).toBeGreaterThan(0.4);
    expect(t.pos).toBeLessThan(0.5);
    expect(st.blocks[t.block]).toBe('OCCUPIED');
    expect(t.runningMin).toBe(3);
    expect(st.occupancy['04']).toBe('DARK');
  });

  it('draws the segment 04 movement from the engine window and keeps the serial gap', () => {
    const sim = createSim();
    const start = Date.UTC(2026, 10, 19, 21, 31);
    const w = { start, end: start + 150_000 };
    const during = sim.state(start + 30_000, { timetable: null, seg04: w, logBase: { serial: 17, day: 14 }, places: [], sheets: SHEETS });
    const u = during.trains.find((x) => x.unbooked)!;
    expect(u.label).toBe('R04-***');
    expect(u.speed).toBeNull();
    expect(during.blocks['04-02']).toBe('OCCUPIED');
    expect(during.blocks['04-03']).toBe('OCCUPIED');
    expect(during.log.some((e) => e.transient && /SEG 04 BLK 04-03 OCCUPIED CONSIST R04-\*\*\* NO BOOKING/.test(e.text))).toBe(true);
    const held = sim.state(start + 170_000, { timetable: null, seg04: w, logBase: { serial: 17, day: 14 }, places: [], sheets: SHEETS });
    expect(held.trains.some((x) => x.unbooked)).toBe(false);
    expect(held.log.some((e) => e.transient)).toBe(true);
    const later = sim.state(start + 3 * 3600_000, { timetable: null, seg04: null, logBase: { serial: 17, day: 14 }, places: [], sheets: SHEETS });
    expect(later.log.some((e) => e.transient)).toBe(false);
  });

  it('numbers routine log entries after the filed serial', () => {
    expect(firstSerialOn(15, { serial: 17, day: 14 })).toBe(18);
    expect(incNo(18)).toBe('INC-08-018');
  });

  it('segment 04 phase runs from the ALPHA-05 end', () => {
    const w = { start: 0, end: 150_000 };
    expect(seg04Phase(w, 1).lit).toEqual([1]);
    expect(seg04Phase(w, 1).posFromA).toBeGreaterThan(0.99);
    expect(seg04Phase(w, 149_999).lit).toEqual([11, 12]);
    expect(seg04Phase(w, 150_000).active).toBe(false);
    expect(seg04Phase(w, 209_999).logged).toBe(true);
    expect(seg04Phase(w, 210_000).logged).toBe(false);
  });

  it('formats times', () => {
    expect(parseZ('ALPHA-01 1100Z (0700 EDT)')).toBe(660);
    expect(hhmmLocal(Date.UTC(2026, 0, 1, 21, 31), zoneForState('TX'))).toBe('1631 CDT');
  });
});
