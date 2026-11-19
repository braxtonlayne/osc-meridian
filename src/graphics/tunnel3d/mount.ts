/**
 * Light entry point: no three.js here. The scene (and three) load as a separate chunk the first
 * time a view is mounted; calls made before it arrives are queued.
 */
import './tunnel3d.css';
import type { TunnelTrain, TunnelViewHandle, TunnelViewOptions } from './types';

export function mountTunnelView(el: HTMLElement, opts: TunnelViewOptions = {}): TunnelViewHandle {
  let disposed = false;
  let inner: TunnelViewHandle | null = null;
  let trains: TunnelTrain[] = opts.trains ?? [];
  let selected: string | null = opts.selected ?? null;

  const root = document.createElement('div');
  root.className = 't3d';
  const note = document.createElement('p');
  note.className = 't3d__note';
  note.setAttribute('role', 'status');
  note.textContent = 'Loading tunnel network model.';
  root.append(note);
  el.append(root);

  import('./scene')
    .then((m) => {
      if (disposed) return;
      note.remove();
      inner = m.createScene(root, { ...opts, trains, selected: selected ?? undefined });
    })
    .catch((err: unknown) => {
      if (disposed) return;
      root.replaceChildren(note);
      note.textContent =
        'Three-dimensional view not available on this workstation: the display adapter did not provide a rendering context. Use the schematic or geographic view.';
      console.error('tunnel3d:', err);
    });

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      inner?.dispose();
      inner = null;
      root.remove();
    },
    update(next) {
      trains = next;
      inner?.update(next);
    },
    select(key) {
      selected = key || null;
      inner?.select(selected);
    },
  };
}
