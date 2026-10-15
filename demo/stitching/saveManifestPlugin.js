import fs from 'fs/promises';
import path from 'node:path';
// Vite's native config loader needs the extension
// eslint-disable-next-line import/extensions
import { MANIFEST_DIR, manifestFileName, SAVE_ENDPOINT } from './manifestFileName.js';

const MAX_BYTES = 5 * 1024 * 1024;

/** Reads a request body, rejecting bodies over MAX_BYTES */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(new Error('Manifest is too large'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Sends a JSON response */
function send(res, status, body) {
  res.statusCode = status; // eslint-disable-line no-param-reassign
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Vite dev-server plugin for demo/stitching.html: POST a manifest to
 * SAVE_ENDPOINT?name=<file>.json to write it to demo/manifests/. Responds 409 if
 * the file exists, unless &overwrite=1 is given. Only runs under `npm start`.
 */
export function saveManifestPlugin({ root = process.cwd() } = {}) {
  return {
    configureServer(server) {
      server.middlewares.use(SAVE_ENDPOINT, async (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });

        const params = new URL(req.url, 'http://localhost').searchParams;
        const fileName = manifestFileName(params.get('name'));
        if (!fileName) return send(res, 400, { error: 'Use a name made of letters, digits, ".", "_" or "-"' });

        let manifest;
        try {
          manifest = JSON.parse(await readBody(req));
        } catch (e) {
          return send(res, 400, { error: e.message });
        }

        const dir = path.resolve(root, MANIFEST_DIR);
        const file = path.join(dir, fileName);
        try {
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, {
            flag: params.get('overwrite') === '1' ? 'w' : 'wx',
          });
        } catch (e) {
          if (e.code === 'EEXIST') return send(res, 409, { error: `${fileName} already exists` });
          return send(res, 500, { error: e.message });
        }

        return send(res, 201, { path: `/${MANIFEST_DIR}/${fileName}` });
      });
    },
    name: 'stitching-save-manifest',
  };
}
