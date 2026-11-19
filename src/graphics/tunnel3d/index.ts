/**
 * @graphics/tunnel3d: three-dimensional tunnel network view (Transit Control).
 * Importing this module does not load three.js; mounting a view does (separate lazy chunk).
 */
export { mountTunnelView } from './mount';
export { TunnelView, type TunnelViewProps } from './TunnelView';
export type { TunnelTrain, TunnelViewHandle, TunnelViewOptions } from './types';
