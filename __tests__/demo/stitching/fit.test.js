import { fitScaleTranslate, unionLayout } from '../../../demo/stitching/fit';

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

describe('unionLayout', () => {
  it('places the right image inside the left one at its fitted position', () => {
    // the right image (1000x1000) lands at 100,50 with scale 2, covering 100..2100 x 50..2050
    const layout = unionLayout({ s: 2, tx: 100, ty: 50 }, { height: 1500, width: 3000 }, { height: 1000, width: 1000 });
    expect(layout.leftTarget).toEqual([0, 0, 3000, 1500]);
    expect(layout.rightTarget).toEqual([100, 50, 2000, 2000]);
    expect([layout.width, layout.height]).toEqual([3000, 2050]);
  });

  it('shifts both images when the right one extends above and left of the left one', () => {
    const layout = unionLayout({ s: 1, tx: -200, ty: -100 }, { height: 500, width: 1000 }, { height: 1500, width: 2000 });
    expect(layout.leftTarget).toEqual([200, 100, 1000, 500]);
    expect(layout.rightTarget).toEqual([0, 0, 2000, 1500]);
    expect([layout.width, layout.height]).toEqual([2000, 1500]);
  });

  it('returns undefined when the images do not overlap', () => {
    expect(unionLayout({ s: 1, tx: 5000, ty: 0 }, { height: 100, width: 100 }, { height: 100, width: 100 })).toBeUndefined();
  });
});
