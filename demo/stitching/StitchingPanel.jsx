import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/DeleteSharp';
import MiradorCanvas from '../../src/lib/MiradorCanvas';
import { fitScaleTranslate } from './fit';
import { buildStitchedManifest } from './buildManifest';
import { MANIFEST_DIR, manifestFileName, SAVE_ENDPOINT } from './manifestFileName';
import { pairColor } from './StitchingMarkers';

/** Image body JSON, label and pixel size of the image showing on one side */
function sideImage(canvas, label) {
  const image = canvas && new MiradorCanvas(canvas).imageResources[0];
  if (!image) return undefined;

  const width = image.getWidth() || canvas.getWidth();
  const height = image.getHeight() || canvas.getHeight();
  return { height, image: { ...image.__jsonld, height, width }, label: label || canvas.id, width };
}

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

// the save endpoint only exists on the Vite dev server; deployed (static) builds download instead
const CAN_SAVE = import.meta.env.DEV;

/** The layers-open demo page showing the given manifest */
const viewerUrl = (manifestUrl) => `${window.location.origin}/demo/layers-open.html?manifest=${manifestUrl}`;

/** Formats an image point */
const formatPoint = (point) => (point ? `${Math.round(point.x)}, ${Math.round(point.y)}` : '—');

/** Docks the point-pair panel next to the Mirador workspace */
export function StitchingPanel({
  addWindow,
  clearPairs,
  deletePair,
  leftCanvas = undefined,
  leftLabel = undefined,
  pairs = [],
  rightCanvas = undefined,
  rightLabel = undefined,
  TargetComponent,
  targetProps = {},
}) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [name, setName] = useState('stitched-manifest');
  const [nameError, setNameError] = useState(null);
  const [exists, setExists] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState(null);
  const fit = useMemo(() => fitScaleTranslate(pairs), [pairs]);
  const completePairs = pairs.filter((p) => p.left && p.right).length;

  const complete = () => {
    const left = sideImage(leftCanvas, leftLabel);
    const right = sideImage(rightCanvas, rightLabel);
    const manifest = left && right && fit && buildStitchedManifest({ fit, left, pairCount: completePairs, right });

    if (!manifest) {
      setError('The aligned images do not overlap. Check the point pairs.');
      return;
    }

    setError(null);
    setNameError(null);
    setExists(false);
    setPending(manifest);
  };

  const closeDialog = () => setPending(null);

  const save = async (overwrite = false) => {
    const fileName = manifestFileName(name);
    if (!fileName) {
      setNameError('Use letters, digits, ".", "_" or "-"');
      return;
    }

    setSaving(true);
    try {
      const result = CAN_SAVE ? await saveManifest(pending, fileName, overwrite) : download(pending, fileName);
      if (result.exists) {
        setExists(true);
        return;
      }
      setPending(null);
      setSavedUrl(CAN_SAVE ? viewerUrl(result.url) : fileName);
      addWindow({
        manifest: result.manifest,
        manifestId: result.url,
        maximized: true,
        sideBarOpen: true,
        sideBarPanel: 'layers',
      });
    } catch (e) {
      setNameError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', inset: 0, position: 'absolute' }}>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <TargetComponent {...targetProps} />
      </Box>
      <Paper
        component="aside"
        aria-label="Point pairs"
        square
        elevation={0}
        sx={{ borderColor: 'divider', borderLeft: 1, flexShrink: 0, overflowY: 'auto', p: 2, width: 380 }}
      >
        <Typography variant="h6" component="h2">
          Point pairs
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Click a point on the left image, then the matching point on the right. Drag a pin to adjust it. At least 2 pairs
          are needed; more pairs improve the fit.
        </Typography>

        <Table size="small" aria-label="Point pairs" sx={{ '& .MuiTableCell-root': { px: 1, whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Left (x, y)</TableCell>
              <TableCell>Right (x, y)</TableCell>
              <TableCell align="right">Error</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {pairs.map((pair, index) => (
              <TableRow key={pair.id} sx={{ opacity: pair.left && pair.right ? 1 : 0.6 }}>
                <TableCell sx={{ borderLeft: `4px solid ${pairColor(index)}` }}>{index + 1}</TableCell>
                <TableCell>{formatPoint(pair.left)}</TableCell>
                <TableCell>{formatPoint(pair.right)}</TableCell>
                <TableCell align="right">
                  {fit?.residuals[index] === undefined ? '' : `${fit.residuals[index].toFixed(1)} px`}
                </TableCell>
                <TableCell padding="none">
                  <IconButton size="small" aria-label={`Delete pair ${index + 1}`} onClick={() => deletePair(pair.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {pairs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No points yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Typography variant="body2" sx={{ my: 2 }}>
          {fit
            ? `Scale ${fit.s.toFixed(4)}, offset (${Math.round(fit.tx)}, ${Math.round(fit.ty)}), RMS error ${fit.rms.toFixed(1)} px`
            : `${completePairs} of 2 required pairs`}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {savedUrl && CAN_SAVE && (
          <Alert severity="success" sx={{ mb: 2, wordBreak: 'break-all' }}>
            Saved. Open it with:{' '}
            <Link href={savedUrl} target="_blank" rel="noopener">
              {savedUrl}
            </Link>
          </Alert>
        )}
        {savedUrl && !CAN_SAVE && (
          <Alert severity="success" sx={{ mb: 2, wordBreak: 'break-all' }}>
            Downloaded {savedUrl}. Host it at a public URL to open it in other viewers.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={clearPairs} disabled={pairs.length === 0}>
            Clear
          </Button>
          <Button variant="contained" onClick={complete} disabled={!fit}>
            Complete
          </Button>
        </Box>
      </Paper>

      <Dialog open={!!pending} onClose={closeDialog} fullWidth maxWidth="xs">
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
              setExists(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && !exists && save()}
            error={!!nameError}
            helperText={
              nameError ||
              (CAN_SAVE ? `Saved to ${MANIFEST_DIR}/` : 'Downloaded as ') + (manifestFileName(name) || '…')
            }
          />
          {exists && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {manifestFileName(name)} already exists. Overwrite it?
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          {exists ? (
            <Button variant="contained" color="warning" onClick={() => save(true)} disabled={saving}>
              Overwrite
            </Button>
          ) : (
            <Button variant="contained" onClick={() => save()} disabled={saving}>
              {CAN_SAVE ? 'Save' : 'Download'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

StitchingPanel.propTypes = {
  addWindow: PropTypes.func.isRequired,
  clearPairs: PropTypes.func.isRequired,
  deletePair: PropTypes.func.isRequired,
  leftCanvas: PropTypes.object,
  leftLabel: PropTypes.string,
  pairs: PropTypes.arrayOf(PropTypes.object),
  rightCanvas: PropTypes.object,
  rightLabel: PropTypes.string,
  TargetComponent: PropTypes.elementType.isRequired,
  targetProps: PropTypes.object,
};
