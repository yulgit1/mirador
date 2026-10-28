import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SAVE_ENDPOINT, UPLOAD_ENDPOINT, UPLOAD_URL } from '../../../demo/stitching/manifestFileName';

const manifest = { id: 'urn:test:stitched', type: 'Manifest' };

/**
 * Renders the dialog as the dev server (DEV true) or a deployed build (DEV false) sees it.
 * CAN_SAVE is read when the module loads, so it is imported fresh for each mode.
 */
async function renderDialog({ dev }) {
  vi.stubEnv('DEV', dev);
  vi.resetModules();
  const { SaveManifestDialog } = await import('../../../demo/stitching/SaveManifestDialog');
  const onSaved = vi.fn();
  render(<SaveManifestDialog manifest={manifest} onClose={vi.fn()} onSaved={onSaved} />);
  return { onSaved, user: userEvent.setup() };
}

/** The JSON body of the nth fetch call */
const requestBody = (n) => JSON.parse(fetch.mock.calls[n][1].body);

/** A JSON response */
const respond = (status, body = {}) => new Response(JSON.stringify(body), { status });

// the dialog fetches same-origin paths, which the shared fetch mock rejects as invalid URLs
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('SaveManifestDialog on the dev server', () => {
  it('saves to demo/manifests and offers to overwrite an existing file', async () => {
    fetch.mockResolvedValueOnce(respond(409)).mockResolvedValueOnce(respond(201));
    const { onSaved, user } = await renderDialog({ dev: true });

    expect(screen.queryByRole('button', { name: 'Upload to S3' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('stitched-manifest.json already exists. Overwrite it?')).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toEqual(`${SAVE_ENDPOINT}?name=stitched-manifest.json`);

    await user.click(screen.getByRole('button', { name: 'Overwrite' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetch.mock.calls[1][0]).toEqual(`${SAVE_ENDPOINT}?name=stitched-manifest.json&overwrite=1`);
    const url = `${window.location.origin}/demo/manifests/stitched-manifest.json`;
    expect(onSaved).toHaveBeenCalledWith({
      action: 'save',
      fileName: 'stitched-manifest.json',
      manifest: { ...manifest, id: url },
      url,
    });
  });
});

describe('SaveManifestDialog when deployed', () => {
  it('asks for the password before uploading', async () => {
    const { onSaved, user } = await renderDialog({ dev: false });

    await user.click(screen.getByRole('button', { name: 'Upload to S3' }));
    expect(screen.getByText('Enter the upload password')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows a wrong password on the password field', async () => {
    fetch.mockResolvedValueOnce(respond(401, { error: 'Wrong password' }));
    const { onSaved, user } = await renderDialog({ dev: false });

    await user.type(screen.getByLabelText('Upload password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Upload to S3' }));
    expect(await screen.findByText('Wrong password')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('uploads with the password, overwriting an existing file when asked', async () => {
    const url = `${UPLOAD_URL}abbey.json`;
    fetch.mockResolvedValueOnce(respond(409)).mockResolvedValueOnce(respond(201, { manifest: { ...manifest, id: url }, url }));
    const { onSaved, user } = await renderDialog({ dev: false });

    await user.clear(screen.getByLabelText('File name'));
    await user.type(screen.getByLabelText('File name'), 'abbey');
    await user.type(screen.getByLabelText('Upload password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Upload to S3' }));
    expect(await screen.findByText('abbey.json already exists. Overwrite it?')).toBeInTheDocument();
    expect(fetch.mock.calls[0][0]).toEqual(UPLOAD_ENDPOINT);
    expect(requestBody(0)).toEqual({ manifest, name: 'abbey.json', overwrite: false, password: 'secret' });

    await user.click(screen.getByRole('button', { name: 'Overwrite' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(requestBody(1)).toEqual({ manifest, name: 'abbey.json', overwrite: true, password: 'secret' });
    expect(onSaved).toHaveBeenCalledWith({
      action: 'upload',
      fileName: 'abbey.json',
      manifest: { ...manifest, id: url },
      url,
    });
  });

  it('downloads without a password', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const { onSaved, user } = await renderDialog({ dev: false });

    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(fetch).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith({
      action: 'download',
      fileName: 'stitched-manifest.json',
      manifest,
      url: manifest.id,
    });
  });
});
