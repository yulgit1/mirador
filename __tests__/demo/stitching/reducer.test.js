import {
  addPoint,
  clearPairs,
  deletePair,
  movePoint,
  setSides,
  stitchingReducer,
} from '../../../demo/stitching/reducer';

/** Apply actions in order, starting from the initial state */
const reduce = (...actions) => actions.reduce(stitchingReducer, stitchingReducer(undefined, {}));

describe('stitchingReducer', () => {
  it('pairs a left point with the next right point', () => {
    const { pairs } = reduce(addPoint('left', { x: 1, y: 1 }), addPoint('right', { x: 2, y: 2 }));
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ left: { x: 1, y: 1 }, right: { x: 2, y: 2 } });
  });

  it('completes the first pair missing that side', () => {
    const { pairs } = reduce(
      addPoint('left', { x: 1, y: 1 }),
      addPoint('left', { x: 3, y: 3 }),
      addPoint('right', { x: 2, y: 2 }),
    );
    expect(pairs).toHaveLength(2);
    expect(pairs[0].right).toEqual({ x: 2, y: 2 });
    expect(pairs[1].right).toBeNull();
  });

  it('moves and deletes pairs by id', () => {
    let state = reduce(addPoint('left', { x: 1, y: 1 }), addPoint('left', { x: 3, y: 3 }));
    const [first, second] = state.pairs;
    state = stitchingReducer(state, movePoint(second.id, 'left', { x: 9, y: 9 }));
    expect(state.pairs[1].left).toEqual({ x: 9, y: 9 });

    state = stitchingReducer(state, deletePair(first.id));
    expect(state.pairs.map((p) => p.id)).toEqual([second.id]);

    expect(stitchingReducer(state, clearPairs()).pairs).toEqual([]);
  });

  it('clears pairs when a side switches to another canvas or window', () => {
    const sides = (left, right) => setSides({ left, right });
    const start = reduce(
      sides({ canvasId: undefined, windowId: 'w1' }, null),
      sides({ canvasId: 'a', windowId: 'w1' }, { canvasId: 'b', windowId: 'w2' }),
      addPoint('left', { x: 1, y: 1 }),
    );

    // a canvas loading, a second window appearing, or nothing changing keeps the pairs
    expect(start.pairs).toHaveLength(1);
    expect(stitchingReducer(start, sides({ canvasId: 'a', windowId: 'w1' }, { canvasId: 'b', windowId: 'w2' })).pairs).toHaveLength(1);

    expect(stitchingReducer(start, sides({ canvasId: 'z', windowId: 'w1' }, { canvasId: 'b', windowId: 'w2' })).pairs).toEqual([]);
    expect(stitchingReducer(start, sides({ canvasId: 'b', windowId: 'w2' }, null)).pairs).toEqual([]);
    expect(stitchingReducer(start, sides({ canvasId: 'a', windowId: 'w1' }, { canvasId: 'c', windowId: 'w3' })).pairs).toEqual([]);
  });
});
