/** Workstation settings: every control writes services.settings (or refuses, in-world). */
import { useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import { narrowViewport, handheldActive } from '@core/services';
import { IDLE_TIMEOUT_MS } from '@core/session';
import { Button, ButtonRow, Checkbox, Dialog, GroupBox, PropertyGrid, RadioGroup, StatusLight } from '@design/index';
import { doLock } from '@shell/state';
import { useSys } from '../ctx';
import { WithRecord } from './WithRecord';

const systemPrefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Settings({ entry }: { entry: RouteEntry | null }) {
  return (
    <WithRecord entry={entry} label="Settings">
      <SettingsPanel />
    </WithRecord>
  );
}

function SettingsPanel() {
  const { services, say } = useSys();
  const s = services.settings;
  const [dialog, setDialog] = useState<'interval' | 'defaults' | null>(null);
  const lockMin = Math.round(IDLE_TIMEOUT_MS / 60000);

  const set = (key: 'sound' | 'density' | 'reducedMotion' | 'handheld', value: unknown, text: string) => {
    s.set(key, value);
    say(`${text} Saved to the workstation profile for operator ${services.session.operatorId.peek()}.`);
  };

  const testCue = () => {
    if (!s.sound.value) {
      say('Sound cues are off. Select "Play sound cues" to hear the test cue.');
      return;
    }
    services.sound.play('mail');
    say('Test cue played (message arrival).');
  };

  const width = typeof innerWidth === 'number' ? innerWidth : 0;

  return (
    <div class="sys-pad sys-settings">
      <GroupBox title="Sound">
        <Checkbox label="Play sound cues" checked={s.sound.value} onChange={(v) => set('sound', v, v ? 'Sound cues on.' : 'Sound cues off.')} />
        <p class="sys-note">Window open, refusal, message arrival and token reader cues are synthesised at this workstation. Nothing is recorded. Off by default.</p>
        <ButtonRow align="left">
          <Button size="small" label="&Test cue" onClick={testCue} />
        </ButtonRow>
      </GroupBox>

      <GroupBox title="Display density">
        <RadioGroup
          legend="Row and control spacing"
          name="sys-density"
          inline
          value={s.density.value}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'compact', label: 'Compact' },
          ]}
          onChange={(v) => set('density', v, v === 'compact' ? 'Compact density applied.' : 'Standard density applied.')}
        />
        <p class="sys-note">Compact reduces row height in tables, trees and menus. Type size is unchanged.</p>
      </GroupBox>

      <GroupBox title="Motion">
        <Checkbox
          label="Reduce motion"
          checked={s.reducedMotion.value}
          onChange={(v) => set('reducedMotion', v, v ? 'Window zoom and progress animation turned off.' : 'Window zoom and progress animation turned on.')}
        />
        <p class="sys-note">
          Turns off the window open outline and segmented progress animation. The operating system preference on this workstation is{' '}
          {systemPrefersReduced() ? 'reduce motion' : 'no preference'}.
        </p>
      </GroupBox>

      <GroupBox title="Field handheld mode">
        <RadioGroup
          legend="Layout"
          name="sys-handheld"
          inline
          value={s.handheld.value}
          options={[
            { value: 'auto', label: 'Automatic' },
            { value: 'on', label: 'Always' },
            { value: 'off', label: 'Never' },
          ]}
          onChange={(v) =>
            set('handheld', v, v === 'auto' ? 'Handheld layout follows the display width.' : v === 'on' ? 'Handheld layout forced on.' : 'Handheld layout forced off.')
          }
        />
        <p class="sys-note">
          Handheld layout shows one window at a time with an application switcher. Automatic selects it on displays narrower than 900 pixels.{' '}
          <StatusLight status="NOMINAL" word={handheldActive.value ? 'HANDHELD' : 'DESKTOP'} note={`display ${narrowViewport.value ? 'narrow' : 'wide'}${width ? `, ${width} px` : ''}`} />
        </p>
      </GroupBox>

      <GroupBox title="Session lock">
        <PropertyGrid
          rows={[
            { label: 'Idle lock after', value: `${lockMin} minutes without input` },
            { label: 'Set by', value: 'Workstation accreditation (OSC-DIR-0301)' },
            { label: 'On lock', value: 'Open windows are retained; token and passphrase required to resume' },
          ]}
        />
        <ButtonRow align="left">
          <Button size="small" label="Change &interval..." onClick={() => setDialog('interval')} />
          <Button size="small" label="&Lock workstation now" onClick={() => doLock()} />
        </ButtonRow>
      </GroupBox>

      <ButtonRow align="left">
        <Button label="&Restore defaults..." onClick={() => setDialog('defaults')} />
      </ButtonRow>

      <Dialog
        open={dialog === 'interval'}
        title="Session lock"
        kind="info"
        reference="OSC-DIR-0301"
        onOpen={() => services.sound.play('error')}
        onClose={() => setDialog(null)}
        buttons={[{ label: 'OK', value: 'ok', isDefault: true, isCancel: true }]}
      >
        <p>
          The idle lock interval is fixed by the workstation accreditation at {lockMin} minutes and cannot be changed by the operator. Requests for a variation are made by the
          division head to Communications Security.
        </p>
      </Dialog>
      <Dialog
        open={dialog === 'defaults'}
        title="Restore defaults"
        kind="question"
        onClose={(v) => {
          setDialog(null);
          if (v !== 'yes') return;
          s.set('sound', false);
          s.set('density', 'standard');
          s.set('reducedMotion', systemPrefersReduced());
          s.set('handheld', 'auto');
          say('Workstation defaults restored: sound off, standard density, motion per operating system, handheld automatic.');
        }}
        buttons={[
          { label: '&Restore', value: 'yes', isDefault: true },
          { label: 'Cancel', value: 'no', isCancel: true },
        ]}
      >
        <p>Restore sound, density, motion and handheld settings to the workstation defaults?</p>
      </Dialog>
    </div>
  );
}
