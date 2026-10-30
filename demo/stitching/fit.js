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

/** The fit placing the reference image as it is */
const IDENTITY = { rms: 0, s: 1, tx: 0, ty: 0 };

/** Root mean square of a list of numbers, or undefined if it is empty */
const rootMeanSquare = (values) =>
  values.length ? Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length) : undefined;

/**
 * Fits every image to the reference image (index 0) using the rows that have a
 * point on both.
 *
 * @param {Array} rows - [{ points: [p0, p1, ...] }], each point { x, y } or null
 * @param {number} count - number of images
 * @returns {Object} { fits, shared, rowErrors, rms, complete }: fits[i] is a
 *   fitScaleTranslate result (identity for image 0) or undefined if image i cannot be fitted yet;
 *   shared[i] is how many rows image i shares with image 0; rowErrors[r] is the RMS distance of
 *   row r's points from where the reference image puts them; complete is true when every image is fitted
 */
export function fitAll(rows, count) {
  const fits = [IDENTITY];
  const shared = [rows.filter((r) => r.points[0]).length];
  for (let i = 1; i < count; i += 1) {
    const pairs = rows.map((r) => ({ left: r.points[0], right: r.points[i] }));
    shared.push(pairs.filter((p) => p.left && p.right).length);
    fits.push(fitScaleTranslate(pairs));
  }

  const rowErrors = rows.map((_, r) =>
    rootMeanSquare(fits.slice(1).map((fit) => fit?.residuals[r]).filter((e) => e !== undefined)),
  );
  const allErrors = fits.slice(1).flatMap((fit) => (fit ? fit.residuals.filter((e) => e !== undefined) : []));

  return {
    complete: count > 1 && fits.every(Boolean),
    fits,
    rms: rootMeanSquare(allErrors),
    rowErrors,
    shared,
  };
}

/** Width and height two [x, y, w, h] rectangles have in common */
const overlap = (a, b) => [
  Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]),
  Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]),
];

/**
 * Places all images on one canvas big enough to hold them, using reference-image
 * pixels as canvas units, so that the matched points coincide.
 *
 * @param {Array} fits - one { s, tx, ty } per image (identity for the reference image)
 * @param {Array} sizes - { width, height } of each image in pixels
 * @returns {Object|undefined} { targets, width, height } with an integer [x, y, w, h]
 *   canvas target per image, or undefined if an image overlaps none of the others
 */
export function unionLayout(fits, sizes) {
  const rects = fits.map(({ s, tx, ty }, i) => [tx, ty, s * sizes[i].width, s * sizes[i].height]);
  const isolated = rects.some((rect, i) =>
    rects.every((other, j) => {
      if (i === j) return true;
      const [w, h] = overlap(rect, other);
      return w < 1 || h < 1;
    }),
  );
  if (isolated) return undefined;

  // shift everything so the canvas starts at (0, 0)
  const originX = Math.min(...rects.map((r) => r[0]));
  const originY = Math.min(...rects.map((r) => r[1]));
  const targets = rects.map(([x, y, w, h]) => [
    Math.round(x - originX),
    Math.round(y - originY),
    Math.round(w),
    Math.round(h),
  ]);

  return {
    height: Math.max(...targets.map((t) => t[1] + t[3])),
    targets,
    width: Math.max(...targets.map((t) => t[0] + t[2])),
  };
}
