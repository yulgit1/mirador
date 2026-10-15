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
 * Places both images on one canvas big enough to hold them, using left-image pixels
 * as canvas units, so that the paired points coincide.
 *
 * @param {Object} fit - result of fitScaleTranslate
 * @param {Object} leftSize - { width, height } of the left image in pixels
 * @param {Object} rightSize - { width, height } of the right image in pixels
 * @returns {Object|undefined} { leftTarget, rightTarget, width, height } with integer [x, y, w, h]
 *   canvas targets, or undefined if the images do not overlap
 */
export function unionLayout({ s, tx, ty }, leftSize, rightSize) {
  const rightWidth = s * rightSize.width;
  const rightHeight = s * rightSize.height;

  const overlapWidth = Math.min(leftSize.width, tx + rightWidth) - Math.max(0, tx);
  const overlapHeight = Math.min(leftSize.height, ty + rightHeight) - Math.max(0, ty);
  if (overlapWidth < 1 || overlapHeight < 1) return undefined;

  // shift everything so the canvas starts at (0, 0)
  const originX = Math.min(0, tx);
  const originY = Math.min(0, ty);
  const leftTarget = [Math.round(0 - originX), Math.round(0 - originY), leftSize.width, leftSize.height];
  const rightTarget = [
    Math.round(tx - originX),
    Math.round(ty - originY),
    Math.round(rightWidth),
    Math.round(rightHeight),
  ];

  return {
    height: Math.max(leftTarget[1] + leftTarget[3], rightTarget[1] + rightTarget[3]),
    leftTarget,
    rightTarget,
    width: Math.max(leftTarget[0] + leftTarget[2], rightTarget[0] + rightTarget[2]),
  };
}
