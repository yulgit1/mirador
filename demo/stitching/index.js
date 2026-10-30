import { addWindow, getCurrentCanvas, getManifestTitle } from '../../src/state';
import { StitchingMarkers } from './StitchingMarkers';
import { StitchingPanel } from './StitchingPanel';
import {
  addPoint,
  clearRows,
  deleteRow,
  LEFT_WINDOW_ID,
  MAX_IMAGES,
  movePoint,
  RIGHT_WINDOW_ID,
  setActiveRow,
  setImages,
  stitchingReducer,
  WINDOW_IDS,
} from './reducer';
import { getIgnoredWindowCount, getStitchingImages, getStitchingIndex } from './selectors';

export { LEFT_WINDOW_ID, MAX_IMAGES, RIGHT_WINDOW_ID, WINDOW_IDS };

/** Pins points on the stitched windows' images */
const markersPlugin = {
  component: StitchingMarkers,
  mapDispatchToProps: { addPoint, movePoint },
  mapStateToProps: (state, { windowId }) => ({
    activeRowId: state.stitching.activeRowId,
    imageIndex: getStitchingIndex(state, { windowId }),
    rows: state.stitching.rows,
  }),
  mode: 'add',
  name: 'StitchingMarkers',
  target: 'OpenSeadragonViewer',
};

let lastImages = [];

/** Returns the previous list when nothing in it changed, so the panel only re-renders when needed */
function stable(images) {
  const same =
    images.length === lastImages.length &&
    images.every((image, i) => Object.keys(image).every((key) => image[key] === lastImages[i][key]));
  if (!same) lastImages = images;
  return lastImages;
}

/** Lists the matched points and builds the stitched manifest */
const panelPlugin = {
  component: StitchingPanel,
  mapDispatchToProps: { addWindow, clearRows, deleteRow, setActiveRow, setImages },
  mapStateToProps: (state) => {
    const stitchingImages = getStitchingImages(state);
    return {
      activeRowId: state.stitching.activeRowId,
      ignoredWindowCount: getIgnoredWindowCount(state),
      images: stable(
        stitchingImages.map(({ windowId }) => ({
          canvas: getCurrentCanvas(state, { windowId }),
          label: getManifestTitle(state, { windowId }),
          windowId,
        })),
      ),
      rows: state.stitching.rows,
      stitchingImages,
    };
  },
  mode: 'wrap',
  name: 'StitchingPanel',
  reducers: { stitching: stitchingReducer },
  target: 'WorkspaceArea',
};

export const stitchingPlugins = [markersPlugin, panelPlugin];
