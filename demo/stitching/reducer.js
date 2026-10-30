export const ActionTypes = {
  ADD_POINT: 'stitching/ADD_POINT',
  CLEAR: 'stitching/CLEAR',
  DELETE_ROW: 'stitching/DELETE_ROW',
  MOVE_POINT: 'stitching/MOVE_POINT',
  SET_ACTIVE_ROW: 'stitching/SET_ACTIVE_ROW',
  SET_IMAGES: 'stitching/SET_IMAGES',
};

/** Most images that can be stitched together */
export const MAX_IMAGES = 4;

/** Letter shown for an image: A is the reference image the others are aligned to */
export const imageLetter = (index) => String.fromCharCode(65 + index);

// ids of the windows stitching.html opens; any windows on screen can be stitched
export const WINDOW_IDS = Array.from({ length: MAX_IMAGES }, (_, i) => `stitch-${i + 1}`);
export const [LEFT_WINDOW_ID, RIGHT_WINDOW_ID] = WINDOW_IDS;

let nextRowId = 1;

/** Add a point on one image; it fills the active row, or starts a new row if that image is already set there */
export const addPoint = (imageIndex, point) => ({ imageIndex, point, type: ActionTypes.ADD_POINT });

/** Move an existing point */
export const movePoint = (rowId, imageIndex, point) => ({ imageIndex, point, rowId, type: ActionTypes.MOVE_POINT });

/** Remove a row (all its points) */
export const deleteRow = (rowId) => ({ rowId, type: ActionTypes.DELETE_ROW });

/** Remove all rows */
export const clearRows = () => ({ type: ActionTypes.CLEAR });

/** Make a row the one the next clicks fill */
export const setActiveRow = (rowId) => ({ rowId, type: ActionTypes.SET_ACTIVE_ROW });

/** Record which window and canvas each image is ([{ windowId, canvasId }] from getStitchingImages) */
export const setImages = (images) => ({ images, type: ActionTypes.SET_IMAGES });

const initialState = { activeRowId: null, images: [], rows: [] };

/** Whether the points on one image no longer belong to what that window shows */
function imageChanged(previous, next) {
  if (!previous) return false;
  if (previous.windowId !== next?.windowId) return true;
  // a window's canvas is unset until it loads, which is not a change
  return !!previous.canvasId && previous.canvasId !== next.canvasId;
}

/** Sets one image's point in a row */
const withPoint = (row, imageIndex, point) => ({
  ...row,
  points: Object.assign([...row.points], { [imageIndex]: point }),
});

/**
 * Rows of matching points (one landmark per row), in image pixel coordinates of
 * each image's current canvas. row.points[i] is the point on image i, or null.
 * Rows are numbered by their position in the list.
 */
export function stitchingReducer(state = initialState, action = {}) {
  switch (action.type) {
    case ActionTypes.ADD_POINT: {
      const active = state.rows.find((r) => r.id === state.activeRowId);
      if (active && !active.points[action.imageIndex]) {
        return {
          ...state,
          rows: state.rows.map((r) => (r === active ? withPoint(r, action.imageIndex, action.point) : r)),
        };
      }
      const row = withPoint({ id: nextRowId, points: Array(MAX_IMAGES).fill(null) }, action.imageIndex, action.point);
      nextRowId += 1;
      return { ...state, activeRowId: row.id, rows: [...state.rows, row] };
    }
    case ActionTypes.MOVE_POINT:
      return {
        ...state,
        rows: state.rows.map((r) => (r.id === action.rowId ? withPoint(r, action.imageIndex, action.point) : r)),
      };
    case ActionTypes.DELETE_ROW:
      return {
        ...state,
        activeRowId: state.activeRowId === action.rowId ? null : state.activeRowId,
        rows: state.rows.filter((r) => r.id !== action.rowId),
      };
    case ActionTypes.SET_ACTIVE_ROW:
      return { ...state, activeRowId: action.rowId };
    case ActionTypes.CLEAR:
      return { ...state, activeRowId: null, rows: [] };
    case ActionTypes.SET_IMAGES: {
      const { images } = action;
      // points belong to the images that were showing; once any image changes, no row is valid
      const changed = state.images.some((previous, i) => imageChanged(previous, images[i]));
      return changed ? { ...state, activeRowId: null, images, rows: [] } : { ...state, images };
    }
    default:
      return state;
  }
}
