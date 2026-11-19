/**
 * Lock screen. The visitor is issued an operator ID and passphrase on a
 * temporary access card and types them. Any input is accepted. Nothing typed is
 * transmitted; nothing typed is stored (the operator ID field is not even kept).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { AccessCard, ClassificationBanner, Seal, SmartToken, canonNow, loadDoc, markingById } from './adapters';
import { formatInWorldDate, lockReason, signedIn } from '@core/session';
import { services } from '@core/services';
import { toUrl } from '@core/router';
import type { MarkingId } from '@core/canon-types';

const COLOPHON_ROUTE = '/system/colophon';
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2008-04-14" -> "14 APR 2008" */
function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d} ${MON[Number(m) - 1] ?? ''} ${y}` : iso;
}

export function Lock({ onLogin }: { onLogin: () => void }) {
  const c = canonNow();
  const op = c.operator;
  const top = [...c.markings].sort((a, b) => b.rank - a.rank)[0];
  const accredited: MarkingId = top?.id ?? 'UMBRA-EO';
  const [opId, setOpId] = useState('');
  const [pass, setPass] = useState('');
  const [phase, setPhase] = useState<'idle' | 'checking'>('idle');
  const [colophon, setColophon] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const reason = lockReason.value;
  const resumed = signedIn.value;

  useEffect(() => {
    idRef.current?.focus();
  }, []);

  const submit = (e: Event) => {
    e.preventDefault();
    if (phase === 'checking') return;
    setPhase('checking');
    services.sound.play('relay');
    setTimeout(() => {
      setPhase('idle');
      setPass('');
      onLogin();
    }, 260);
  };

  const division = c.divisions.find((d) => d.id === op.divisionId)?.name ?? op.divisionId;

  return (
    <div class="lock" role="main">
      <ClassificationBanner marking={accredited} position="top" />
      <div class="lock-body">
        <div class="lock-panel">
          <div class="lock-head">
            <Seal size={72} variant="full" />
            <div class="lock-head-text">
              <div class="lock-agency">{c.meta.agency}</div>
              <div class="lock-env">
                {c.meta.environment}, release {c.meta.release}
              </div>
              <div class="lock-ws">
                Workstation A03-5-114 &middot; {op.site} &middot; {formatInWorldDate()}
              </div>
            </div>
          </div>

          {resumed && (
            <div class="lock-status" role="status">
              {reason === 'timeout'
                ? 'This workstation was locked after fifteen minutes without input. Your open work has been retained. Sign in to resume.'
                : reason === 'logoff'
                  ? 'You have logged off. Open windows were closed. Sign in to begin a new session.'
                  : 'This workstation is locked. Your open work has been retained. Sign in to resume.'}
            </div>
          )}

          <div class="lock-grid">
            <section class="lock-notice" aria-labelledby="lock-notice-h">
              <h2 id="lock-notice-h">Notice to operators</h2>
              <p>
                MERIDIAN is a closed information system of the {c.meta.agency}. It is accredited to process information up to and
                including {markingById(accredited).label}. Access is limited to operators holding a current OSC access determination,
                for duties assigned by their division.
              </p>
              <p>
                All activity at this workstation is recorded by the Office of Internal Assurance. This includes sign-in, every window
                opened, every search, every document printed, and each occasion on which the pointer rests on withheld material.
                Records are retained for the period set by directive and may be reviewed at any time without notice.
              </p>
              <p>
                Operators have no expectation of privacy in material created, stored or displayed on MERIDIAN. Signing in is
                acknowledgement of these conditions. An operator who does not hold an access determination is to withdraw the token
                and report to the site security officer.
              </p>
            </section>

            <section class="lock-signin" aria-labelledby="lock-signin-h">
              <h2 id="lock-signin-h">Sign in</h2>
              <AccessCard
                operatorId={op.operatorId}
                passphrase={op.passphrase}
                site={`${op.site} / ${division.toUpperCase()}`}
                tier={op.tier}
                displayName={op.displayName}
                issued={formatIsoDate(op.probationStart)}
                expires="31 MAY 2008"
                cardNo={`TAC-${op.site.replace('ALPHA-', 'A')}-${op.pn.replace(/\D/g, '').slice(-4)}`}
              />
              <p class="lock-card-note">
                Temporary access card issued by {division}, {op.site}. Type the operator ID and passphrase exactly as printed.
              </p>
              <form class="lock-form" onSubmit={submit} autocomplete="off">
                <label for="lock-op">Operator ID</label>
                <input
                  id="lock-op"
                  ref={idRef}
                  name="meridian-operator"
                  value={opId}
                  onInput={(e) => setOpId((e.target as HTMLInputElement).value)}
                  autocomplete="off"
                  spellcheck={false}
                  autoCapitalize="characters"
                />
                <label for="lock-pass">Passphrase</label>
                <input
                  id="lock-pass"
                  type="password"
                  name="meridian-passphrase"
                  value={pass}
                  onInput={(e) => setPass((e.target as HTMLInputElement).value)}
                  autocomplete="off"
                />
                <div class="lock-token">
                  <SmartToken inserted={true} />
                </div>
                <div class="lock-actions">
                  <button type="submit" class="sh-btn sh-btn-default" disabled={phase === 'checking'}>
                    {phase === 'checking' ? 'Verifying...' : resumed ? 'Unlock' : 'Sign in'}
                  </button>
                </div>
              </form>
            </section>
          </div>

          <footer class="lock-foot">
            <span>
              {c.meta.environment} {c.meta.release}
            </span>
            <a
              href={toUrl(COLOPHON_ROUTE)}
              onClick={(e) => {
                e.preventDefault();
                setColophon(true);
              }}
            >
              Colophon: a work of fiction
            </a>
          </footer>
        </div>
      </div>
      <ClassificationBanner marking={accredited} position="bottom" />
      {colophon && <Colophon onClose={() => setColophon(false)} />}
    </div>
  );
}

/** Colophon shown over the lock screen: the pipeline's /system/colophon document when present. */
function Colophon({ onClose }: { onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const entry = services.docs.byRoute(COLOPHON_ROUTE);
    if (entry) {
      loadDoc(entry.id)
        .then((d) => setHtml(d.html))
        .catch(() => setHtml(null));
    }
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  return (
    <div class="modal-scrim" onClick={onClose}>
      <div class="dialog lock-colophon" role="dialog" aria-modal="true" aria-labelledby="colophon-h" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div class="dialog-title" id="colophon-h">
          Colophon
        </div>
        <div class="dialog-body">
          {html ? (
            <div class="doc" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <>
              <p>
                <strong>This is a work of fiction.</strong> MERIDIAN, the Office of Strategic Continuity, its facilities, staff,
                documents and figures are invented. No real agency, programme or person is depicted.
              </p>
              <p>
                The site is static. It makes no network requests to anyone, collects nothing, and asks for no real credentials. The
                operator ID and passphrase are printed on screen for you to type. Settings and progress are kept only in this
                browser's local storage.
              </p>
            </>
          )}
        </div>
        <div class="dialog-buttons">
          <button type="button" class="sh-btn sh-btn-default" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
