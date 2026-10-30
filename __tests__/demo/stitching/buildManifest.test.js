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
  const identity = { s: 1, tx: 0, ty: 0 };
  const manifest = buildStitchedManifest({
    fits: [identity, { s: 1, tx: -200, ty: -100 }, { s: 0.5, tx: 900, ty: 0 }],
    id: 'urn:test:stitched',
    images: [
      { height: 500, image: image('left', 1000, 500), label: 'Left', width: 1000 },
      { height: 1500, image: image('right', 2000, 1500), label: 'Right', width: 2000 },
      { height: 200, image: image('third', 600, 200), label: 'Third', width: 600 },
    ],
    rms: 1.25,
    shared: [5, 3, 2],
  });

  it('builds one canvas holding all images, each targeted at its fitted position', () => {
    const [canvas] = manifest.items;
    expect([canvas.width, canvas.height]).toEqual([2000, 1500]);

    const annotations = canvas.items[0].items;
    expect(annotations.map((a) => a.target)).toEqual([
      `${canvas.id}#xywh=200,100,1000,500`,
      `${canvas.id}#xywh=0,0,2000,1500`,
      `${canvas.id}#xywh=1100,100,300,100`,
    ]);
    expect(annotations.map((a) => a.body.type)).toEqual(['Image', 'Image', 'Image']);
    expect(annotations[1].body.label).toEqual({ none: ['Right'] });
  });

  it('labels the manifest and records the fit', () => {
    expect(manifest.label).toEqual({ none: ['Stitched: Left + Right + Third'] });
    expect(manifest.summary.none[0]).toEqual(
      'Images B-C aligned to image A (B: scale 1.0000, 3 points; C: scale 0.5000, 2 points; RMS error 1.3 px)',
    );
  });

  it('is readable by Mirador as layers placed on the canvas', () => {
    const canvas = new MiradorCanvas(Utils.parseManifest(manifest).getSequences()[0].getCanvases()[0]);
    expect(canvas.imageServiceIds).toEqual([
      'https://example.org/iiif/left',
      'https://example.org/iiif/right',
      'https://example.org/iiif/third',
    ]);
    expect(canvas.imageResources.map((r) => canvas.onFragment(r.id))).toEqual([
      [200, 100, 1000, 500],
      [0, 0, 2000, 1500],
      [1100, 100, 300, 100],
    ]);
  });

  it('returns undefined when the images do not overlap', () => {
    expect(
      buildStitchedManifest({
        fits: [identity, { s: 1, tx: 5000, ty: 0 }],
        images: [
          { height: 100, image: image('left', 100, 100), label: 'Left', width: 100 },
          { height: 100, image: image('right', 100, 100), label: 'Right', width: 100 },
        ],
        rms: 0,
        shared: [2, 2],
      }),
    ).toBeUndefined();
  });
});
