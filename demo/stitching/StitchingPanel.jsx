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
import { fitAll } from './fit';
import { buildStitchedManifest } from './buildManifest';
import { isMatched, rowColor } from './StitchingMarkers';
import { SaveManifestDialog } from './SaveManifestDialog';
import { imageLetter, MAX_IMAGES } from './reducer';
import { RESULT_WINDOW_PREFIX } from './selectors';

/** Image body JSON, label and pixel size of the image showing in one window */
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

/** Docks the matched-points panel next to the Mirador workspace */
export function StitchingPanel({
  activeRowId = null,
  addWindow,
  clearRows,
  deleteRow,
  ignoredWindowCount = 0,
  images = [],
  rows = [],
  setActiveRow,
  setImages,
  stitchingImages,
  TargetComponent,
  targetProps = {},
}) {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [saved, setSaved] = useState(null);
  const count = images.length;
  const result = useMemo(() => fitAll(rows, count), [rows, count]);
  const letters = images.map((_, i) => imageLetter(i));

  // tell the reducer which windows are stitched, so it can drop points when they change
  useEffect(() => {
    setImages(stitchingImages);
  }, [setImages, stitchingImages]);

  const complete = () => {
    const sized = images.map(({ canvas, label }) => sideImage(canvas, label));
    const manifest =
      result.complete &&
      sized.every(Boolean) &&
      buildStitchedManifest({ fits: result.fits, images: sized, rms: result.rms, shared: result.shared });

    if (!manifest) {
      setError('An aligned image does not overlap any of the others. Check the points.');
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

  /** Fit status of one non-reference image */
  const fitStatus = (i) => {
    const fit = result.fits[i];
    const shared = `${result.shared[i]} shared with A`;
    return fit ? `scale ${fit.s.toFixed(4)}, offset (${Math.round(fit.tx)}, ${Math.round(fit.ty)}), ${shared}` : `${shared}, 2 needed`;
  };

  return (
    <Box sx={{ display: 'flex', inset: 0, position: 'absolute' }}>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <TargetComponent {...targetProps} />
      </Box>
      <Paper
        component="aside"
        aria-label="Matched points"
        square
        elevation={0}
        sx={{
          borderColor: 'divider',
          borderLeft: 1,
          flexShrink: 0,
          overflowY: 'auto',
          p: 2,
          width: count > 2 ? 520 : 380,
        }}
      >
        <Typography variant="h6" component="h2">
          Matched points
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Click “START HERE” and then “ADD RESOURCE” to upload manifests. Open 2 to {MAX_IMAGES} manifests and choose
          the desired image in each; the first window on screen is image A, which the others are aligned to. Click a
          landmark on each image that shows it; the points go in the highlighted row. Clicking an image that already
          has a point in that row starts a new row, and clicking a row lets you add its missing points. Drag a pin to
          adjust it. Each image needs at least 2 points shared with A; more improve the fit, 8 spread through out the
          images are suggested.
        </Typography>
        <Typography variant="body2" component="div" sx={{ mb: 2 }}>
          {count > 1
            ? images.map(({ label, windowId }, i) => (
                <div key={windowId}>
                  <strong>{letters[i]}:</strong> {label || windowId}
                </div>
              ))
            : 'Click complete when done, name and download the manifest, and send to CIA/IT'}
          {ignoredWindowCount > 0 && (
            <div>
              Only the first {MAX_IMAGES} windows are stitched; {ignoredWindowCount} more ignored.
            </div>
          )}
        </Typography>

        <Table size="small" aria-label="Matched points" sx={{ '& .MuiTableCell-root': { px: 1, whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              {letters.map((letter) => (
                <TableCell key={letter}>{letter} (x, y)</TableCell>
              ))}
              <TableCell align="right">Error</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={row.id}
                hover
                selected={row.id === activeRowId}
                onClick={() => setActiveRow(row.id)}
                sx={{ cursor: 'pointer', opacity: isMatched(row) ? 1 : 0.6 }}
              >
                <TableCell sx={{ borderLeft: `4px solid ${rowColor(index)}` }}>{index + 1}</TableCell>
                {letters.map((letter, i) => (
                  <TableCell key={letter}>{formatPoint(row.points[i])}</TableCell>
                ))}
                <TableCell align="right">
                  {result.rowErrors[index] === undefined ? '' : `${result.rowErrors[index].toFixed(1)} px`}
                </TableCell>
                <TableCell padding="none">
                  <IconButton
                    size="small"
                    aria-label={`Delete row ${index + 1}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteRow(row.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={count + 3}>No points yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Typography variant="body2" component="div" sx={{ my: 2 }}>
          {letters.slice(1).map((letter, i) => (
            <div key={letter}>
              <strong>{letter}:</strong> {fitStatus(i + 1)}
            </div>
          ))}
          {result.rms !== undefined && <div>RMS error {result.rms.toFixed(1)} px</div>}
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
          <Button variant="outlined" onClick={clearRows} disabled={rows.length === 0}>
            Clear
          </Button>
          <Button variant="contained" onClick={complete} disabled={!result.complete}>
            Complete
          </Button>
        </Box>
      </Paper>

      <SaveManifestDialog manifest={pending} onClose={closeDialog} onSaved={onSaved} />
    </Box>
  );
}

StitchingPanel.propTypes = {
  activeRowId: PropTypes.number,
  addWindow: PropTypes.func.isRequired,
  clearRows: PropTypes.func.isRequired,
  deleteRow: PropTypes.func.isRequired,
  ignoredWindowCount: PropTypes.number,
  images: PropTypes.arrayOf(
    PropTypes.shape({ canvas: PropTypes.object, label: PropTypes.string, windowId: PropTypes.string.isRequired }),
  ),
  rows: PropTypes.arrayOf(PropTypes.object),
  setActiveRow: PropTypes.func.isRequired,
  setImages: PropTypes.func.isRequired,
  stitchingImages: PropTypes.arrayOf(PropTypes.object).isRequired,
  TargetComponent: PropTypes.elementType.isRequired,
  targetProps: PropTypes.object,
};
