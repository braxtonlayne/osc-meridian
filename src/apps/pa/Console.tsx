/** Console view: zone selection, message library and script, panel controls, channel queue. */
import type { AccountDef } from '@core/contracts';
import { closeWorldText } from '@core/closed-world';
import type { PaMessage } from '@core/canon-apps/pa';
import { Checkbox, DataTable, ProgressBar, Select, type Column } from '@design/index';
import { KeySwitch, Lamp, PanelFrame, PanelSection, Plate, PushButton, SegmentDisplay, SelectorSwitch } from '@graphics/panel';
import { airtimeMs, allSites, mss, pa, priorityName, type LogRow, type SiteZones } from './model';
import { WithheldBar, ZoneName } from './shared';

export const TEST_MODES = ['OFF', 'MONITOR', 'ZONE'] as const;
export const TONE_ORDER = ['PRE', 'ALERT', 'EVAC', 'SEAL', 'CLEAR'] as const;
export const TONE_LEGEND: Record<(typeof TONE_ORDER)[number], string> = { PRE: 'CHIME', ALERT: 'ALERT', EVAC: 'MUSTER', SEAL: 'SEAL', CLEAR: 'ALL CLEAR' };

export interface ConsoleProps {
  account: AccountDef;
  compact: boolean;
  site: string;
  onSite: (s: string) => void;
  zones: SiteZones | null;
  selection: string[];
  onToggleZone: (id: string, on: boolean) => void;
  allCall: boolean;
  onAllCall: (on: boolean) => void;
  onNetworkLocked: () => void;
  t2: Record<string, string>;
  msgNo: string;
  onMsg: (no: string) => void;
  testMode: number;
  onTestMode: (i: number) => void;
  tone: number;
  onTone: (i: number) => void;
  onBroadcast: () => void;
  onCancel: () => void;
  onTest: () => void;
  /** Calls on air or queued that concern the console's site. */
  channel: LogRow[];
  selectedCall: string | null;
  onSelectCall: (id: string | null) => void;
  now: number;
  isolated: boolean;
  drillHere: boolean;
  testWindow: boolean;
  reduced: boolean;
}

