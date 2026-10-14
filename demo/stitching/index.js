import { addWindow, getCurrentCanvas, getManifestTitle } from '../../src/state';
import { StitchingMarkers } from './StitchingMarkers';
import { StitchingPanel } from './StitchingPanel';
import {
  addPoint,
  clearPairs,
  deletePair,
  LEFT_WINDOW_ID,
  movePoint,
  RIGHT_WINDOW_ID,
  stitchingReducer,
} from './reducer';

export { LEFT_WINDOW_ID, RIGHT_WINDOW_ID };

/** Pins points on the left and right windows' images */
const markersPlugin = {
  component: StitchingMarkers,
  mapDispatchToProps: { addPoint, movePoint },
  mapStateToProps: (state) => ({ pairs: state.stitching.pairs }),
  mode: 'add',
  name: 'StitchingMarkers',
  target: 'OpenSeadragonViewer',
};

/** Lists the point pairs and builds the stitched manifest */
const panelPlugin = {
  component: StitchingPanel,
  mapDispatchToProps: { addWindow, clearPairs, deletePair },
  mapStateToProps: (state) => ({
    leftCanvas: getCurrentCanvas(state, { windowId: LEFT_WINDOW_ID }),
    leftLabel: getManifestTitle(state, { windowId: LEFT_WINDOW_ID }),
    pairs: state.stitching.pairs,
    rightCanvas: getCurrentCanvas(state, { windowId: RIGHT_WINDOW_ID }),
    rightLabel: getManifestTitle(state, { windowId: RIGHT_WINDOW_ID }),
  }),
  mode: 'wrap',
  name: 'StitchingPanel',
  reducers: { stitching: stitchingReducer },
  target: 'WorkspaceArea',
};

export const stitchingPlugins = [markersPlugin, panelPlugin];
