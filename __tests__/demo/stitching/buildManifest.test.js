import { Utils } from 'manifesto.js';
import { buildStitchedManifest } from '../../../demo/stitching/buildManifest';
import MiradorCanvas from '../../../src/lib/MiradorCanvas';

/** An IIIF image body */
const image = (name, width, height) => ({
  format: 'image/jpeg',
  height,
  id: `https://example.org/iiif/${name}/full/max/0/default.jpg`,
  service: [{ '@id': `https://example.org/iiif/${name}`, '@type': 'ImageService2', profile: 'level2' }],
  type: 'Image',
  width,
});

describe('buildStitchedManifest', () => {
  const manifest = buildStitchedManifest({
    fit: { rms: 1.25, s: 1, tx: -200, ty: -100 },
    id: 'urn:test:stitched',
    left: { height: 500, image: image('left', 1000, 500), label: 'Left', width: 1000 },
    pairCount: 3,
    right: { height: 1500, image: image('right', 2000, 1500), label: 'Right', width: 2000 },
  });

  it('builds one canvas holding both images, each targeted at its fitted position', () => {
    const [canvas] = manifest.items;
    expect([canvas.width, canvas.height]).toEqual([2000, 1500]);

    const annotations = canvas.items[0].items;
    expect(annotations.map((a) => a.target)).toEqual([
      `${canvas.id}#xywh=200,100,1000,500`,
      `${canvas.id}#xywh=0,0,2000,1500`,
    ]);
    expect(annotations.map((a) => a.body.type)).toEqual(['Image', 'Image']);
    expect(annotations[1].body.label).toEqual({ none: ['Right'] });
  });

  it('labels the manifest and records the fit', () => {
    expect(manifest.label).toEqual({ none: ['Stitched: Left + Right'] });
    expect(manifest.summary.none[0]).toContain('3 point pairs');
  });

  it('is readable by Mirador as two layers placed on the canvas', () => {
    const canvas = new MiradorCanvas(Utils.parseManifest(manifest).getSequences()[0].getCanvases()[0]);
    expect(canvas.imageServiceIds).toEqual(['https://example.org/iiif/left', 'https://example.org/iiif/right']);
    expect(canvas.imageResources.map((r) => canvas.onFragment(r.id))).toEqual([
      [200, 100, 1000, 500],
      [0, 0, 2000, 1500],
    ]);
  });

  it('returns undefined when the images do not overlap', () => {
    expect(
      buildStitchedManifest({
        fit: { rms: 0, s: 1, tx: 5000, ty: 0 },
        left: { height: 100, image: image('left', 100, 100), label: 'Left', width: 100 },
        pairCount: 2,
        right: { height: 100, image: image('right', 100, 100), label: 'Right', width: 100 },
      }),
    ).toBeUndefined();
  });
});
