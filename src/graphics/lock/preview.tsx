/**
 * Rendered check for @graphics/lock. Not shipped: the real lock screen is
 * composed by the shell. `preview.html` shows the lock-screen mock;
 * `preview.html#sheet` shows each component on its own.
 */
import { render } from 'preact';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import './preview.css';
import { Seal } from '../seal/index';
import { AccessCard, DesktopWatermark, LockBackdrop, SelfTestRow, SmartToken } from './index';

const SAMPLE = {
  operatorId: 'T3-RD-04417',
  passphrase: 'LEDGER-QUARRY-52',
  displayName: 'PROBATIONARY TRANSFER, ANALYST (90-DAY)',
  tier: 3,
  site: 'ALPHA-03 / RECORDS DIVISION',
  issued: '05 MAY 2008',
  expires: '31 MAY 2008',
  cardNo: 'TAC-08-004417',
} as const;

function LockMock() {
  return (
    <div class="pv-screen">
      <LockBackdrop />
      <div class="pv-banner">UMBRA/OSC RESTRICTED</div>

      <main class="pv-stage">
        <div class="pv-win" role="dialog" aria-label="MERIDIAN logon">
          <div class="pv-win__title">
            <span>MERIDIAN Workstation Environment 4.1.7 - Workstation Locked</span>
            <span class="pv-win__term">A03-5-114</span>
          </div>

          <div class="pv-win__body">
            <div class="pv-logon">
              <div class="pv-id">
                <div class="pv-id__seal" aria-hidden="true">
                  <Seal size={64} variant="full" />
                </div>
                <div>
                  <div class="pv-id__org">OFFICE OF STRATEGIC CONTINUITY</div>
                  <div class="pv-id__sys">MERIDIAN Workstation Environment</div>
                  <div class="pv-id__rel">Release 4.1.7 · ALPHA-03 Records Division</div>
                </div>
              </div>

              <fieldset class="pv-group">
                <legend>Conditions of use</legend>
                <p>
                  This workstation is provided for the official business of the Office. Use of it, including
                  documents opened, searches made, items printed and commands entered, is recorded and is
                  reviewed by the Office of Internal Assurance without further notice to the operator.
                </p>
                <p>
                  Logging on is taken as acknowledgement of these conditions. If you are not the holder of
                  the access card shown, withdraw the token and inform the duty security officer.
                </p>
              </fieldset>

              <div class="pv-form">
                <label for="pv-op">Operator ID:</label>
                <input id="pv-op" class="pv-input" value="T3-RD-04417" readOnly />
                <label for="pv-pp">Passphrase:</label>
                <input id="pv-pp" class="pv-input" type="password" value="xxxxxxxxxxxxxxxx" readOnly />
                <span class="pv-form__lbl">Token:</span>
                <SmartToken inserted />
              </div>

              <div class="pv-buttons">
                <button type="button" class="pv-btn pv-btn--default">Log On</button>
                <button type="button" class="pv-btn">Clear</button>
                <button type="button" class="pv-btn">Help Desk...</button>
              </div>
            </div>

            <aside class="pv-card">
              <div class="pv-card__cap">Access card on file for this workstation (issued at in-processing):</div>
              <AccessCard {...SAMPLE} />
            </aside>
          </div>

          <div class="pv-win__status">
            <span class="pv-cell pv-cell--grow">Locked. Enter issued credentials to continue.</span>
            <span class="pv-cell">12 MAY 2008</span>
            <span class="pv-cell">1432Z (1032 EDT)</span>
          </div>
        </div>

        <footer class="pv-foot">
          <span>Help Desk ext. 4-0117 (0600-2200 local)</span>
          <a href="#colophon">Colophon: this is a work of fiction</a>
        </footer>
      </main>

      <div class="pv-banner">UMBRA/OSC RESTRICTED</div>
    </div>
  );
}

function Sheet() {
  return (
    <div class="pv-sheet">
      <section>
        <h3>SmartToken inserted / not inserted (180 x 60, shown 1x and 2x)</h3>
        <div class="pv-row">
          <SmartToken inserted />
          <SmartToken inserted={false} />
          <div class="pv-x2"><SmartToken inserted /></div>
          <div class="pv-x2"><SmartToken inserted={false} /></div>
        </div>
      </section>

      <section>
        <h3>SelfTestRow</h3>
        <div class="pv-post" role="list">
          <SelfTestRow label="PROCESSOR 0" status="nominal" detail="2.40 GHz" />
          <SelfTestRow label="MEMORY 2048 MB" status="nominal" />
          <SelfTestRow label="FIXED DISK 0 (ENCRYPTED)" status="nominal" detail="74.5 GB" />
          <SelfTestRow label="REMOVABLE MEDIA BAYS" status="offline" word="SEALED" />
          <SelfTestRow label="TOKEN READER TR-240" status="nominal" word="PRESENT" />
          <SelfTestRow label="NETWORK LINK A (ALPHA-03 RING)" status="degraded" detail="100 Mb" />
          <SelfTestRow label="NETWORK LINK B" status="fault" word="NO CARRIER" />
          <SelfTestRow label="CASE INTRUSION SWITCH" status="pending" />
        </div>
      </section>

      <section>
        <h3>AccessCard at 408px and 300px</h3>
        <div class="pv-row pv-row--top">
          <AccessCard {...SAMPLE} />
          <div style={{ width: '300px' }}>
            <AccessCard {...SAMPLE} />
          </div>
        </div>
      </section>

      <section>
        <h3>DesktopWatermark (left) and LockBackdrop (right)</h3>
        <div class="pv-row">
          <div class="pv-tile"><DesktopWatermark /></div>
          <div class="pv-tile"><LockBackdrop /></div>
        </div>
      </section>
    </div>
  );
}

const root = document.getElementById('root');
if (root) render(location.hash === '#sheet' ? <Sheet /> : <LockMock />, root);
