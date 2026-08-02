// What gets appended to FormData differs by platform, and getting it wrong is
// invisible until the server rejects the upload: on the web a
// {uri, name, type} object stringifies to "[object Object]" and the backend
// receives a 15-byte "photo".
import { MAX_UPLOAD_BYTES } from '../src/lib/uploadFile';

const loadOn = (os) => {
  let mod;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    mod = require('../src/lib/uploadFile');
  });
  return mod;
};

afterEach(() => jest.dontMock('react-native'));

const fakeFile = (size, name = 'photo.jpg', type = 'image/jpeg') => ({ size, name, type });

describe('on the web', () => {
  let upload;
  beforeEach(() => {
    upload = loadOn('web');
  });

  test('sends the real File the browser picker already provided', () => {
    const file = fakeFile(1024);
    const result = upload.buildUpload({ uri: 'blob:x', file });
    expect(result.file).toBe(file);
    expect(result.error).toBeUndefined();
  });

  test('refuses a photo over the 5 MB the backend accepts', () => {
    const result = upload.buildUpload({ uri: 'blob:x', file: fakeFile(MAX_UPLOAD_BYTES + 1) });
    expect(result.file).toBeUndefined();
    expect(result.error).toMatch(/5 MB/);
  });

  test('accepts a photo of exactly 5 MB — the cap is inclusive', () => {
    const file = fakeFile(MAX_UPLOAD_BYTES);
    expect(upload.buildUpload({ uri: 'blob:x', file }).file).toBe(file);
  });

  test('refuses rather than uploading a placeholder when the browser gave no File', () => {
    // Appending the native {uri, name, type} shape on the web sends the string
    // "[object Object]" — a silent, unexplainable failure for the user.
    const result = upload.buildUpload({ uri: 'blob:x', fileName: 'p.jpg' });
    expect(result.file).toBeUndefined();
    expect(result.error).toBeTruthy();
  });
});

describe('on a phone', () => {
  let upload;
  beforeEach(() => {
    upload = loadOn('ios');
  });

  test('sends the {uri, name, type} shape the native FormData needs', () => {
    const result = upload.buildUpload({
      uri: 'file:///tmp/p.jpg',
      fileName: 'p.jpg',
      mimeType: 'image/png',
      fileSize: 2048,
    });
    expect(result.file).toEqual({ uri: 'file:///tmp/p.jpg', name: 'p.jpg', type: 'image/png' });
  });

  test('falls back to a sensible name and type when the picker omits them', () => {
    const result = upload.buildUpload({ uri: 'file:///tmp/p.jpg' });
    expect(result.file).toEqual({
      uri: 'file:///tmp/p.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });
  });

  test('refuses a photo over 5 MB before spending the upload', () => {
    const result = upload.buildUpload({ uri: 'file:///tmp/p.jpg', fileSize: MAX_UPLOAD_BYTES + 1 });
    expect(result.file).toBeUndefined();
    expect(result.error).toMatch(/5 MB/);
  });

  test('uploads when the picker reports no size — the server still has the last word', () => {
    const result = upload.buildUpload({ uri: 'file:///tmp/p.jpg' });
    expect(result.file).toBeTruthy();
    expect(result.error).toBeUndefined();
  });
});

test('the cap matches the backend (application.yml max-file-size: 5MB)', () => {
  expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
});
