import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/DeleteSharp';
import MiradorCanvas from '../../src/lib/MiradorCanvas';
import { fitScaleTranslate } from './fit';
import { buildStitchedManifest } from './buildManifest';
import { pairColor } from './StitchingMarkers';
import { SaveManifestDialog } from './SaveManifestDialog';
import { RESULT_WINDOW_PREFIX } from './selectors';

/** Image body JSON, label and pixel size of the image showing on one side */
function sideImage(canvas, label) {
  const image = canvas && new MiradorCanvas(canvas).imageResources[0];
  if (!image) return undefined;

  const width = image.getWidth() || canvas.getWidth();
  const height = image.getHeight() || canvas.getHeight();
  return { height, image: { ...image.__jsonld, height, width }, label: label || canvas.id, width };
}

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
  setSides,
  sides,
  TargetComponent,
  targetProps = {},
}) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [saved, setSaved] = useState(null);
  const fit = useMemo(() => fitScaleTranslate(pairs), [pairs]);
  const completePairs = pairs.filter((p) => p.left && p.right).length;

  // tell the reducer which windows are paired, so it can drop points when they change
  useEffect(() => {
    setSides(sides);
  }, [setSides, sides]);

  const complete = () => {
    const left = sideImage(leftCanvas, leftLabel);
    const right = sideImage(rightCanvas, rightLabel);
    const manifest = left && right && fit && buildStitchedManifest({ fit, left, pairCount: completePairs, right });

    if (!manifest) {
      setError('The aligned images do not overlap. Check the point pairs.');
      return;
    }

    setError(null);
    setPending(manifest);
  };

  const closeDialog = () => setPending(null);

  /** Shows the saved manifest in a new maximized window, with its layers listed */
  const onSaved = ({ action, fileName, manifest, url }) => {
    setPending(null);
    setSaved({ action, fileName, url: action === 'download' ? undefined : viewerUrl(url) });
    addWindow({
      manifest,
      id: `${RESULT_WINDOW_PREFIX}${crypto.randomUUID()}`,
      manifestId: url,
      maximized: true,
      sideBarOpen: true,
      sideBarPanel: 'layers',
    });
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
          Click “START HERE” and then “ADD RESOURCE” to upload manifests.
          Choose 2 manifests for the right and left side and the desired image in each manifest.  Click a point on the left image, then the matching point on the right. Drag a pin to adjust it. At least 2 pairs
          are needed; more pairs improve the fit, 8 spread through out the images are suggested.
        </Typography>
        <Typography variant="body2" component="div" sx={{ mb: 2 }}>
          {sides.left && sides.right ? (
            <>
              <strong>Left:</strong> {leftLabel || sides.left.windowId}
              <br />
              <strong>Right:</strong> {rightLabel || sides.right.windowId}
            </>
          ) : (
            'Click complete when done, name and download the manifest, and send to CIA/IT'
          )}
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

        {saved?.url && (
          <Alert severity="success" sx={{ mb: 2, wordBreak: 'break-all' }}>
            {saved.action === 'upload' ? `Uploaded ${saved.fileName}` : 'Saved'}. Open it with:{' '}
            <Link href={saved.url} target="_blank" rel="noopener">
              {saved.url}
            </Link>
          </Alert>
        )}
        {saved && !saved.url && (
          <Alert severity="success" sx={{ mb: 2, wordBreak: 'break-all' }}>
            Downloaded {saved.fileName}. Host it at a public URL to open it in other viewers.
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

      <SaveManifestDialog manifest={pending} onClose={closeDialog} onSaved={onSaved} />
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
  setSides: PropTypes.func.isRequired,
  sides: PropTypes.shape({ left: PropTypes.object, right: PropTypes.object }).isRequired,
  TargetComponent: PropTypes.elementType.isRequired,
  targetProps: PropTypes.object,
};
