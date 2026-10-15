export const ActionTypes = {
  ADD_POINT: 'stitching/ADD_POINT',
  CLEAR: 'stitching/CLEAR',
  DELETE_PAIR: 'stitching/DELETE_PAIR',
  MOVE_POINT: 'stitching/MOVE_POINT',
  SET_SIDES: 'stitching/SET_SIDES',
};

// ids of the windows stitching.html opens; any two windows on screen can be paired
export const LEFT_WINDOW_ID = 'stitch-left';
export const RIGHT_WINDOW_ID = 'stitch-right';

let nextPairId = 1;

/** Add a point; it completes the first pair missing this side, or starts a new pair */
export const addPoint = (side, point) => ({ point, side, type: ActionTypes.ADD_POINT });

/** Move an existing point */
export const movePoint = (pairId, side, point) => ({ pairId, point, side, type: ActionTypes.MOVE_POINT });

/** Remove a pair (both points) */
export const deletePair = (pairId) => ({ pairId, type: ActionTypes.DELETE_PAIR });

/** Remove all pairs */
export const clearPairs = () => ({ type: ActionTypes.CLEAR });

/** Record which window and canvas are on each side ({ left, right } from getStitchingSides) */
export const setSides = (sides) => ({ sides, type: ActionTypes.SET_SIDES });

const initialState = { pairs: [], sides: { left: null, right: null } };

/** Whether the points on one side no longer belong to what that side shows */
function sideChanged(previous, next) {
  if (!previous) return false;
  if (previous.windowId !== next?.windowId) return true;
  // a window's canvas is unset until it loads, which is not a change
  return !!previous.canvasId && previous.canvasId !== next.canvasId;
}

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
    case ActionTypes.SET_SIDES: {
      const { sides } = action;
      // points belong to the image that was showing; once either side changes, no pair is valid
      const changed = sideChanged(state.sides.left, sides.left) || sideChanged(state.sides.right, sides.right);
      return { ...state, pairs: changed ? [] : state.pairs, sides };
    }
    default:
      return state;
  }
}
