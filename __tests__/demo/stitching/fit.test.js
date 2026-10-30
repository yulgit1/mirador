import { fitAll, fitScaleTranslate, unionLayout } from '../../../demo/stitching/fit';

/** A pair whose left point is the right point scaled by s and shifted by (tx, ty) */
const pair = (x, y, { s = 2, tx = 100, ty = 50 } = {}) => ({ left: { x: s * x + tx, y: s * y + ty }, right: { x, y } });

describe('fitScaleTranslate', () => {
  it('needs at least two complete pairs', () => {
    expect(fitScaleTranslate([])).toBeUndefined();
    expect(fitScaleTranslate([pair(0, 0), { left: { x: 1, y: 1 }, right: null }])).toBeUndefined();
  });

  it('recovers an exact scale and translation', () => {
    const fit = fitScaleTranslate([pair(10, 10), pair(200, 40), pair(30, 300)]);
    expect(fit.s).toBeCloseTo(2);
    expect(fit.tx).toBeCloseTo(100);
    expect(fit.ty).toBeCloseTo(50);
    expect(fit.rms).toBeCloseTo(0);
  });

  it('reports a residual per pair, leaving incomplete pairs undefined', () => {
    const fit = fitScaleTranslate([
      { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
      { left: { x: 10, y: 0 }, right: { x: 10, y: 0 } },
      { left: { x: 5, y: 2 }, right: { x: 5, y: 0 } },
      { left: { x: 1, y: 1 }, right: null },
    ]);
    expect(fit.residuals).toHaveLength(4);
    expect(fit.residuals[2]).toBeGreaterThan(fit.residuals[0]);
    expect(fit.residuals[3]).toBeUndefined();
    expect(fit.rms).toBeGreaterThan(0);
  });

  it('rejects pairs whose right points all coincide', () => {
    expect(fitScaleTranslate([pair(5, 5), { left: { x: 9, y: 9 }, right: { x: 5, y: 5 } }])).toBeUndefined();
  });
});

/** A point on an image that maps to reference point (x, y) by reference = s * point + t */
const on = (x, y, { s, tx, ty }) => ({ x: (x - tx) / s, y: (y - ty) / s });

describe('fitAll', () => {
  const b = { s: 2, tx: 100, ty: 50 };
  const c = { s: 0.5, tx: -20, ty: 10 };
  const d = { s: 1, tx: 300, ty: 0 };

  it('fits every image to the reference image using the points they share', () => {
    const rows = [
      { points: [{ x: 0, y: 0 }, on(0, 0, b), on(0, 0, c), null] },
      { points: [{ x: 400, y: 0 }, on(400, 0, b), null, on(400, 0, d)] },
      { points: [{ x: 0, y: 400 }, null, on(0, 400, c), on(0, 400, d)] },
      { points: [{ x: 400, y: 400 }, on(400, 400, b), on(400, 400, c), null] },
    ];
    const result = fitAll(rows, 4);
    expect(result.complete).toBe(true);
    expect(result.shared).toEqual([4, 3, 3, 2]);
    [b, c, d].forEach((expected, i) => {
      expect(result.fits[i + 1].s).toBeCloseTo(expected.s);
      expect(result.fits[i + 1].tx).toBeCloseTo(expected.tx);
      expect(result.fits[i + 1].ty).toBeCloseTo(expected.ty);
    });
    expect(result.rms).toBeCloseTo(0);
    expect(result.rowErrors).toHaveLength(4);
  });

  it('is incomplete until every image shares two points with the reference', () => {
    const rows = [
      { points: [{ x: 0, y: 0 }, on(0, 0, b), on(0, 0, c)] },
      { points: [{ x: 400, y: 0 }, on(400, 0, b), null] },
      { points: [null, null, on(9, 9, c)] },
    ];
    const result = fitAll(rows, 3);
    expect(result.complete).toBe(false);
    expect(result.fits[1]).toBeDefined();
    expect(result.fits[2]).toBeUndefined();
    expect(result.shared.slice(1)).toEqual([2, 1]);
    expect(result.rowErrors[2]).toBeUndefined();
  });

  it('is incomplete with a single image', () => {
    expect(fitAll([], 1).complete).toBe(false);
  });
});

describe('unionLayout', () => {
  const identity = { s: 1, tx: 0, ty: 0 };

  it('places an image inside the reference image at its fitted position', () => {
    // the second image (1000x1000) lands at 100,50 with scale 2, covering 100..2100 x 50..2050
    const layout = unionLayout(
      [identity, { s: 2, tx: 100, ty: 50 }],
      [{ height: 1500, width: 3000 }, { height: 1000, width: 1000 }],
    );
    expect(layout.targets).toEqual([
      [0, 0, 3000, 1500],
      [100, 50, 2000, 2000],
    ]);
    expect([layout.width, layout.height]).toEqual([3000, 2050]);
  });

  it('shifts all images when one extends above and left of the reference image', () => {
    const layout = unionLayout(
      [identity, { s: 1, tx: -200, ty: -100 }, { s: 1, tx: 900, ty: 0 }],
      [{ height: 500, width: 1000 }, { height: 1500, width: 2000 }, { height: 100, width: 300 }],
    );
    expect(layout.targets).toEqual([
      [200, 100, 1000, 500],
      [0, 0, 2000, 1500],
      [1100, 100, 300, 100],
    ]);
    expect([layout.width, layout.height]).toEqual([2000, 1500]);
  });

  it('accepts an image that overlaps only a non-reference image', () => {
    const size = { height: 100, width: 100 };
    const fits = [identity, { s: 1, tx: 90, ty: 0 }, { s: 1, tx: 180, ty: 0 }];
    expect(unionLayout(fits, [size, size, size])).toBeDefined();
  });

  it('returns undefined when an image overlaps none of the others', () => {
    const size = { height: 100, width: 100 };
    expect(unionLayout([identity, { s: 1, tx: 5000, ty: 0 }], [size, size])).toBeUndefined();
    expect(unionLayout([identity, { s: 1, tx: 50, ty: 0 }, { s: 1, tx: 5000, ty: 0 }], [size, size, size])).toBeUndefined();
  });
});
