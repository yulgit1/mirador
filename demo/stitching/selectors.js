import { createSelector } from 'reselect';
import { convertLegacyToNary, getLeaves } from 'react-mosaic-component';
import { getElasticLayout, getWindowIds, getWindows, getWorkspace } from '../../src/state/selectors';

/** Windows opened by Complete to show a result; they never take part in pairing */
export const RESULT_WINDOW_PREFIX = 'stitch-result-';

/** Window ids in the order they appear on screen: left to right (then top to bottom) */
function screenOrder(windowIds, workspace, elasticLayout = {}) {
  if (workspace.type === 'elastic') {
    const position = (id) => elasticLayout[id] || { x: 0, y: 0 };
    return [...windowIds].sort((a, b) => position(a).x - position(b).x || position(a).y - position(b).y);
  }

  // mosaic: leaves of the layout tree are in reading order; windows not placed yet go last
  const placed = workspace.layout ? getLeaves(convertLegacyToNary(workspace.layout)) : [];
  const ordered = placed.filter((id) => windowIds.includes(id));
  return [...ordered, ...windowIds.filter((id) => !ordered.includes(id))];
}

/**
 * The windows being paired: the first two (non-result) windows on screen are
 * left and right, whatever their ids. Each side is { windowId, canvasId } or null.
 */
export const getStitchingSides = createSelector(
  [getWindowIds, getWindows, getWorkspace, getElasticLayout],
  (windowIds, windows, workspace, elasticLayout) => {
    const candidates = windowIds.filter((id) => windows[id] && !id.startsWith(RESULT_WINDOW_PREFIX));
    const [left, right] = screenOrder(candidates, workspace, elasticLayout).map((windowId) => ({
      canvasId: windows[windowId].canvasId,
      windowId,
    }));
    return { left: left || null, right: right || null };
  },
);

/** 'left' or 'right' for a window being paired, otherwise undefined */
export function getStitchingSide(state, { windowId }) {
  const { left, right } = getStitchingSides(state);
  if (left?.windowId === windowId) return 'left';
  if (right?.windowId === windowId) return 'right';
  return undefined;
}
