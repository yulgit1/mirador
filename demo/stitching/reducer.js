export const ActionTypes = {
  ADD_POINT: 'stitching/ADD_POINT',
  CLEAR: 'stitching/CLEAR',
  DELETE_PAIR: 'stitching/DELETE_PAIR',
  MOVE_POINT: 'stitching/MOVE_POINT',
};

export const LEFT_WINDOW_ID = 'stitch-left';
export const RIGHT_WINDOW_ID = 'stitch-right';

/** Which side ('left' or 'right') a window is on, if any */
export const sideOfWindow = (windowId) => ({ [LEFT_WINDOW_ID]: 'left', [RIGHT_WINDOW_ID]: 'right' })[windowId];

let nextPairId = 1;

/** Add a point; it completes the first pair missing this side, or starts a new pair */
export const addPoint = (side, point) => ({ point, side, type: ActionTypes.ADD_POINT });

/** Move an existing point */
export const movePoint = (pairId, side, point) => ({ pairId, point, side, type: ActionTypes.MOVE_POINT });

/** Remove a pair (both points) */
export const deletePair = (pairId) => ({ pairId, type: ActionTypes.DELETE_PAIR });

/** Remove all pairs */
export const clearPairs = () => ({ type: ActionTypes.CLEAR });

const initialState = { canvasIds: {}, pairs: [] };

/**
 * Point pairs, in image pixel coordinates of each side's current image.
 * Pairs are numbered by their position in the list.
 */
export function stitchingReducer(state = initialState, action = {}) {
  switch (action.type) {
    case ActionTypes.ADD_POINT: {
      const index = state.pairs.findIndex((p) => !p[action.side]);
      if (index < 0) {
        const pair = { id: nextPairId, left: null, right: null, [action.side]: action.point };
        nextPairId += 1;
        return { ...state, pairs: [...state.pairs, pair] };
      }
      return {
        ...state,
        pairs: state.pairs.map((p, i) => (i === index ? { ...p, [action.side]: action.point } : p)),
      };
    }
    case ActionTypes.MOVE_POINT:
      return {
        ...state,
        pairs: state.pairs.map((p) => (p.id === action.pairId ? { ...p, [action.side]: action.point } : p)),
      };
    case ActionTypes.DELETE_PAIR:
      return { ...state, pairs: state.pairs.filter((p) => p.id !== action.pairId) };
    case ActionTypes.CLEAR:
      return { ...state, pairs: [] };
    case 'mirador/SET_CANVAS': {
      const side = sideOfWindow(action.windowId);
      if (!side) return state;

      const previous = state.canvasIds[side];
      const canvasIds = { ...state.canvasIds, [side]: action.canvasId };
      // points belong to the image that was showing; once either side changes, no pair is valid
      if (previous && previous !== action.canvasId) return { ...state, canvasIds, pairs: [] };
      return { ...state, canvasIds };
    }
    default:
      return state;
  }
}