export function Console(p: ConsoleProps) {
  const own = p.account.site;
  const visibleSites = p.account.tier === 4 ? [own] : allSites();
  const message = pa.messages.find((m) => m.no === p.msgNo) ?? pa.messages[0]!;
  const onAir = p.channel.filter((r) => r.status === 'ON AIR');
  const queued = p.channel.filter((r) => r.status === 'QUEUED');
  const subject = pa.system.libraryDocNo;

  return (
    <div class={p.compact ? 'pa-console pa-console--compact' : 'pa-console'}>
      <section class="pa-pane pa-zones" aria-label="Zone selection">
        <div class="pa-pane__head">Zone selection</div>
        <div class="pa-pane__tools">
          <Select
            label="Site"
            value={p.site}
            onChange={p.onSite}
            disabled={visibleSites.length === 1}
            options={visibleSites.map((s) => ({ value: s, label: s === own ? `${s} (this console)` : s }))}
          />
        </div>
        <div class="pa-zonelist" role="group" aria-label={`Zones at ${p.site}`}>
          {p.zones?.zones.map((z) => {
            const checked = p.allCall ? z.kind === 'level' || z.kind === 'unassigned' : p.selection.includes(z.id);
            return (
              <div class={`pa-zone pa-zone--${z.kind}`} key={z.id}>
                <Checkbox
                  checked={checked}
                  disabled={p.allCall}
                  onChange={(on) => p.onToggleZone(z.id, on)}
                  label={
                    <span class="pa-zone__label">
                      <span class="pa-mono">{z.kind === 'area' || z.kind === 'division' ? z.id : `Z${z.zoneNo}`}</span>{' '}
                      <ZoneName zone={z} t2={p.t2} subject={subject} />
                    </span>
                  }
                />
              </div>
            );
          })}
        </div>
        <div class="pa-pane__foot pa-mono">
          {p.allCall ? `ALL-CALL ${p.zones?.allCall.length ?? 0} ZONES` : `${p.selection.length} SELECTED`}
          {p.site !== own && p.isolated ? ' · NOT REACHABLE' : ''}
        </div>
      </section>

      <section class="pa-pane pa-library" aria-label="Message library">
        <div class="pa-pane__head">Message library ({pa.messages.length})</div>
        <DataTable<PaMessage>
          label={`Message library, ${pa.messages.length} messages`}
          rows={pa.messages}
          rowKey={(m) => m.no}
          selection="single"
          selected={[message.no]}
          onSelectionChange={(k) => k[0] && p.onMsg(k[0])}
          dense
          maxHeight={p.compact ? '180px' : '220px'}
          columns={libraryColumns(subject)}
        />
        <div class="pa-script" aria-label={`Script of message ${message.no}`}>
          <div class="pa-script__head">
            <span class="pa-mono">MSG {message.no}</span>
            <span>{priorityName(message.priority)}</span>
            <span class="pa-mono">{mss(airtimeMs(message))}</span>
            <span>
              {message.pre ? `${pa.tones.find((t) => t.id === message.pre)?.name}` : 'No pre-tone'}
              {message.repeat > 1 ? ` · read ${message.repeat} times` : ''}
              {message.post ? ` · ${pa.tones.find((t) => t.id === message.post)?.name}` : ''}
            </span>
          </div>
          <p class="pa-script__text">
            {message.text === null ? (
              <WithheldBar len={Math.round(message.durationSec * 2.6)} subject={subject} />
            ) : (
              message.text
            )}
          </p>
          <div class="pa-script__note">
            {message.use === 'withheld'
              ? `Carried from ${p.account.tier === 4 ? closeWorldText(pa.withheld.carriedFrom, own) : pa.withheld.carriedFrom} only.`
              : message.use === 'operator' || message.use === 'test'
                ? `${p.account.tier === 4 ? '' : `Used at ${message.classes.join(', ')} sites. `}Recorded script; the controller plays the tones and the recording.`
                : `Sent by the zone controller itself on a ${message.use === 'drill' ? 'seal drill' : 'network'} event.`}
          </div>
        </div>
      </section>

      <div class="pa-panelwrap">
        <PanelFrame title={['PUBLIC ADDRESS', 'CONSOLE']} panelNo={`${pa.system.consoleNo} / ${own}`} columns={1}>
          <PanelSection title="STATUS" columns={3}>
            <Lamp legend="ON AIR" lit={onAir.length > 0} color="red" showState />
            <Lamp legend="QUEUED" lit={queued.length > 0} color="amber" showState />
            <Lamp legend="HUB CCTS" lit={!p.isolated} color="green" showState words={{ on: 'UP', off: 'DOWN' }} />
            <Lamp legend="DRILL" lit={p.drillHere} color="amber" showState />
            <Lamp legend="TEST WINDOW" lit={p.testWindow} color="white" showState words={{ on: 'OPEN', off: 'CLOSED' }} />
            <SegmentDisplay value={message.no} digits={2} label="MSG" size="sm" />
          </PanelSection>
          <PanelSection title="ZONES" columns={2}>
            <PushButton legend={['SITE', 'ALL', 'CALL']} mode="latching" pressed={p.allCall} lit={p.allCall} color="amber" onChange={p.onAllCall} tag="PB-1" />
            <KeySwitch
              label="NETWORK ALL-CALL"
              positions={['OFF', 'ALL']}
              value={0}
              keyPresent={false}
              keyNo={pa.networkKey.keyNo}
              onLocked={p.onNetworkLocked}
              tag="KS-1"
            />
          </PanelSection>
          <PanelSection title="CALL" columns={2}>
            <PushButton label="BROADCAST" legend="START" color="red" onPress={p.onBroadcast} tag="PB-2" />
            <PushButton label="CALL" legend="CANCEL" color="black" onPress={p.onCancel} tag="PB-3" />
          </PanelSection>
          <PanelSection title="TONE TEST" columns={p.compact ? 1 : 3}>
            <SelectorSwitch label="MODE" positions={[...TEST_MODES]} value={p.testMode} onChange={p.onTestMode} tag="SS-1" />
            <SelectorSwitch label="TONE" positions={TONE_ORDER.map((t) => TONE_LEGEND[t])} value={p.tone} onChange={p.onTone} tag="SS-2" />
            <PushButton legend="TEST" color="white" onPress={p.onTest} tag="PB-4" />
          </PanelSection>
          <Plate text={`TEST WINDOW ${pa.testWindow.label}`} size="sm" />
        </PanelFrame>
      </div>

      <section class="pa-pane pa-channel" aria-label="Channel queue">
        <div class="pa-pane__head">Channel queue, {p.site}</div>
        <DataTable<LogRow>
          label="Calls on air and queued"
          rows={p.channel}
          rowKey={(r) => r.id}
          selection="single"
          selected={p.selectedCall ? [p.selectedCall] : []}
          onSelectionChange={(k) => p.onSelectCall(k[0] ?? null)}
          dense
          maxHeight="160px"
          sortRows={false}
          empty={<div class="pa-empty">No calls on air or queued for {p.site}. Channel idle.</div>}
          columns={channelColumns(p.now, p.reduced)}
        />
      </section>
    </div>
  );
}

function libraryColumns(subject: string): Column<PaMessage>[] {
  return [
    { key: 'no', header: 'No.', width: 40, mono: true },
    {
      key: 'title',
      header: 'Title',
      render: (m) => (m.title === null ? <WithheldBar len={22} subject={subject} /> : m.title),
      sortValue: (m) => m.title ?? '',
    },
    { key: 'priority', header: 'Pri', width: 40, mono: true, render: (m) => `P${m.priority}`, title: 'Priority' },
    { key: 'air', header: 'Air', width: 50, mono: true, align: 'right', render: (m) => mss(airtimeMs(m)), sortValue: (m) => airtimeMs(m), title: 'Airtime' },
  ];
}

function channelColumns(now: number, reduced: boolean): Column<LogRow>[] {
  return [
    { key: 'id', header: 'Call', width: 110, mono: true },
    { key: 'time', header: 'Time', width: 56, mono: true },
    { key: 'msg', header: 'Msg', width: 40, mono: true },
    { key: 'zones', header: 'Zones', render: (r) => r.zones.join(' '), mono: true },
    { key: 'priority', header: 'Pri', width: 40, mono: true, render: (r) => `P${r.priority}` },
    {
      key: 'status',
      header: 'Status',
      width: 170,
      render: (r) =>
        r.status === 'ON AIR' && r.start != null && r.end != null ? (
          <ProgressBar label="ON AIR" value={Math.min(r.end - r.start, Math.max(0, now - r.start))} max={r.end - r.start} segments={reduced ? 8 : 12} />
        ) : (
          r.status
        ),
    },
  ];
}

