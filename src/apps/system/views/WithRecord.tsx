import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { RouteEntry } from '@core/contracts';
import { Tabs, formatOscDate } from '@design/index';
import { RefusalState } from '@shell/adapters';
import { useSys } from '../ctx';
import { DocPane } from '../DocPane';

/**
 * An interactive System Tools view with its record copy on a second tab. The record copy is
 * the registered document for the page (OSC-SYS-*); doc.read is logged when it is displayed.
 */
export function WithRecord({ entry, label, children }: { entry: RouteEntry | null; label: string; children: ComponentChildren }) {
  const { say } = useSys();
  const [tab, setTab] = useState('view');
  useEffect(() => setTab('view'), [entry?.id]);
  const change = (t: string) => {
    setTab(t);
    if (t === 'record') say(entry ? `Record copy ${entry.docNo}, revision ${entry.revision}, ${formatOscDate(entry.date)}.` : 'No record copy is registered for this page.');
    else say('Ready');
  };
  return (
    <div class="sys-fill">
      <Tabs
        label={`${label} pages`}
        panel="flush"
        active={tab}
        onChange={change}
        tabs={[
          { id: 'view', label },
          { id: 'record', label: entry ? `Record copy ${entry.docNo}` : 'Record copy' },
        ]}
      >
        {tab === 'view' ? (
          children
        ) : entry ? (
          <DocPane entry={entry} />
        ) : (
          <RefusalState
            authority="MERIDIAN Directory Service"
            reference="DS-ERR-0404"
            reason={`No record copy of the ${label.replace(/&/g, '')} page is registered on this workstation.`}
          />
        )}
      </Tabs>
    </div>
  );
}
