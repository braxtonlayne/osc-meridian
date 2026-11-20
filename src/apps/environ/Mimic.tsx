/**
 * Air path mimic for one GAMMA site, drawn with the panel kit's mimic helpers: outside air,
 * makeup damper, filter banks (CBRN path), mixing plenum, the two AHUs, the zones, the return
 * main with the scrubber side stream, and relief. Lines carry flow chevrons when air moves.
 */
import { MimicBox, MimicJunction, MimicLine, MimicSvg, type MimicState } from '@graphics/panel';
import type { EnvironControls, EnvironPlant } from './types';
import type { Readings } from './model';
import { EC, LEVEL_NAMES } from './plant';

const W = 760;
const H = 250;

function flow(on: boolean): MimicState {
  return on ? 'flow' : 'dead';
}

export function AirMimic({ controls, plant, r }: { controls: EnvironControls; plant: EnvironPlant; r: Readings }) {
  const makeupIn = r.makeupM3h > 0;
  const cbrn = controls.filtration.mode === 'cbrn';
  const bank = controls.filtration.bank;
  const ahuOn = (id: string) => (controls.ahu[id] ?? 0) > 0;
  const zoneY = [22, 62, 132];
  const zoneOrder = EC.zones.map((z, i) => ({ z, i }));
  const trainY = 188;
  const trains = EC.scrubbers.trains;
  const anyAhu = EC.ahus.some((a) => ahuOn(a.id));
  const scrubAhu = EC.zones.reduce((b, z) => (z.personShare > b.personShare ? z : b), EC.zones[0]!).ahu;

  return (
    <MimicSvg width={W} height={H} label={`Air path mimic, ${EC.site}: makeup air ${makeupIn ? 'admitted' : 'shut'}, filtration ${cbrn ? `CBRN on bank ${bank}` : 'normal'}`}>
      {/* Outside air and makeup damper */}
      <text x={10} y={40} class="env-mimic-t">OUTSIDE AIR</text>
      <MimicLine points={[[10, 52], [92, 52]]} state={flow(makeupIn)} />
      <MimicBox x={92} y={41} w={60} label={`${EC.makeup.tag} ${r.makeupClosedBySeal ? 'SEAL' : (EC.makeup.positions[controls.makeup]?.id ?? '')}`} on={makeupIn && !cbrn} />
      {/* Normal path */}
      <MimicLine points={[[152, 52], [330, 52]]} state={flow(makeupIn && !cbrn)} />
      {/* CBRN path through the selected filter bank */}
      <MimicLine points={[[60, 52], [60, 108], [180, 108]]} state={flow(makeupIn && cbrn && bank === 'A')} />
      <MimicLine points={[[60, 108], [60, 148], [180, 148]]} state={flow(makeupIn && cbrn && bank === 'B')} />
      <MimicJunction x={60} y={52} />
      <MimicBox x={180} y={97} w={110} label="BANK A PRE/HEPA/C" on={makeupIn && cbrn && bank === 'A'} />
      <MimicBox x={180} y={137} w={110} label="BANK B PRE/HEPA/C" on={makeupIn && cbrn && bank === 'B'} />
      <MimicLine points={[[290, 108], [310, 108], [310, 64], [330, 64]]} state={flow(makeupIn && cbrn && bank === 'A')} />
      <MimicLine points={[[290, 148], [316, 148], [316, 68], [330, 68]]} state={flow(makeupIn && cbrn && bank === 'B')} />
      {/* Plenum */}
      <MimicBox x={330} y={44} w={70} h={30} label="MIX PLENUM" on={anyAhu} />
      {/* AHUs */}
      {EC.ahus.map((a, k) => {
        const y = k === 0 ? 30 : 120;
        return (
          <g key={a.id}>
            <MimicLine points={[[400, 59], [420, 59], [420, y + 11], [460, y + 11]]} state={flow(ahuOn(a.id))} />
            <MimicBox x={460} y={y} w={70} label={`${a.id} ${EC.fanSpeeds[controls.ahu[a.id] ?? 0]?.pos ?? ''}`} on={ahuOn(a.id)} />
          </g>
        );
      })}
      {/* Zones */}
      {zoneOrder.map(({ z, i }) => {
        const k = EC.ahus.findIndex((a) => a.id === z.ahu);
        const ay = (k === 0 ? 30 : 120) + 11;
        const y = zoneY[i] ?? 22;
        return (
          <g key={z.id}>
            <MimicLine points={[[530, ay], [560, ay], [560, y + 11], [596, y + 11]]} state={flow(ahuOn(z.ahu))} />
            <MimicBox x={596} y={y} w={84} label={`${z.id} ${(LEVEL_NAMES[z.level] ?? '').split(' ')[0] ?? ''}`} on={ahuOn(z.ahu)} />
            <text x={690} y={y + 7} class="env-mimic-t env-mimic-v">{Math.round(r.zoneCo2[i] ?? plant.co2Ppm)}</text>
          </g>
        );
      })}
      <text x={680} y={12} class="env-mimic-t">CO2 PPM</text>
      {/* Return main */}
      <MimicLine points={[[748, 33], [748, 226], [365, 226], [365, 74]]} state={flow(anyAhu)} />
      {zoneOrder.map(({ i }) => (
        <MimicLine key={i} points={[[680, (zoneY[i] ?? 22) + 11], [748, (zoneY[i] ?? 22) + 11]]} state={flow(anyAhu)} weight={2} />
      ))}
      {/* Scrubber side stream off the return, back to the AHU serving the shelter hall */}
      {trains.map((t, k) => {
        const tr = plant.trains[t.id];
        const x = 430 + k * 110;
        const on = tr?.phase === 'adsorb' && ahuOn(scrubAhu);
        return (
          <g key={t.id}>
            <MimicLine points={[[x + 35, 226], [x + 35, trainY + 22]]} state={flow(on)} weight={2} />
            <MimicBox x={x} y={trainY} w={70} label={`${t.id} ${(tr?.phase ?? 'off').toUpperCase()}`} on={on} />
            <MimicLine points={[[x + 35, trainY], [x + 35, 176], [450, 176], [450, 142], [460, 142]]} state={flow(on)} weight={2} />
          </g>
        );
      })}
      {/* Relief */}
      <MimicLine points={[[365, 226], [20, 226]]} state={flow(makeupIn)} weight={2} />
      <text x={10} y={218} class="env-mimic-t">RELIEF TO ATMOSPHERE</text>
    </MimicSvg>
  );
}
