// SCAFFOLD STUB: wave 2B replaces this file with the full application.
import { useEffect } from 'preact/hooks';
import type { AppProps } from '@core/contracts';

const TITLE = 'Dispatcher Workstation';

export default function App({ win, route }: AppProps) {
  useEffect(() => {
    win.setTitle(route?.title ?? TITLE, route?.docNo ?? '');
    win.setMarking(route?.marking ?? 'UMBRA-R');
    win.setStatus(TITLE);
  }, [route?.id]);
  return (
    <div class="app-stub" style={{ padding: '12px' }}>
      <h1 style={{ fontSize: 'var(--fs-base)', margin: 0 }}>{route?.title ?? TITLE}</h1>
    </div>
  );
}
