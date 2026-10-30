import { unionLayout } from './fit';
import { imageLetter } from './reducer';

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
 * Builds a IIIF Presentation 3 manifest with one canvas holding all the images, each
 * in its own painting annotation targeted so that the matched points line up. The
 * reference image comes first, so it is the bottom layer.
 * Uses only plain Image bodies and xywh targets, so standard IIIF viewers can show it.
 *
 * @param {Object} params
 * @param {Array} params.images - [{ image, label, width, height }]; image is the IIIF image body JSON
 * @param {Array} params.fits - one { s, tx, ty } per image, from fitAll
 * @param {Array} params.shared - points each image shares with the reference, from fitAll
 * @param {number} params.rms - overall RMS error, from fitAll
 * @param {string} [params.id] - manifest id
 * @returns {Object|undefined} the manifest, or undefined if an aligned image overlaps none of the others
 */
export function buildStitchedManifest({ images, fits, shared, rms, id = `urn:mirador:stitched:${crypto.randomUUID()}` }) {
  const layout = unionLayout(fits, images);
  if (!layout) return undefined;

  const canvasId = `${id}/canvas/1`;
  const fitSummary = images
    .slice(1)
    .map((_, i) => `${imageLetter(i + 1)}: scale ${fits[i + 1].s.toFixed(4)}, ${shared[i + 1]} points`)
    .join('; ');
  const aligned = images.length > 2 ? `Images B-${imageLetter(images.length - 1)}` : 'Image B';

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
            items: images.map((image, i) =>
              placedImage(image, layout.targets[i], canvasId, `${id}/annotation/${i + 1}`),
            ),
            type: 'AnnotationPage',
          },
        ],
        label: { none: ['Stitched'] },
        type: 'Canvas',
        width: layout.width,
      },
    ],
    label: { none: [`Stitched: ${images.map((image) => image.label).join(' + ')}`] },
    summary: {
      none: [`${aligned} aligned to image A (${fitSummary}; RMS error ${rms.toFixed(1)} px)`],
    },
    type: 'Manifest',
  };
}
