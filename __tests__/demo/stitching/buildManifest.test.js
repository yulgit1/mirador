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

  it('builds one canvas the size of the overlap with a Choice of cropped images', () => {
    const [canvas] = manifest.items;
    expect([canvas.width, canvas.height]).toEqual([1000, 500]);

    const annotation = canvas.items[0].items[0];
    expect(annotation.target).toEqual(canvas.id);
    expect(annotation.body.type).toEqual('Choice');
    expect(annotation.body.items.map((item) => item.selector)).toEqual([
      { region: '0,0,1000,500', type: 'ImageApiSelector' },
      { region: '200,100,1000,500', type: 'ImageApiSelector' },
    ]);
    expect(annotation.body.items[1].source.label).toEqual({ none: ['Right'] });
  });

  it('labels the manifest and records the fit', () => {
    expect(manifest.label).toEqual({ none: ['Stitched: Left + Right'] });
    expect(manifest.summary.none[0]).toContain('3 point pairs');
  });

  it('is readable by Mirador as two cropped layers', () => {
    const canvas = new MiradorCanvas(Utils.parseManifest(manifest).getSequences()[0].getCanvases()[0]);
    expect(canvas.imageResources.map((r) => r.region)).toEqual([
      [0, 0, 1000, 500],
      [200, 100, 1000, 500],
    ]);
    expect(canvas.imageServiceIds).toEqual(['https://example.org/iiif/left', 'https://example.org/iiif/right']);
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
