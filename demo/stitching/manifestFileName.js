export const SAVE_ENDPOINT = '/__stitching/save-manifest';
export const MANIFEST_DIR = 'demo/manifests';
// served by the deployed site's upload function (deploy/site.yaml), not the dev server
export const UPLOAD_ENDPOINT = '/api/upload-manifest';
export const UPLOAD_URL = 'https://chit-iiif.s3.us-east-1.amazonaws.com/manifests/uploads/';

/**
 * A safe file name for a saved manifest: letters, digits, '.', '_' and '-' only,
 * ending in .json. Returns undefined for anything else (including paths).
 */
export function manifestFileName(name) {
  const trimmed = (name || '').trim();
  const withExtension = trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`;
  if (!/^[A-Za-z0-9_-][A-Za-z0-9._-]*\.json$/.test(withExtension) || withExtension.length > 200) return undefined;
  return withExtension;
}
