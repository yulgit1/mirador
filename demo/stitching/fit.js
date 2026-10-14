/**
 * Least-squares fit of a uniform scale + translation mapping right-image pixels
 * onto left-image pixels: L = s * R + t.
 *
 * @param {Array} pairs - [{ left: { x, y }, right: { x, y } }], incomplete pairs are ignored
 * @returns {Object|undefined} { s, tx, ty, residuals, rms } or undefined if fewer than 2 complete pairs
 */
export function fitScaleTranslate(pairs) {
  const complete = pairs.filter((p) => p.left && p.right);
  if (complete.length < 2) return undefined;

  const n = complete.length;
  const mean = (side, axis) => complete.reduce((sum, p) => sum + p[side][axis], 0) / n;
  const lx = mean('left', 'x');
  const ly = mean('left', 'y');
  const rx = mean('right', 'x');
  const ry = mean('right', 'y');

  let numerator = 0;
  let denominator = 0;
  complete.forEach(({ left, right }) => {
    const drx = right.x - rx;
    const dry = right.y - ry;
    numerator += drx * (left.x - lx) + dry * (left.y - ly);
    denominator += drx * drx + dry * dry;
  });

  // all right points coincide, so no scale can be determined
  if (denominator === 0 || numerator <= 0) return undefined;

  const s = numerator / denominator;
  const tx = lx - s * rx;
  const ty = ly - s * ry;

  const residuals = pairs.map(({ left, right }) =>
    left && right ? Math.hypot(s * right.x + tx - left.x, s * right.y + ty - left.y) : undefined,
  );
  const completeResiduals = residuals.filter((r) => r !== undefined);
  const rms = Math.sqrt(completeResiduals.reduce((sum, r) => sum + r * r, 0) / completeResiduals.length);

  return {
    residuals,
    rms,
    s,
    tx,
    ty,
  };
}

/**
 * The area both images share, once the right image is placed onto the left one.
 *
 * @param {Object} fit - result of fitScaleTranslate
 * @param {Object} leftSize - { width, height } of the left image in pixels
 * @param {Object} rightSize - { width, height } of the right image in pixels
 * @returns {Object|undefined} { leftRegion, rightRegion, width, height } with integer [x, y, w, h]
 *   regions inside each image, or undefined if the images do not overlap
 */
export function overlapRegions({ s, tx, ty }, leftSize, rightSize) {
  const x0 = Math.max(0, tx);
  const y0 = Math.max(0, ty);
  const x1 = Math.min(leftSize.width, tx + s * rightSize.width);
  const y1 = Math.min(leftSize.height, ty + s * rightSize.height);

  if (x1 - x0 < 1 || y1 - y0 < 1) return undefined;

  const leftRegion = [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)];

  const rightX = Math.max(0, Math.round((x0 - tx) / s));
  const rightY = Math.max(0, Math.round((y0 - ty) / s));
  const rightRegion = [
    rightX,
    rightY,
    Math.min(rightSize.width - rightX, Math.round((x1 - x0) / s)),
    Math.min(rightSize.height - rightY, Math.round((y1 - y0) / s)),
  ];

  return {
    height: leftRegion[3],
    leftRegion,
    rightRegion,
    width: leftRegion[2],
  };
}
