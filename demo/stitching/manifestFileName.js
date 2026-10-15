export const SAVE_ENDPOINT = '/__stitching/save-manifest';
export const MANIFEST_DIR = 'demo/manifests';

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
