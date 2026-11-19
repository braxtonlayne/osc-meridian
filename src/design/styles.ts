/**
 * Side-effect entry for the whole design system's CSS, in cascade order.
 * Import once, first, from src/main.tsx: `import '@design/styles';`
 */
import './base.css'; // declares the layer order first
import './tokens.css';
import './fonts';
import './primitives/primitives.css';
import './document/document.css';
