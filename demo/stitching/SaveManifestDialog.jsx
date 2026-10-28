import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { MANIFEST_DIR, manifestFileName, SAVE_ENDPOINT, UPLOAD_ENDPOINT, UPLOAD_URL } from './manifestFileName';

/**
 * Saves the manifest to demo/manifests/<fileName> through the dev server, with its
 * id set to the URL it will be served from. Resolves to { url } or { exists: true }.
 */
async function saveManifest(manifest, fileName, overwrite) {
  const id = `${window.location.origin}/${MANIFEST_DIR}/${fileName}`;
  const query = new URLSearchParams({ name: fileName, ...(overwrite && { overwrite: '1' }) });
  const response = await fetch(`${SAVE_ENDPOINT}?${query}`, {
    body: JSON.stringify({ ...manifest, id }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (response.status === 409) return { exists: true };
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}));
    throw new Error(error || `Saving failed (HTTP ${response.status})`);
  }
  return { manifest: { ...manifest, id }, url: id };
}

/** Saves the manifest as a JSON file in the browser's downloads */
function download(manifest, fileName) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return { manifest, url: manifest.id };
}

/**
 * Uploads the manifest to UPLOAD_URL<fileName> through the deployed site's upload function,
 * which checks the password and sets the manifest's id to its public URL. Resolves to
 * { manifest, url } or { exists: true }.
 */
async function upload(manifest, fileName, password, overwrite) {
  const response = await fetch(UPLOAD_ENDPOINT, {
    body: JSON.stringify({ manifest, name: fileName, overwrite, password }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (response.status === 409) return { exists: true };
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) throw Object.assign(new Error('Wrong password'), { field: 'password' });
  if (!response.ok) throw new Error(body.error || `Uploading failed (HTTP ${response.status})`);
  return body;
}

// the save endpoint only exists on the Vite dev server; deployed (static) builds download or upload instead
const CAN_SAVE = import.meta.env.DEV;

/** Runs one save action ('save', 'download' or 'upload') */
function runAction(action, { fileName, manifest, overwrite, password }) {
  if (action === 'save') return saveManifest(manifest, fileName, overwrite);
  if (action === 'upload') return upload(manifest, fileName, password, overwrite);
  return download(manifest, fileName);
}

/**
 * Asks for a file name and saves the stitched manifest: to demo/manifests/ under the dev
 * server, or, when deployed, as a download or a password-checked upload to UPLOAD_URL.
 * Calls onSaved({ action, fileName, manifest, url }) once it is saved.
 */
export function SaveManifestDialog({ manifest = null, onClose, onSaved }) {
  const [name, setName] = useState('stitched-manifest');
  const [nameError, setNameError] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  // the action that found an existing file, to repeat on overwrite
  const [exists, setExists] = useState(null);
  const [saving, setSaving] = useState(false);

  // a new manifest starts without the previous one's errors
  useEffect(() => {
    setNameError(null);
    setPasswordError(null);
    setExists(null);
  }, [manifest]);

  const save = async (action, overwrite = false) => {
    const fileName = manifestFileName(name);
    if (!fileName) {
      setNameError('Use letters, digits, ".", "_" or "-"');
      return;
    }
    if (action === 'upload' && !password) {
      setPasswordError('Enter the upload password');
      return;
    }

    setSaving(true);
    try {
      const result = await runAction(action, { fileName, manifest, overwrite, password });
      if (result.exists) {
        setExists(action);
        return;
      }
      onSaved({ action, fileName, manifest: result.manifest, url: result.url });
    } catch (e) {
      if (e.field === 'password') setPasswordError(e.message);
      else setNameError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /** Runs the action when Enter is pressed, unless the overwrite question is showing */
  const onEnter = (action) => (e) => e.key === 'Enter' && !exists && save(action);

  return (
    <Dialog open={!!manifest} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Save stitched manifest</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="dense"
          label="File name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
            setExists(null);
          }}
          onKeyDown={onEnter(CAN_SAVE ? 'save' : 'download')}
          error={!!nameError}
          helperText={
            nameError ||
            (CAN_SAVE ? `Saved to ${MANIFEST_DIR}/` : 'Downloaded or uploaded as ') + (manifestFileName(name) || '…')
          }
        />
        {!CAN_SAVE && (
          <TextField
            fullWidth
            margin="dense"
            type="password"
            label="Upload password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(null);
            }}
            onKeyDown={onEnter('upload')}
            error={!!passwordError}
            helperText={passwordError || `Needed to upload to ${UPLOAD_URL}`}
          />
        )}
        {exists && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {manifestFileName(name)} already exists. Overwrite it?
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {exists && (
          <Button variant="contained" color="warning" onClick={() => save(exists, true)} disabled={saving}>
            Overwrite
          </Button>
        )}
        {!exists && CAN_SAVE && (
          <Button variant="contained" onClick={() => save('save')} disabled={saving}>
            Save
          </Button>
        )}
        {!exists && !CAN_SAVE && (
          <>
            <Button variant="outlined" onClick={() => save('download')} disabled={saving}>
              Download
            </Button>
            <Button variant="contained" onClick={() => save('upload')} disabled={saving}>
              Upload to S3
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

SaveManifestDialog.propTypes = {
  manifest: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};
