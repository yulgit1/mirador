import {
  addPoint,
  clearRows,
  deleteRow,
  movePoint,
  setActiveRow,
  setImages,
  stitchingReducer,
} from '../../../demo/stitching/reducer';

/** Apply actions in order, starting from the initial state */
const reduce = (...actions) => actions.reduce(stitchingReducer, stitchingReducer(undefined, {}));

const p = (n) => ({ x: n, y: n });

describe('stitchingReducer', () => {
  it('fills the active row, one point per image', () => {
    const { rows } = reduce(addPoint(0, p(1)), addPoint(1, p(2)), addPoint(3, p(4)));
    expect(rows).toHaveLength(1);
    expect(rows[0].points).toEqual([p(1), p(2), null, p(4)]);
  });

  it('starts a new active row when the image already has a point in the active row', () => {
    const state = reduce(addPoint(0, p(1)), addPoint(1, p(2)), addPoint(0, p(3)), addPoint(1, p(4)));
    expect(state.rows.map((r) => r.points.slice(0, 2))).toEqual([
      [p(1), p(2)],
      [p(3), p(4)],
    ]);
    expect(state.activeRowId).toEqual(state.rows[1].id);
  });

  it('adds a missing point to a row chosen in the table', () => {
    let state = reduce(addPoint(0, p(1)), addPoint(0, p(3)));
    state = stitchingReducer(state, setActiveRow(state.rows[0].id));
    state = stitchingReducer(state, addPoint(2, p(5)));
    expect(state.rows[0].points[2]).toEqual(p(5));
    expect(state.rows[1].points[2]).toBeNull();
  });

  it('moves and deletes rows by id', () => {
    let state = reduce(addPoint(0, p(1)), addPoint(0, p(3)));
    const [first, second] = state.rows;
    state = stitchingReducer(state, movePoint(second.id, 0, p(9)));
    expect(state.rows[1].points[0]).toEqual(p(9));

    state = stitchingReducer(state, deleteRow(second.id));
    expect(state.rows.map((r) => r.id)).toEqual([first.id]);
    expect(state.activeRowId).toBeNull();

    expect(stitchingReducer(state, clearRows()).rows).toEqual([]);
  });

  it('clears rows when an image switches to another canvas or window', () => {
    const w1 = { canvasId: 'a', windowId: 'w1' };
    const w2 = { canvasId: 'b', windowId: 'w2' };
    const start = reduce(
      setImages([{ canvasId: undefined, windowId: 'w1' }]),
      setImages([w1, w2]),
      addPoint(0, p(1)),
    );

    // a canvas loading, another window appearing, or nothing changing keeps the rows
    expect(start.rows).toHaveLength(1);
    expect(stitchingReducer(start, setImages([w1, w2])).rows).toHaveLength(1);
    expect(stitchingReducer(start, setImages([w1, w2, { canvasId: 'c', windowId: 'w3' }])).rows).toHaveLength(1);

    expect(stitchingReducer(start, setImages([{ canvasId: 'z', windowId: 'w1' }, w2])).rows).toEqual([]);
    expect(stitchingReducer(start, setImages([w2])).rows).toEqual([]);
    expect(stitchingReducer(start, setImages([w1, { canvasId: 'c', windowId: 'w3' }])).rows).toEqual([]);
  });
});
