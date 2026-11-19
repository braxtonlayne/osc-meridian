// SCAFFOLD STUB: shell-provided entry for the Assurance module. The assurance app agent replaces this file.
import { useEffect } from 'preact/hooks';
import type { AppProps } from '@core/contracts';

const th = { textAlign: 'left', paddingRight: '12px', color: 'var(--text-2)', fontWeight: 400 } as const;
const td = { fontFamily: 'var(--font-mono)' } as const;

export default function App({ win, route }: AppProps) {
  useEffect(() => {
    win.setTitle(route ? route.title : 'Assurance', route?.docNo);
    if (route) win.setMarking(route.marking);
    win.setStatus(route ? route.docNo : 'Ready');
  }, [win, route]);
  return (
    <div style={{ padding: '12px', background: 'var(--surface)', color: 'var(--text-1)', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--row-rule)', paddingBottom: '4px', marginBottom: '8px' }}>Assurance</div>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr><th style={th}>Module</th><td style={td}>assurance</td></tr>
          <tr><th style={th}>Route</th><td style={td}>{route ? route.route : '/assurance'}</td></tr>
          {route && <tr><th style={th}>Document</th><td style={td}>{route.docNo}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
