/**
 * A transient status-bar line for commands that find nothing to act on ("No alarms to
 * acknowledge."), so no menu command is ever silent. Apps show `flash ?? <their usual line>`.
 */
import { useEffect, useState } from 'preact/hooks';

export function useFlash(ms = 5000): [string | null, (text: string) => void] {
  const [flash, setFlash] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), ms);
    return () => clearTimeout(t);
  }, [flash]);
  return [flash?.text ?? null, (text: string) => setFlash((f) => ({ text, n: (f?.n ?? 0) + 1 }))];
}
