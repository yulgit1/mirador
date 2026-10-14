import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
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

/** Image body JSON, label and pixel size of the image showing on one side */
function sideImage(canvas, label) {
  const image = canvas && new MiradorCanvas(canvas).imageResources[0];
  if (!image) return undefined;

  const width = image.getWidth() || canvas.getWidth();
  const height = image.getHeight() || canvas.getHeight();
  return { height, image: { ...image.__jsonld, height, width }, label: label || canvas.id, width };
}

/** Saves the manifest as a JSON file */
function download(manifest) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stitched-manifest.json';
  link.click();
  URL.revokeObjectURL(url);
}

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
    download(manifest);
    addWindow({ manifest, manifestId: manifest.id, maximized: true, sideBarOpen: true, sideBarPanel: 'layers' });
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

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={clearPairs} disabled={pairs.length === 0}>
            Clear
          </Button>
          <Button variant="contained" onClick={complete} disabled={!fit}>
            Complete
          </Button>
        </Box>
      </Paper>
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
