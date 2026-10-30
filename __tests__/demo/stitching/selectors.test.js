import { getIgnoredWindowCount, getStitchingImages, getStitchingIndex } from '../../../demo/stitching/selectors';

/** A Mirador state with the given windows (id -> canvasId) and workspace */
const state = (windows, workspace) => ({
  elasticLayout: workspace.elastic || {},
  windows: Object.fromEntries(Object.entries(windows).map(([id, canvasId]) => [id, { canvasId, id }])),
  workspace: { type: 'mosaic', windowIds: Object.keys(windows), ...workspace },
});

describe('getStitchingImages', () => {
  it('takes windows in mosaic layout order, whatever their ids', () => {
    const s = state(
      { 'window-a': 'ca', 'window-b': 'cb' },
      { layout: { direction: 'row', first: 'window-b', second: 'window-a' } },
    );
    expect(getStitchingImages(s)).toEqual([
      { canvasId: 'cb', windowId: 'window-b' },
      { canvasId: 'ca', windowId: 'window-a' },
    ]);
    expect(getStitchingIndex(s, { windowId: 'window-b' })).toEqual(0);
    expect(getStitchingIndex(s, { windowId: 'window-a' })).toEqual(1);
  });

  it('ignores result windows and places windows missing from the layout last', () => {
    const s = state(
      { 'stitch-result-1': 'r', 'window-a': 'ca', 'window-new': 'cn' },
      { layout: { direction: 'row', first: 'stitch-result-1', second: 'window-a' } },
    );
    expect(getStitchingImages(s).map((i) => i.windowId)).toEqual(['window-a', 'window-new']);
    expect(getStitchingIndex(s, { windowId: 'stitch-result-1' })).toBeUndefined();
  });

  it('reads a 2x2 mosaic grid row by row', () => {
    const column = (first, second) => ({ direction: 'column', first, second });
    const s = state(
      { a: '1', b: '2', c: '3', d: '4' },
      { layout: { direction: 'row', first: column('a', 'b'), second: column('c', 'd') } },
    );
    expect(getStitchingImages(s).map((i) => i.windowId)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('stitches at most four windows', () => {
    const s = state({ a: '1', b: '2', c: '3', d: '4', e: '5' }, {});
    expect(getStitchingImages(s).map((i) => i.windowId)).toEqual(['a', 'b', 'c', 'd']);
    expect(getStitchingIndex(s, { windowId: 'd' })).toEqual(3);
    expect(getStitchingIndex(s, { windowId: 'e' })).toBeUndefined();
    expect(getIgnoredWindowCount(s)).toEqual(1);
  });

  it('orders elastic windows by position and handles a single window', () => {
    const s = state(
      { a: 'ca', b: 'cb' },
      { elastic: { a: { x: 900, y: 0 }, b: { x: 100, y: 0 } }, type: 'elastic' },
    );
    expect(getStitchingImages(s)[0].windowId).toEqual('b');
    expect(getStitchingImages(state({ a: 'ca' }, {}))).toEqual([{ canvasId: 'ca', windowId: 'a' }]);
  });
});
