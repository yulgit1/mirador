import { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import OpenSeadragon from 'openseadragon';
import { imageLetter, MAX_IMAGES } from './reducer';

const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45'];

/** The colour used for a row's pins and table row */
export const rowColor = (index) => PALETTE[index % PALETTE.length];

/** Round to one decimal place of an image pixel */
const round = ({ x, y }) => ({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });

/** Converts between OSD world coordinates and pixels of the canvas's first image */
function imageTransform(canvasWorld) {
  const canvas = canvasWorld?.canvases[0];
  const image = canvas?.imageResources[0];
  if (!image) return undefined;

  const [bx, by, bw, bh] = canvasWorld.contentResourceToWorldCoordinates(image);
  const width = image.getWidth() || canvas.getWidth();
  const height = image.getHeight() || canvas.getHeight();

  return {
    toImage: ({ x, y }) => round({ x: ((x - bx) * width) / bw, y: ((y - by) * height) / bh }),
    toWorld: ({ x, y }) => new OpenSeadragon.Point(bx + (x * bw) / width, by + (y * bh) / height),
  };
}

/** Whether a row has a point on at least two images */
export const isMatched = (row) => row.points.filter(Boolean).length > 1;

/** A numbered pin element for an OSD overlay */
function createPin(row, index, active) {
  const matched = isMatched(row);
  const element = document.createElement('div');
  element.dataset.stitchPin = row.id;
  element.textContent = index + 1;
  element.title = `Point ${index + 1}${matched ? '' : ' (unmatched)'}`;
  // OSD sets display: block on overlays, so centre the number with line-height
  Object.assign(element.style, {
    background: rowColor(index),
    border: matched ? '2px solid #fff' : '2px dashed #fff',
    borderRadius: '50%',
    boxShadow: active ? '0 0 0 2px #000, 0 0 0 4px #ff0' : '0 0 0 1px rgba(0,0,0,0.6)',
    boxSizing: 'border-box',
    color: '#fff',
    cursor: 'move',
    font: 'bold 12px/18px sans-serif',
    height: '22px',
    textAlign: 'center',
    width: '22px',
  });
  return element;
}

/** A badge with the image's letter for the corner of its window */
function createBadge(imageIndex) {
  const element = document.createElement('div');
  element.textContent = `Image ${imageLetter(imageIndex)}${imageIndex === 0 ? ' (reference)' : ''}`;
  Object.assign(element.style, {
    background: 'rgba(0,0,0,0.7)',
    borderRadius: '4px',
    color: '#fff',
    font: 'bold 13px/20px sans-serif',
    left: '8px',
    padding: '2px 8px',
    pointerEvents: 'none',
    position: 'absolute',
    top: '8px',
    zIndex: 1,
  });
  return element;
}

/**
 * Adds point pinning to a window's OpenSeadragon viewer: click to add a point,
 * drag a pin to move it.
 */
export function StitchingMarkers({
  activeRowId = null,
  addPoint,
  canvasWorld = null,
  imageIndex = undefined,
  movePoint,
  rows = [],
  viewer = null,
}) {
  const transform = useMemo(() => imageTransform(canvasWorld), [canvasWorld]);
  const draggingPin = useRef(false);
  const latest = useRef({});
  latest.current = { addPoint, movePoint, transform };

  useEffect(() => {
    if (!viewer || imageIndex === undefined) return undefined;

    const onClick = (event) => {
      if (!event.quick || event.originalEvent?.target?.closest?.('[data-stitch-pin]')) return;
      const { addPoint: add, transform: t } = latest.current;
      if (!t) return;

      // place a point instead of zooming in
      // eslint-disable-next-line no-param-reassign
      event.preventDefaultAction = true;
      add(imageIndex, t.toImage(viewer.viewport.pointFromPixel(event.position)));
    };
    const onDrag = (event) => {
      // eslint-disable-next-line no-param-reassign
      if (draggingPin.current) event.preventDefaultAction = true;
    };

    viewer.addHandler('canvas-click', onClick);
    viewer.addHandler('canvas-drag', onDrag);
    return () => {
      viewer.removeHandler('canvas-click', onClick);
      viewer.removeHandler('canvas-drag', onDrag);
    };
  }, [viewer, imageIndex]);

  useEffect(() => {
    if (!viewer?.container || imageIndex === undefined) return undefined;

    const badge = createBadge(imageIndex);
    viewer.container.appendChild(badge);
    return () => badge.remove();
  }, [viewer, imageIndex]);

  useEffect(() => {
    if (!viewer || imageIndex === undefined || !transform) return undefined;

    const pins = rows
      .map((row, index) => {
        if (!row.points[imageIndex]) return undefined;

        const element = createPin(row, index, row.id === activeRowId);
        viewer.addOverlay({ element, location: transform.toWorld(row.points[imageIndex]), placement: OpenSeadragon.Placement.CENTER });

        const tracker = new OpenSeadragon.MouseTracker({
          dragEndHandler: () => {
            const overlay = viewer.getOverlayById(element);
            if (overlay) latest.current.movePoint(row.id, imageIndex, transform.toImage(overlay.location));
          },
          dragHandler: (event) => {
            const overlay = viewer.getOverlayById(element);
            if (!overlay) return;
            overlay.update(overlay.location.plus(viewer.viewport.deltaPointsFromPixels(event.delta)));
            viewer.forceRedraw();
          },
          element,
          pressHandler: () => {
            draggingPin.current = true;
          },
          releaseHandler: () => {
            draggingPin.current = false;
          },
        });

        return { element, tracker };
      })
      .filter(Boolean);

    return () => {
      pins.forEach(({ element, tracker }) => {
        tracker.destroy();
        viewer.removeOverlay(element);
      });
    };
  }, [viewer, imageIndex, transform, rows, activeRowId]);

  return null;
}

StitchingMarkers.propTypes = {
  activeRowId: PropTypes.number,
  addPoint: PropTypes.func.isRequired,
  canvasWorld: PropTypes.object,
  imageIndex: PropTypes.oneOf([...Array(MAX_IMAGES).keys()]),
  movePoint: PropTypes.func.isRequired,
  rows: PropTypes.arrayOf(PropTypes.object),
  viewer: PropTypes.object,
};
