import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { RouteEntry, Services } from '@core/contracts';

/** What every System Tools view gets from the App frame. */
export interface SysCtx {
  services: Services;
  /** Go to another System Tools path (records it in this window's Back history). */
  navTo(path: string): void;
  /** Message in the first status-bar pane. */
  say(text: string): void;
  /** Route entry for a path, when the record copy is registered on this workstation. */
  entryFor(path: string): RouteEntry | undefined;
  /** The window is narrow (handheld mode or a small window). */
  narrow: boolean;
  /** Tier 4 rule for listings: false for a document this account may not see. */
  visible(r: RouteEntry): boolean;
}

export const Ctx = createContext<SysCtx | null>(null);

export function useSys(): SysCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('System Tools context missing');
  return c;
}
