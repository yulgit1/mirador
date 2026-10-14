import { act, render, waitFor } from '@tests/utils/test-utils';
import TileSource from '../../../src/components/OpenSeadragonTileSource';
import OpenSeadragonViewerContext from '../../../src/contexts/OpenSeadragonViewerContext';
import FailedImageProvider from '../../../src/contexts/FailedImageProvider';
import FailedImageContext from '../../../src/contexts/FailedImageContext';

describe('OpenSeadragonTileSource', () => {
  it('calls addTiledImage with the tile source', () => {
    const viewer = {
      addTiledImage: vi.fn(),
    };
    const ref = { current: viewer };
    const tileSource = { '@id': 'http://example.com/image/info.json' };

    render(
      <FailedImageProvider>
        <OpenSeadragonViewerContext.Provider value={ref}>
          <TileSource tileSource={tileSource} />
        </OpenSeadragonViewerContext.Provider>
      </FailedImageProvider>,
    );

    expect(viewer.addTiledImage).toHaveBeenCalledWith(expect.objectContaining({ tileSource }));
  });

  it('updates the opacity when the prop changes', async () => {
    const mockOsdItem = { setOpacity: vi.fn() };
    const viewer = {
      addTiledImage: vi.fn().mockImplementation(({ success }) => {
        success({ item: mockOsdItem });
      }),
      world: {
        removeItem: vi.fn(),
      },
    };
    const ref = { current: viewer };
    const tileSource = { '@id': 'http://example.com/image/info.json' };

    const { rerender } = render(
      <FailedImageProvider>
        <OpenSeadragonViewerContext.Provider value={ref}>
          <TileSource tileSource={tileSource} />
        </OpenSeadragonViewerContext.Provider>
      </FailedImageProvider>,
    );
    await act(async () => {
      rerender(
        <FailedImageProvider>
          <OpenSeadragonViewerContext.Provider value={ref}>
            <TileSource tileSource={tileSource} opacity={0.5} />
          </OpenSeadragonViewerContext.Provider>
        </FailedImageProvider>,
      );
    });

    expect(viewer.addTiledImage).toHaveBeenCalledTimes(1);
    expect(mockOsdItem.setOpacity).toHaveBeenCalledWith(0.5);
  });

  it('updates the index when the prop changes', async () => {
    const mockOsdItem = vi.fn();
    const viewer = {
      addTiledImage: vi.fn().mockImplementation(({ success }) => {
        success({ item: mockOsdItem });
      }),
      world: {
        removeItem: vi.fn(),
        setItemIndex: vi.fn(),
      },
    };

    const ref = { current: viewer };
    const tileSource = { '@id': 'http://example.com/image/info.json' };

    const { rerender } = render(
      <FailedImageProvider>
        <OpenSeadragonViewerContext.Provider value={ref}>
          <TileSource tileSource={tileSource} />
        </OpenSeadragonViewerContext.Provider>
      </FailedImageProvider>,
    );
    await act(async () => {
      rerender(
        <FailedImageProvider>
          <OpenSeadragonViewerContext.Provider value={ref}>
            <TileSource tileSource={tileSource} index={5} />
          </OpenSeadragonViewerContext.Provider>
        </FailedImageProvider>,
      );
    });

    expect(viewer.addTiledImage).toHaveBeenCalledTimes(1);
    expect(viewer.world.setItemIndex).toHaveBeenCalledWith(mockOsdItem, 5);
  });

  it('updates the rendered bounds when the prop changes', async () => {
    const mockOsdItem = { fitBounds: vi.fn() };
    const viewer = {
      addTiledImage: vi.fn().mockImplementation(({ success }) => {
        success({ item: mockOsdItem });
      }),
      world: {
        removeItem: vi.fn(),
        setItemIndex: vi.fn(),
      },
    };

    const ref = { current: viewer };
    const tileSource = { '@id': 'http://example.com/image/info.json' };

    const { rerender } = render(
      <FailedImageProvider>
        <OpenSeadragonViewerContext.Provider value={ref}>
          <TileSource tileSource={tileSource} />
        </OpenSeadragonViewerContext.Provider>
      </FailedImageProvider>,
    );
    await act(async () => {
      rerender(
        <FailedImageProvider>
          <OpenSeadragonViewerContext.Provider value={ref}>
            <TileSource tileSource={tileSource} fitBounds={[0, 0, 10, 10]} />
          </OpenSeadragonViewerContext.Provider>
        </FailedImageProvider>,
      );
    });

    expect(viewer.addTiledImage).toHaveBeenCalledTimes(1);
    expect(mockOsdItem.fitBounds).toHaveBeenCalled();
  });

  it('deletes the item from the world when the item is unmounted', async () => {
    const mockOsdItem = vi.fn();
    const viewer = {
      addTiledImage: ({ success }) => {
        success({ item: mockOsdItem });
      },
      world: {
        removeItem: vi.fn(),
      },
    };
    const ref = { current: viewer };
    const tileSource = { '@id': 'http://example.com/image/info.json' };

    const { rerender } = render(
      <FailedImageProvider>
        <OpenSeadragonViewerContext.Provider value={ref}>
          <TileSource tileSource={tileSource} />
        </OpenSeadragonViewerContext.Provider>
      </FailedImageProvider>,
    );

    await act(async () => {
      rerender(
        <FailedImageProvider>
          <OpenSeadragonViewerContext.Provider value={ref} />
        </FailedImageProvider>,
      );
    });

    // Assert removeItem was called
    expect(viewer.world.removeItem).toHaveBeenCalledWith(mockOsdItem);
  });

  it('loads fallback image when tile load fails', async () => {
    const addTiledImage = vi
      .fn()
      .mockImplementationOnce(({ error }) => error(new Error('fail')))
      .mockImplementationOnce(({ success }) => success({ item: { id: 'fallback' } }));

    const viewer = {
      addTiledImage,
      world: { removeItem: vi.fn() },
    };
    const ref = { current: viewer };
    const tileSource = { '@id': 'http://example.com/image/info.json' };

    render(
      <FailedImageProvider>
        <OpenSeadragonViewerContext.Provider value={ref}>
          <TileSource tileSource={tileSource} />
        </OpenSeadragonViewerContext.Provider>
      </FailedImageProvider>,
    );

    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {});

    // Should attempt to load original, then fallback
    expect(addTiledImage).toHaveBeenCalledTimes(2);
    expect(addTiledImage.mock.calls[1][0].tileSource.type).toBe('image');
  });
  it('clips the tiled image to the given region', async () => {
    const mockOsdItem = { fitBounds: vi.fn(), setClip: vi.fn() };
    const viewer = {
      addTiledImage: vi.fn().mockImplementation(({ success }) => {
        success({ item: mockOsdItem });
      }),
      world: {
        removeItem: vi.fn(),
      },
    };
    const ref = { current: viewer };
    const tileSource = { '@id': 'http://example.com/image/info.json' };

    const { rerender } = render(
      <FailedImageProvider>
        <OpenSeadragonViewerContext.Provider value={ref}>
          <TileSource tileSource={tileSource} clip={[1, 2, 3, 4]} />
        </OpenSeadragonViewerContext.Provider>
      </FailedImageProvider>,
    );
    // the clip is set when the image is added, so OSD fits the clipped region into the bounds
    expect(viewer.addTiledImage).toHaveBeenCalledWith(
      expect.objectContaining({ clip: expect.objectContaining({ height: 4, width: 3, x: 1, y: 2 }) }),
    );
    await waitFor(() => expect(viewer.addTiledImage).toHaveBeenCalledTimes(1));

    await act(async () => {
      rerender(
        <FailedImageProvider>
          <OpenSeadragonViewerContext.Provider value={ref}>
            <TileSource tileSource={tileSource} clip={[5, 6, 7, 8]} fitBounds={[0, 0, 10, 10]} />
          </OpenSeadragonViewerContext.Provider>
        </FailedImageProvider>,
      );
    });

    expect(mockOsdItem.setClip).toHaveBeenLastCalledWith(expect.objectContaining({ height: 8, width: 7, x: 5, y: 6 }));
    // and the image is refitted after the clip changes
    expect(mockOsdItem.setClip.mock.invocationCallOrder[0]).toBeLessThan(mockOsdItem.fitBounds.mock.invocationCallOrder[0]);
  });
});
