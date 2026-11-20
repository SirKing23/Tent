import { Directory, File, Paths } from "expo-file-system";

/**
 * Photos are copied into `<documents>/photos`, which is private to the app:
 * they are never written to the user's gallery and the OS does not purge them
 * like it can with the image-picker cache.
 *
 * The database stores a *relative* path such as `photos/entry-1234-ab12.jpg`
 * (absolute iOS container paths change between app updates) and
 * `resolvePhotoUri()` turns it into a usable `file://` URI for `<Image>`.
 */

const PHOTOS_FOLDER = "photos";

/** Matches any absolute URI scheme (`file:`, `content:`, `data:`, `http:`…). */
const ABSOLUTE_URI = /^[a-z][a-z0-9+.-]*:/i;

const photosDirectory = () => new Directory(Paths.document, PHOTOS_FOLDER);

const toFile = (stored: string): File =>
  ABSOLUTE_URI.test(stored)
    ? new File(stored)
    : new File(Paths.document, ...stored.split("/").filter(Boolean));

const ensurePhotosDirectory = (): Directory => {
  const directory = photosDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
};

/**
 * True when the stored value already points at a file this app owns (a
 * relative path, or an absolute URI inside the app's photos folder).
 */
export function isAppPrivatePhoto(stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (!ABSOLUTE_URI.test(stored)) return true;
  try {
    return stored.startsWith(photosDirectory().uri);
  } catch {
    return false;
  }
}

/**
 * Copies a picked photo (usually a temporary image-picker cache URI) into
 * app-private storage and returns the path to persist in the database.
 * Values that are already app-private are returned unchanged, so this is safe
 * to call on every save.
 */
export async function persistPhoto(
  sourceUri: string | null | undefined,
  prefix = "photo",
): Promise<string | null> {
  if (!sourceUri) return null;
  if (isAppPrivatePhoto(sourceUri)) return sourceUri;

  try {
    const directory = ensurePhotosDirectory();
    const source = new File(sourceUri);
    const extension = source.extension || ".jpg";
    const fileName = `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${extension}`;

    await source.copy(new File(directory, fileName));

    // Stored relative to the document directory, never as an absolute path.
    return `${PHOTOS_FOLDER}/${fileName}`;
  } catch (error) {
    console.error("Unable to save photo to app storage:", error);
    // Fall back to the original URI so the photo is not lost from the record.
    return sourceUri;
  }
}

/** Resolves a stored photo value into a URI usable by `<Image source>`. */
export function resolvePhotoUri(
  stored: string | null | undefined,
): string | null {
  if (!stored) return null;
  if (ABSOLUTE_URI.test(stored)) return stored;
  try {
    return toFile(stored).uri;
  } catch {
    return stored;
  }
}

/**
 * Deletes an app-private photo file. Values pointing outside the app's photos
 * folder (for example legacy image-picker cache URIs) are ignored.
 */
export function deleteStoredPhoto(stored: string | null | undefined): void {
  if (!stored || !isAppPrivatePhoto(stored)) return;
  try {
    const file = toFile(stored);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn("Unable to delete stored photo:", error);
  }
}
