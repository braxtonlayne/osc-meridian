/** Development-only preview: `npx vite` then open /src/design/gallery/preview.html. Not part of the app bundle. */
import { render } from 'preact';
import { Gallery } from './Gallery';

const root = document.getElementById('gallery-root');
if (root) {
  root.style.cssText = 'position:fixed;inset:24px;display:flex;flex-direction:column;border:1px solid var(--chrome-outer)';
  render(<Gallery initial={new URLSearchParams(location.search).get('t') === 'docs' ? 'templates' : 'primitives'} />, root);
}
