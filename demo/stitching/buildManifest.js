import { overlapRegions } from './fit';

/** A Choice item showing only the given region of an image */
function croppedImage({ image, label }, region) {
  return {
    selector: { region: region.join(','), type: 'ImageApiSelector' },
    source: { ...image, label: { none: [label] } },
    type: 'SpecificResource',
  };
}

/**
 * Builds a IIIF Presentation 3 manifest with one canvas whose painting body is a
 * Choice of the two images, cropped so that the paired points line up.
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
  const overlap = overlapRegions(fit, left, right);
  if (!overlap) return undefined;

  const canvasId = `${id}/canvas/1`;

  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id,
    items: [
      {
        height: overlap.height,
        id: canvasId,
        items: [
          {
            id: `${id}/page/1`,
            items: [
              {
                body: {
                  items: [croppedImage(left, overlap.leftRegion), croppedImage(right, overlap.rightRegion)],
                  type: 'Choice',
                },
                id: `${id}/annotation/1`,
                motivation: 'painting',
                target: canvasId,
                type: 'Annotation',
              },
            ],
            type: 'AnnotationPage',
          },
        ],
        label: { none: ['Stitched'] },
        type: 'Canvas',
        width: overlap.width,
      },
    ],
    label: { none: [`Stitched: ${left.label} + ${right.label}`] },
    summary: {
      none: [`Aligned with ${pairCount} point pairs (scale ${fit.s.toFixed(4)}, RMS error ${fit.rms.toFixed(1)} px)`],
    },
    type: 'Manifest',
  };
}
