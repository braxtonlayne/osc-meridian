/**
 * Check page for @graphics/banners. Bundled by render.mjs and screenshotted;
 * not imported by the application.
 */
import { render } from 'preact';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/courier-prime/700.css';
import type { Marking } from '@core/canon-types';
import { ClassificationBanner, CoverSheet, MarkingStrip, Stamp, enhanceStamps, type StampProps } from '../index';
import './check.css';

/** Check-only sample palette, used when content/canon/canon.json has not been generated yet. */
const SAMPLE: Marking[] = [
  { id: 'TSSCI-OSC', label: 'TS//SCI//OSC', sourceLabel: 'TS/SCI with OSC compartment', rank: 0, bannerBg: '#56616C', bannerFg: '#FFFFFF', usage: 'sample palette' },
  { id: 'UMBRA-R', label: 'UMBRA//OSC RESTRICTED', sourceLabel: 'UMBRA/OSC RESTRICTED', rank: 1, bannerBg: '#3F5D5E', bannerFg: '#FFFFFF', usage: 'sample palette' },
  { id: 'UMBRA-C', label: 'UMBRA//OSC COMPARTMENTED', sourceLabel: 'UMBRA/OSC COMPARTMENTED', rank: 2, bannerBg: '#5A4A6C', bannerFg: '#FFFFFF', usage: 'sample palette' },
  { id: 'UMBRA-U', label: 'UMBRA//OSC UNRESTRICTED', sourceLabel: 'UMBRA/OSC UNRESTRICTED', rank: 3, bannerBg: '#B9B08F', bannerFg: '#15181C', usage: 'sample palette' },
  { id: 'UMBRA-EO', label: 'UMBRA//OSC EYES ONLY', sourceLabel: 'UMBRA/OSC EYES ONLY', rank: 4, bannerBg: '#26272B', bannerFg: '#E9DDB4', usage: 'sample palette' },
];

declare global {
  interface Window {
    __MARKINGS__?: Marking[] | null;
  }
}

const injected = window.__MARKINGS__;
const fromCanon = Array.isArray(injected) && injected.length > 0;
const markings: Marking[] = fromCanon && injected ? injected : SAMPLE;
const source = fromCanon ? 'Colours from content/canon/canon.json.' : 'SAMPLE palette (canon.json not present).';
const byId = (id: string): Marking => markings.find((m) => m.id === id) ?? (markings[0] as Marking);

const STAMPS: StampProps[] = [
  { kind: 'RECEIVED', date: '2008-05-02' },
  { kind: 'COPY-NO' },
  { kind: 'COPY-NO', text: '4', seed: 12 },
  { kind: 'FILE-COPY' },
  { kind: 'SUPERSEDED' },
  { kind: 'SUPERSEDED', text: 'OSC-DIR-0412', seed: 5 },
  { kind: 'CANCELLED' },
  { kind: 'ACTION' },
  { kind: 'INFO' },
  { kind: 'DISTRIBUTION-LIMITED' },
  { kind: 'REPRODUCTION-PROHIBITED' },
  { kind: 'NO-ELECTRONIC-COPY' },
  { kind: 'REVIEWED-OIA', date: '2008-04-18' },
  { kind: 'DESTROY-BY', date: '2013-05-31' },
  { kind: 'DESTROY-BY', seed: 3 },
  { kind: 'VOID' },
];

function Window({ marking, title }: { marking: Marking; title: string }) {
  return (
    <div class="ck-window">
      <div class="ck-title">{title}</div>
      <MarkingStrip marking={marking} />
      <div class="ck-body">Document list (14 items)</div>
    </div>
  );
}

