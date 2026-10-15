import { getStitchingSide, getStitchingSides } from '../../../demo/stitching/selectors';

/** A Mirador state with the given windows (id -> canvasId) and workspace */
const state = (windows, workspace) => ({
  elasticLayout: workspace.elastic || {},
  windows: Object.fromEntries(Object.entries(windows).map(([id, canvasId]) => [id, { canvasId, id }])),
  workspace: { type: 'mosaic', windowIds: Object.keys(windows), ...workspace },
});

describe('getStitchingSides', () => {
  it('pairs the first two windows of the mosaic layout, whatever their ids', () => {
    const s = state(
      { 'window-a': 'ca', 'window-b': 'cb' },
      { layout: { direction: 'row', first: 'window-b', second: 'window-a' } },
    );
    expect(getStitchingSides(s)).toEqual({
      left: { canvasId: 'cb', windowId: 'window-b' },
      right: { canvasId: 'ca', windowId: 'window-a' },
    });
    expect(getStitchingSide(s, { windowId: 'window-b' })).toEqual('left');
    expect(getStitchingSide(s, { windowId: 'window-a' })).toEqual('right');
  });

  it('ignores result windows and places windows missing from the layout last', () => {
    const s = state(
      { 'stitch-result-1': 'r', 'window-a': 'ca', 'window-new': 'cn' },
      { layout: { direction: 'row', first: 'stitch-result-1', second: 'window-a' } },
    );
    expect(getStitchingSides(s).left.windowId).toEqual('window-a');
    expect(getStitchingSides(s).right.windowId).toEqual('window-new');
    expect(getStitchingSide(s, { windowId: 'stitch-result-1' })).toBeUndefined();
  });

  it('orders elastic windows by position and handles a single window', () => {
    const s = state(
      { a: 'ca', b: 'cb' },
      { elastic: { a: { x: 900, y: 0 }, b: { x: 100, y: 0 } }, type: 'elastic' },
    );
    expect(getStitchingSides(s).left.windowId).toEqual('b');
    expect(getStitchingSides(state({ a: 'ca' }, {}))).toEqual({ left: { canvasId: 'ca', windowId: 'a' }, right: null });
  });
});
