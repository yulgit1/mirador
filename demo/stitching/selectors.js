import { createSelector } from 'reselect';
import { convertLegacyToNary } from 'react-mosaic-component';
import { getElasticLayout, getWindowIds, getWindows, getWorkspace } from '../../src/state/selectors';
import { MAX_IMAGES } from './reducer';

/** Windows opened by Complete to show a result; they never take part in stitching */
export const RESULT_WINDOW_PREFIX = 'stitch-result-';

/** The top-left corner (in fractions of the workspace) of each window in a mosaic layout */
function mosaicPositions(node, box = { height: 1, width: 1, x: 0, y: 0 }, positions = {}) {
  const { height, width, x, y } = box;
  if (typeof node === 'string') {
    positions[node] = { x, y }; // eslint-disable-line no-param-reassign
  } else if (node?.type === 'tabs') {
    node.tabs.forEach((id) => mosaicPositions(id, box, positions));
  } else if (node?.type === 'split') {
    const percentages = node.splitPercentages || node.children.map(() => 100 / node.children.length);
    let offset = 0;
    node.children.forEach((child, i) => {
      const share = percentages[i] / 100;
      const childBox =
        node.direction === 'row'
          ? { height, width: share * width, x: x + offset * width, y }
          : { height: share * height, width, x, y: y + offset * height };
      mosaicPositions(child, childBox, positions);
      offset += share;
    });
  }
  return positions;
}

/**
 * Window ids in the order they appear on screen. Elastic: left to right (then top
 * to bottom). Mosaic: reading order, top row first, so a 2x2 grid reads A B / C D.
 */
function screenOrder(windowIds, workspace, elasticLayout = {}) {
  if (workspace.type === 'elastic') {
    const position = (id) => elasticLayout[id] || { x: 0, y: 0 };
    return [...windowIds].sort((a, b) => position(a).x - position(b).x || position(a).y - position(b).y);
  }

  // windows not placed in the layout yet go last
  const positions = workspace.layout ? mosaicPositions(convertLegacyToNary(workspace.layout)) : {};
  const ordered = windowIds
    .filter((id) => positions[id])
    .sort((a, b) => positions[a].y - positions[b].y || positions[a].x - positions[b].x);
  return [...ordered, ...windowIds.filter((id) => !positions[id])];
}

/** Non-result windows in screen order */
const getCandidateWindowIds = createSelector(
  [getWindowIds, getWindows, getWorkspace, getElasticLayout],
  (windowIds, windows, workspace, elasticLayout) =>
    screenOrder(
      windowIds.filter((id) => windows[id] && !id.startsWith(RESULT_WINDOW_PREFIX)),
      workspace,
      elasticLayout,
    ),
);

/**
 * The images being stitched: the first MAX_IMAGES (non-result) windows on screen,
 * whatever their ids. Each is { windowId, canvasId }; the first is the reference image.
 */
export const getStitchingImages = createSelector([getCandidateWindowIds, getWindows], (windowIds, windows) =>
  windowIds.slice(0, MAX_IMAGES).map((windowId) => ({ canvasId: windows[windowId].canvasId, windowId })),
);

/** Number of windows on screen beyond MAX_IMAGES, which are not stitched */
export const getIgnoredWindowCount = (state) => Math.max(0, getCandidateWindowIds(state).length - MAX_IMAGES);

/** Index (0 = A) of a window being stitched, otherwise undefined */
export function getStitchingIndex(state, { windowId }) {
  const index = getStitchingImages(state).findIndex((image) => image.windowId === windowId);
  return index < 0 ? undefined : index;
}
