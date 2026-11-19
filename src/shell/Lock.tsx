/**
 * Lock screen. The visitor is offered the issued access cards (one per account,
 * docs/SPEC-2.md §1), picks one, and types its operator ID and passphrase
 * (any input is accepted). Nothing typed is
 * transmitted; nothing typed is stored (the operator ID field is not even kept).
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { AccessCard, ClassificationBanner, Seal, SmartToken, canonNow, loadDoc, markingById } from './adapters';
import { formatInWorldDate, lockReason, operatorId, signedIn } from '@core/session';
import { services } from '@core/services';
import { toUrl } from '@core/router';
import { activeId, allAccounts, cardNo } from '@core/accounts';
import type { AccountDef, AccountId } from '@core/contracts';
import type { MarkingId } from '@core/canon-types';
import { isolation, reviewNotice } from './isolation';

const COLOPHON_ROUTE = '/system/colophon';
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2008-04-14" -> "14 APR 2008" */
function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d} ${MON[Number(m) - 1] ?? ''} ${y}` : iso;
}


/** Card chooser: the four issued cards as a radio group (arrow keys move, Space/Enter select). */
function CardChooser({ list, selected, onSelect }: { list: AccountDef[]; selected: AccountId; onSelect: (id: AccountId) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = list.findIndex((a) => a.id === selected);
    let next: number;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % list.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    else return;
    e.preventDefault();
    const a = list[next];
    if (!a) return;
    onSelect(a.id);
    ref.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };
  return (
    <>
      <p class="lock-cards-h" id="lock-cards-h">
        Issued cards at this workstation. Select the card you are signing in with.
      </p>
      <div class="lock-cards" role="radiogroup" aria-labelledby="lock-cards-h" ref={ref} onKeyDown={onKey}>
        {list.map((a) => {
          const on = a.id === selected;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              class="lock-cardopt"
              data-account={a.id}
              onClick={() => onSelect(a.id)}
            >
              <span class="lock-cardopt-mark" aria-hidden="true" />
              <span class="lock-cardopt-id">{a.operatorId}</span>
              <span class="lock-cardopt-role">
                Tier {a.tier} &middot; {a.roleTitle}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function Lock({ onLogin }: { onLogin: (id: AccountId) => void }) {
  const c = canonNow();
  const list = allAccounts();
  const current = activeId.value;
  const top = [...c.markings].sort((a, b) => b.rank - a.rank)[0];
  const accredited: MarkingId = top?.id ?? 'UMBRA-EO';
  const [sel, setSel] = useState<AccountId>(current);
  const [opId, setOpId] = useState('');
  const [pass, setPass] = useState('');
  const [phase, setPhase] = useState<'idle' | 'checking'>('idle');
  const [colophon, setColophon] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const reason = lockReason.value;
  const resumed = signedIn.value;
  const review = reviewNotice(isolation.value);
  const op = list.find((a) => a.id === sel) ?? list[0]!;
  const switching = op.id !== current;

  useEffect(() => {
    idRef.current?.focus();
  }, []);

  const choose = (id: AccountId) => {
    if (id === sel) return;
    setSel(id);
    setOpId('');
    setPass('');
  };

  const submit = (e: Event) => {
    e.preventDefault();
    if (phase === 'checking') return;
    setPhase('checking');
    services.sound.play('relay');
    setTimeout(() => {
      setPhase('idle');
      setPass('');
      onLogin(op.id);
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
                Workstation A03-5-114 &middot; ALPHA-03 &middot; {formatInWorldDate()}
              </div>
            </div>
          </div>

          {review && (
            <div class="lock-review" role="note">
              <span class="st-sq st-fault" aria-hidden="true" />
              <span>{review}</span>
            </div>
          )}

          {resumed && (
            <div class="lock-status" role="status">
              {switching
                ? `Signing in with another card logs off operator ${operatorId.value}. Open windows will be closed.`
                : reason === 'timeout'
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
              {list.length > 1 && <CardChooser list={list} selected={op.id} onSelect={choose} />}
              <AccessCard
                operatorId={op.operatorId}
                passphrase={op.passphrase}
                site={`${op.site} / ${division.toUpperCase()}`}
                tier={op.tier}
                displayName={op.displayName}
                issued={op.probationStart ? formatIsoDate(op.probationStart) : formatInWorldDate()}
                expires="31 MAY 2008"
                cardNo={cardNo(op)}
                issuer={`${division.toUpperCase()} · SECURITY OFFICE`}
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
                    {phase === 'checking' ? 'Verifying...' : resumed && !switching ? 'Unlock' : 'Sign in'}
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
                documents and figures are invented. Some real public figures, agencies, companies and events are named. They
                appear only as the public record has them, or in invented background roles. Nothing here is a claim about real
                people.
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
