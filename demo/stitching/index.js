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
  setSides,
  stitchingReducer,
} from './reducer';
import { getStitchingSide, getStitchingSides } from './selectors';

export { LEFT_WINDOW_ID, RIGHT_WINDOW_ID };

/** Pins points on the left and right windows' images */
const markersPlugin = {
  component: StitchingMarkers,
  mapDispatchToProps: { addPoint, movePoint },
  mapStateToProps: (state, { windowId }) => ({
    pairs: state.stitching.pairs,
    side: getStitchingSide(state, { windowId }),
  }),
  mode: 'add',
  name: 'StitchingMarkers',
  target: 'OpenSeadragonViewer',
};

/** Lists the point pairs and builds the stitched manifest */
const panelPlugin = {
  component: StitchingPanel,
  mapDispatchToProps: { addWindow, clearPairs, deletePair, setSides },
  mapStateToProps: (state) => {
    const sides = getStitchingSides(state);
    const canvas = (side) => side && getCurrentCanvas(state, { windowId: side.windowId });
    const label = (side) => side && getManifestTitle(state, { windowId: side.windowId });
    return {
      leftCanvas: canvas(sides.left),
      leftLabel: label(sides.left),
      pairs: state.stitching.pairs,
      rightCanvas: canvas(sides.right),
      rightLabel: label(sides.right),
      sides,
    };
  },
  mode: 'wrap',
  name: 'StitchingPanel',
  reducers: { stitching: stitchingReducer },
  target: 'WorkspaceArea',
};

export const stitchingPlugins = [markersPlugin, panelPlugin];
