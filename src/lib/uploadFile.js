// Turns an expo-image-picker asset into the value that goes into FormData.
//
// The two platforms need different things and neither fails loudly:
//   phone   — React Native's FormData understands {uri, name, type} and reads
//             the file off disk itself.
//   browser — there is no such convention. Appending that object sends the
//             literal string "[object Object]", so the server stores a
//             15-byte "photo" and the person sees a broken picture with no
//             error to explain it. The web picker already hands us a real
//             File; that is what must be sent.
//
// The size check is here rather than left to the server for two reasons: the
// web build gets no `quality: 0.7` compression, so full-size camera photos
// arrive intact; and a rejection after a slow upload on a phone connection is
// the worst moment to learn the photo was too big.
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

/** Spring's `max-file-size: 5MB` (ToWin/backend/.../application.yml). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const TOO_LARGE = 'That photo is bigger than 5 MB. Please choose a smaller one.';
const NO_FILE = 'That photo could not be read. Please choose it again.';

/**
 * @param {object} asset an expo-image-picker asset
 * @returns {{file: any, error?: undefined} | {file?: undefined, error: string}}
 *   the value to append to FormData, or a plain-words reason not to.
 */
export function buildUpload(asset) {
  if (!asset) return { error: NO_FILE };

  if (isWeb) {
    const file = asset.file;
    // No File means the browser could not read the pick — refuse rather than
    // upload a placeholder that fails in a way nobody can explain.
    if (!file) return { error: NO_FILE };
    if (file.size > MAX_UPLOAD_BYTES) return { error: TOO_LARGE };
    return { file };
  }

  // `fileSize` is optional on native; when the picker doesn't report it we let
  // the upload go and leave the server with the last word.
  if (asset.fileSize > MAX_UPLOAD_BYTES) return { error: TOO_LARGE };
  return {
    file: {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    },
  };
}
