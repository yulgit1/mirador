import { unionLayout } from './fit';

/** A painting annotation placing one whole image at the given canvas region */
function placedImage({ image, label }, target, canvasId, annotationId) {
  return {
    body: { ...image, label: { none: [label] } },
    id: annotationId,
    motivation: 'painting',
    target: `${canvasId}#xywh=${target.join(',')}`,
    type: 'Annotation',
  };
}

/**
 * Builds a IIIF Presentation 3 manifest with one canvas holding both images, each
 * in its own painting annotation targeted so that the paired points line up.
 * Uses only plain Image bodies and xywh targets, so standard IIIF viewers can show it.
 *
 * @param {Object} params
 * @param {Object} params.left - { image, label, width, height }; image is the IIIF image body JSON
 * @param {Object} params.right - same shape as left
 * @param {Object} params.fit - result of fitScaleTranslate
 * @param {number} params.pairCount - number of point pairs the fit used
 * @param {string} [params.id] - manifest id
 * @returns {Object|undefined} the manifest, or undefined if the aligned images do not overlap
 */
export function buildStitchedManifest({ left, right, fit, pairCount, id = `urn:mirador:stitched:${crypto.randomUUID()}` }) {
  const layout = unionLayout(fit, left, right);
  if (!layout) return undefined;

  const canvasId = `${id}/canvas/1`;

  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id,
    items: [
      {
        height: layout.height,
        id: canvasId,
        items: [
          {
            id: `${id}/page/1`,
            items: [
              placedImage(left, layout.leftTarget, canvasId, `${id}/annotation/1`),
              placedImage(right, layout.rightTarget, canvasId, `${id}/annotation/2`),
            ],
            type: 'AnnotationPage',
          },
        ],
        label: { none: ['Stitched'] },
        type: 'Canvas',
        width: layout.width,
      },
    ],
    label: { none: [`Stitched: ${left.label} + ${right.label}`] },
    summary: {
      none: [`Aligned with ${pairCount} point pairs (scale ${fit.s.toFixed(4)}, RMS error ${fit.rms.toFixed(1)} px)`],
    },
    type: 'Manifest',
  };
}
