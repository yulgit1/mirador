import { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import OpenSeadragon from 'openseadragon';
import { sideOfWindow } from './reducer';

const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45'];

/** The colour used for a pair's pins and table row */
export const pairColor = (index) => PALETTE[index % PALETTE.length];

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

/** A numbered pin element for an OSD overlay */
function createPin(pair, index) {
  const element = document.createElement('div');
  element.dataset.stitchPin = pair.id;
  element.textContent = index + 1;
  element.title = `Point ${index + 1}${pair.left && pair.right ? '' : ' (unmatched)'}`;
  // OSD sets display: block on overlays, so centre the number with line-height
  Object.assign(element.style, {
    background: pairColor(index),
    border: pair.left && pair.right ? '2px solid #fff' : '2px dashed #fff',
    borderRadius: '50%',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
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

/**
 * Adds point pinning to a window's OpenSeadragon viewer: click to add a point,
 * drag a pin to move it.
 */
export function StitchingMarkers({ addPoint, canvasWorld = null, movePoint, pairs = [], viewer = null, windowId }) {
  const side = sideOfWindow(windowId);
  const transform = useMemo(() => imageTransform(canvasWorld), [canvasWorld]);
  const draggingPin = useRef(false);
  const latest = useRef({});
  latest.current = { addPoint, movePoint, transform };

  useEffect(() => {
    if (!viewer || !side) return undefined;

    const onClick = (event) => {
      if (!event.quick || event.originalEvent?.target?.closest?.('[data-stitch-pin]')) return;
      const { addPoint: add, transform: t } = latest.current;
      if (!t) return;

      // place a point instead of zooming in
      // eslint-disable-next-line no-param-reassign
      event.preventDefaultAction = true;
      add(side, t.toImage(viewer.viewport.pointFromPixel(event.position)));
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
  }, [viewer, side]);

  useEffect(() => {
    if (!viewer || !side || !transform) return undefined;

    const pins = pairs
      .map((pair, index) => {
        if (!pair[side]) return undefined;

        const element = createPin(pair, index);
        viewer.addOverlay({ element, location: transform.toWorld(pair[side]), placement: OpenSeadragon.Placement.CENTER });

        const tracker = new OpenSeadragon.MouseTracker({
          dragEndHandler: () => {
            const overlay = viewer.getOverlayById(element);
            if (overlay) latest.current.movePoint(pair.id, side, transform.toImage(overlay.location));
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
  }, [viewer, side, transform, pairs]);

  return null;
}

StitchingMarkers.propTypes = {
  addPoint: PropTypes.func.isRequired,
  canvasWorld: PropTypes.object,
  movePoint: PropTypes.func.isRequired,
  pairs: PropTypes.arrayOf(PropTypes.object),
  viewer: PropTypes.object,
  windowId: PropTypes.string.isRequired,
};
