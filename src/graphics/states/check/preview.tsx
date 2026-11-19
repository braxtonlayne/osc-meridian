/**
 * Rendered check for @graphics/states. Bundled and screenshotted by render.mjs;
 * not imported by the application. The window frame and token values here are
 * stand-ins for the design system (values from docs/SPEC.md section 4).
 */
import type { ComponentChildren, JSX } from 'preact';
import { render } from 'preact';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/source-serif-4/400.css';
import {
  EmptyFolder,
  EmptyMailFolder,
  EmptyPrintQueue,
  EmptySearchResults,
  EmptyState,
  ErrorState,
  PathNotFound,
  RedactionBar,
  RefusalState,
  StateButton,
  StateGlyph,
  WithheldBlock,
} from '../index';
import type { StateGlyphId } from '../index';

const noop = (): void => undefined;

function Frame({
  id,
  title,
  children,
  w = 640,
  h = 420,
  status,
}: {
  id: string;
  title: string;
  children: ComponentChildren;
  w?: number;
  h?: number;
  status?: string;
}): JSX.Element {
  return (
    <div class="ck-win" id={id} style={{ width: `${w}px`, height: `${h}px` }}>
      <div class="ck-title">
        <span>{title}</span>
        <span class="ck-title__btns">
          <i>_</i>
          <i>□</i>
          <i>×</i>
        </span>
      </div>
      <div class="ck-menu">
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Record</span>
        <span>Help</span>
      </div>
      <div class="ck-content">{children}</div>
      <div class="ck-status">{status ?? 'Ready'}</div>
    </div>
  );
}

const GLYPHS: StateGlyphId[] = ['locked', 'tray', 'folder', 'search', 'printer', 'mail', 'error', 'path'];

function Sheet(): JSX.Element {
  return (
    <div class="ck-sheet">
      <Frame id="refusal" title="OSC-DIR-0412 - Directives" status="Record not opened">
        <RefusalState
          authority="Records Division (RD/ALPHA-03)"
          reference="DIR-0412"
          reason="This record is released only to operators who have received the Tier 2 compartment briefing."
          requirement="Tier 2 compartment briefing"
          docNo="OSC-DIR-0412"
          onRequestAccess={noop}
        />
      </Frame>

      <Frame id="refusal-min" title="Personnel" status="Record not opened">
        <RefusalState authority="OIA" reference="OIA-08-114" reason="Requires Tier 3. Reference OIA-08-114." />
      </Frame>

      <Frame id="refusal-compact" title="Records - Folder contents" status="3 items">
        <div class="ck-list">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Title</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="st-mono">OSC-MEM-08-0211</td>
                <td>Reconciliation of posted strength, first quarter</td>
                <td>Released</td>
              </tr>
              <tr>
                <td class="st-mono">OSC-DIR-0412</td>
                <td colSpan={2}>
                  <RefusalState
                    compact
                    authority="RD"
                    reference="DIR-0412"
                    reason="Requires Tier 2 compartment briefing."
                    onRequestAccess={noop}
                  />
                </td>
              </tr>
              <tr>
                <td class="st-mono">OSC-DIR-0398</td>
                <td colSpan={2}>
                  <RefusalState compact authority="CSO" reference="CSO-07-031" reason="Requires Tier 3." />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Frame>

      <Frame id="empty-folder" title="Records - Pending Review" status="0 items">
        <EmptyFolder />
      </Frame>
      <Frame id="empty-search" title="Records Search" status="0 records">
        <EmptySearchResults query="segment 04 revenue" />
      </Frame>
      <Frame id="empty-print" title="Print Queue - PRN-A03-2" status="0 jobs">
        <EmptyPrintQueue device="PRN-A03-2" />
      </Frame>
      <Frame id="empty-mail" title="Message Traffic - Deferred" status="0 messages">
        <EmptyMailFolder folder="Deferred" />
      </Frame>
      <Frame id="empty-generic" title="Forms - Submitted" status="0 items">
        <EmptyState title="No forms have been submitted from this workstation." />
      </Frame>

      <Frame id="error" title="Record Viewer" status="Error">
        <ErrorState
          code="MERIDIAN-0x0417"
          title="Viewer could not render the requested record"
          body="The record was located but its page image could not be prepared for display. The record itself is unaffected. Close this window and open the record again."
        />
      </Frame>
      <Frame id="error-open" title="Record Viewer" status="Error">
        <ErrorState
          code="MERIDIAN-0x0417"
          title="Viewer could not render the requested record"
          body="The record was located but its page image could not be prepared for display. The record itself is unaffected. Close this window and open the record again."
          defaultOpen
          actions={<StateButton onClick={noop}>Retry</StateButton>}
        />
      </Frame>

      <Frame id="path" title="MERIDIAN" status="Address not resolved">
        <PathNotFound path="/directives/dir-0413/annex-b" onSearch={noop} onHome={noop} />
      </Frame>

      <Frame id="withheld" title="OSC-MEM-08-0211 - Records" status="Page 2 of 3" h={460}>
        <div class="ck-doc">
          <p>
            3. The difference between posted strength and tier totals was raised with{' '}
            <RedactionBar chars={17} authority="OIA" reference="OIA-08-114" /> on 14 April. The reply stated that{' '}
            <RedactionBar chars={96} authority="OIA" reference="OIA-08-114" variant="sentence" /> and that the query
            should be regarded as closed.
          </p>
          <WithheldBlock authority="CSO" reference="CSO-08-022" lines={7} label="4. Disposition of unposted personnel" />
          <table class="ck-doc__tbl">
            <tbody>
              <tr>
                <th>Category</th>
                <td>DETACHED / UNPOSTED</td>
              </tr>
              <tr>
                <th>Carried by</th>
                <td>
                  <RedactionBar chars={20} authority="CSO" reference="CSO-08-022" variant="field" />
                </td>
              </tr>
              <tr>
                <th>Account</th>
                <td class="st-mono">
                  LN-<RedactionBar chars={6} authority="CSO" reference="CSO-08-022" />
                  -08
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Frame>

      <div class="ck-glyphs" id="glyphs">
        {GLYPHS.map((g) => (
          <div key={g} class="ck-glyph">
            <StateGlyph id={g} size={32} />
            <StateGlyph id={g} size={16} />
            <StateGlyph id={g} size={96} />
            <span>{g}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) render(<Sheet />, root);
