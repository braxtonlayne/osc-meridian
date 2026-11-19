/**
 * Preview harness for @graphics/scan. Not shipped.
 * Serve with `npx vite` and open /src/graphics/scan/preview.html, or run
 * `node src/graphics/scan/check/render.mjs` to write PNGs into check/.
 */
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/700.css';
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Handwriting, HAND_IDS, MarginNote, RoutingSlip, ScanPage, enhanceScans } from './index';

const typed = { fontFamily: 'var(--font-typed)', fontSize: '12.5px', lineHeight: '17px' } as const;
const para = { margin: '0 0 12px' } as const;

function Memo() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? enhanceScans(ref.current) : undefined), []);
  return (
    <div ref={ref} id="memo" style={{ padding: '6px 10px 10px' }}>
      <ScanPage seed={7} rotate={-0.6}>
        <RoutingSlip
          seed={4}
          entries={[
            { to: 'J. HALVERSEN', room: 'B-214', initials: 'JH', date: '5/2' },
            { to: 'M. K. BRANDT', room: 'B-031', initials: 'MKB', date: '5/5' },
            { to: 'R. TOLLIVER', room: 'A-118', initials: 'RT', date: '5/6' },
            { to: 'RECORDS', room: 'C-002' },
          ]}
          actions={['NOTE AND RETURN', 'SEE ME']}
          remarks="see me"
          from="TD/ENG"
          date="30 APR 2008"
        />
        <div style={typed}>
          <p style={{ ...para, textAlign: 'center', fontWeight: 700 }}>MEMORANDUM</p>
          <p style={para}>
            TO:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Director, Transit Division
            <br />
            FROM:&nbsp;&nbsp;&nbsp;&nbsp;Chief, Engineering Records
            <br />
            DATE:&nbsp;&nbsp;&nbsp;&nbsp;30 APR 2008
            <br />
            SUBJECT: Reconciliation of Certified Route Mileage
          </p>
          <p style={para}>
            1. The annual statement to the Council carries the certified figure for constructed route. That figure has not changed since the last
            certification.
          </p>
          <MarginNote hand="RT" seed={3} mark="arrow-left">
            which is it?
          </MarginNote>
          <p style={para}>
            2. Certified route mileage as reported stands at <span data-ink="circle" data-hand="RT" data-seed="5">847</span> miles. The engineering
            tables maintained by this office show 6,074 miles of rail and 10,538 miles of tram.
          </p>
          <p style={para}>
            3. This office does not hold the working papers for the certified figure and cannot state what it measures. The engineering tables are
            surveyed quarterly and are <span data-ink="underline" data-hand="RT" data-seed="2">current</span>.
          </p>
          <MarginNote hand="MKB" seed={5}>
            not ours
          </MarginNote>
          <p style={para}>4. Request direction on which figure is to appear in the next statement. No action will be taken pending reply.</p>
          <MarginNote hand="JH" seed={11} mark="underline">
            file w/ 08-114
          </MarginNote>
          <p style={{ ...para, marginTop: '30px' }}>
            Chief, Engineering Records
            <br />
            Attachment: Table 4 (2 pages)
          </p>
        </div>
      </ScanPage>
    </div>
  );
}

/** The same kit driven only by pipeline-shaped HTML and enhanceScans(). */
const PIPELINE_HTML = `
<div class="scan-page" data-seed="19" data-rotate="0.5">
  <div class="routing-slip" data-initials="JH,MKB" data-date="2008-05-02"></div>
  <div style="font-family: var(--font-typed); font-size: 12.5px; line-height: 17px">
    <p style="margin:0 0 12px; font-weight:700">FACILITY INVENTORY: EXTRACT</p>
    <aside class="margin-note" data-hand="JH" data-seed="2">790?</aside>
    <p style="margin:0 0 12px">Sheet 14 of 31. Entries below are carried forward from the preceding sheet without amendment.</p>
    <aside class="margin-note" data-hand="RT" data-seed="8" data-mark="circle">see me</aside>
    <p style="margin:0 0 12px">NO ELECTRONIC COPIES PERMITTED. Reproduction by the originating office only. Return to Records Division on completion of review.</p>
    <p style="margin:0 0 12px">Custodian certifies that the count on this sheet agrees with the bound register as of the date shown.</p>
  </div>
</div>`;

function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? enhanceScans(ref.current) : undefined), []);
  return <div ref={ref} id="pipeline" style={{ padding: '6px 10px 10px' }} dangerouslySetInnerHTML={{ __html: PIPELINE_HTML }} />;
}

const PHRASES = ['which is it?', 'see me', 'file w/ 08-114', 'not ours', '790?', 'JH 5/2'];
const SHEET = ['abcdefghijklm', 'nopqrstuvwxyz', 'ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', "0123456789 ? ! . , - / ' : ( ) + = & #"];

function Alphabet() {
  return (
    <div id="alphabet" style={{ background: 'var(--paper)', padding: '14px 18px', width: '900px', boxSizing: 'border-box' }}>
      {HAND_IDS.map((hand) => (
        <div key={hand} style={{ marginBottom: '14px', borderBottom: '1px solid var(--rule)', paddingBottom: '10px' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>hand: {hand}</div>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>
            <div>
              {SHEET.map((line, i) => (
                <div key={i} style={{ height: '30px' }}>
                  <Handwriting text={line} hand={hand} seed={1} size={1.15} />
                </div>
              ))}
            </div>
            <div>
              {PHRASES.map((p, i) => (
                <div key={p} style={{ height: '27px' }}>
                  <Handwriting text={p} hand={hand} seed={i + 1} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ height: '34px' }}>
                <Handwriting text="see me" hand={hand} seed={4} mark="circle" />
              </div>
              <div style={{ height: '30px' }}>
                <Handwriting text="not ours" hand={hand} seed={4} mark="underline" />
              </div>
              <div style={{ height: '30px' }}>
                <Handwriting text="790?" hand={hand} seed={4} mark="arrow-left" />
              </div>
              <div style={{ height: '30px' }}>
                <Handwriting text="which is it?" hand={hand} seed={9} mark="arrow-right" />
              </div>
            </div>
          </div>
        </div>
      ))}
      <div style={{ fontWeight: 700, marginBottom: '4px' }}>derived hands (any initials): PQ, LSD, AW</div>
      <div style={{ display: 'flex', gap: '28px' }}>
        {['PQ', 'LSD', 'AW'].map((h) => (
          <Handwriting key={h} text={`${h} 5/9 noted`} hand={h} seed={2} />
        ))}
      </div>
    </div>
  );
}

function Slip() {
  return (
    <div id="slip" style={{ background: 'var(--paper)', padding: '16px', display: 'inline-block' }}>
      <RoutingSlip
        seed={12}
        entries={[
          { to: 'J. HALVERSEN', room: 'B-214', initials: 'JH', date: '5/2' },
          { to: 'M. K. BRANDT', room: 'B-031', initials: 'MKB', date: '5/5' },
          { to: 'R. TOLLIVER', room: 'A-118' },
        ]}
        actions={['FILE', 'INFORMATION']}
        remarks="file w/ 08-114"
        from="RD/REC"
        date="2 MAY 2008"
      />
    </div>
  );
}

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: 'flex-start' }}>
      <div style={{ width: '720px' }}>
        <Memo />
      </div>
      <div style={{ width: '720px' }}>
        <Pipeline />
      </div>
      <Slip />
      <Alphabet />
    </div>
  );
}

const app = document.getElementById('app');
if (app) render(<App />, app);
void document.fonts.ready.then(() => document.body.setAttribute('data-ready', ''));