function Check() {
  return (
    <>
      <section id="banners" class="ck-block">
        <div class="ck-note">ClassificationBanner, top and bottom, per marking. {source}</div>
        {markings.map((m) => (
          <div class="ck-pair" key={m.id}>
            <ClassificationBanner marking={m} position="top" />
            <div class="ck-desk">
              <span>
                {m.id} / rank {m.rank}
              </span>
            </div>
            <ClassificationBanner marking={m} position="bottom" />
          </div>
        ))}
      </section>

      <section id="strips" class="ck-block">
        <div class="ck-note">MarkingStrip under a window title bar. {source}</div>
        <div class="ck-windows">
          {markings.map((m) => (
            <Window key={m.id} marking={m} title={`Records Library - ${m.id}`} />
          ))}
        </div>
      </section>

      <section id="cover" class="ck-cover">
        <CoverSheet
          marking={byId('UMBRA-C')}
          docNo="OSC-DIR-0412"
          title="Compartment Briefing Requirements for Tier 2 Access to Transit Schedules"
          copyNo={4}
          copiesTotal={11}
          distribution={['Council Secretariat', 'Chief Security Officer', 'Director, Transit Division', 'Director, Records Division', 'Central Registry (file copy)']}
          originator="Office of Internal Assurance"
          date="2008-05-12"
        />
      </section>

      <section id="cover-blank" class="ck-cover">
        <CoverSheet marking={byId('UMBRA-EO')} docNo="OSC-MIN-0077" title="Minutes of the Council, Ordinary Session" originator="Council Secretariat" date="2008-03-21" />
      </section>

      <section id="stamps" class="ck-block ck-paper">
        <div class="ck-note">Stamp, every kind. Inks: oxblood and blue-black.</div>
        <div class="ck-stamps">
          {STAMPS.map((s, i) => (
            <div class="ck-cell" key={i}>
              <Stamp {...s} />
              <div class="ck-cap">
                {s.kind}
                {s.text ? ` text=${s.text}` : ''}
                {s.date ? ` date=${s.date}` : ''}
              </div>
            </div>
          ))}
          {markings.map((m) => (
            <div class="ck-cell" key={m.id}>
              <Stamp kind={m.id} marking={m} />
              <div class="ck-cap">{m.id}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pipeline" class="ck-block ck-paper">
        <div class="ck-note">Pipeline markup: left column before enhanceStamps(), right column after.</div>
        <div class="ck-pipe">
          <div id="pipe-raw" class="ck-pipecol">
            <span class="stamp" data-kind="RECEIVED" data-date="2008-05-02" />
            <span class="stamp" data-kind="NO-ELECTRONIC-COPY" />
            <span class="stamp" data-kind="FILE COPY" />
          </div>
          <div id="pipe-enh" class="ck-pipecol">
            <span class="stamp" data-kind="RECEIVED" data-date="2008-05-02" />
            <span class="stamp" data-kind="NO-ELECTRONIC-COPY" />
            <span class="stamp" data-kind="FILE COPY" />
          </div>
        </div>
      </section>

      <section id="scan" class="ck-block ck-paper">
        <div class="ck-note">In use: stamps over typed text on a scanned page.</div>
        <div class="ck-scan">
          <p>
            MEMORANDUM FOR DIRECTOR, RECORDS DIVISION
            <br />
            SUBJECT: Retention of paper originals, Facility Inventory
          </p>
          <p>
            1. The original of the Facility Inventory is held in paper form only. Registry staff are reminded that the inventory is not to be entered into any
            automated system, and that this instruction applies equally to working copies.
          </p>
          <p>2. Holders will return superseded copies to the registry for destruction against signature.</p>
          <span class="ck-s1">
            <Stamp kind="NO-ELECTRONIC-COPY" seed={5} scale={1.25} />
          </span>
          <span class="ck-s2">
            <Stamp kind="RECEIVED" date="2008-05-02" seed={21} />
          </span>
          <span class="ck-s3">
            <Stamp kind="UMBRA-C" marking={byId('UMBRA-C')} seed={8} />
          </span>
        </div>
      </section>
    </>
  );
}

const root = document.getElementById('root');
if (root) render(<Check />, root);
const enh = document.getElementById('pipe-enh');
if (enh) enhanceStamps(enh, markings);
document.documentElement.setAttribute('data-ready', '');
