import { manifestFileName } from '../../../demo/stitching/manifestFileName';

describe('manifestFileName', () => {
  it('adds .json when missing', () => {
    expect(manifestFileName('stitched-manifest')).toEqual('stitched-manifest.json');
    expect(manifestFileName(' abbey_v2.json ')).toEqual('abbey_v2.json');
  });

  it('rejects paths, hidden files and other characters', () => {
    ['', '../evil', 'a/b', 'a\\b', '.hidden', 'has space', 'x.json/..'].forEach((name) => {
      expect(manifestFileName(name)).toBeUndefined();
    });
  });
});
