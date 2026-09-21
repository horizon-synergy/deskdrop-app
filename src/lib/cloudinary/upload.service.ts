/**
 * upload.service.ts
 * ----------------------------------------------------------------------------
 * Uploads images to Cloudinary using an UNSIGNED upload preset. This is a
 * deliberate security choice for a browser-only (no custom backend) app:
 *
 *   - An unsigned preset lets the client upload directly to Cloudinary
 *     without ever holding Cloudinary's API secret (which must never
 *     reach the browser — see .env.example).
 *   - The preset itself is configured in the Cloudinary console with
 *     restrictions that make this safe: a fixed destination folder,
 *     allowed formats (jpg/png/webp), a max file size, and no
 *     eager/destructive transformations — so even though anyone with the
 *     preset name could technically POST to it, the blast radius of abuse
 *     is bounded to "someone uploads an image to our media library",
 *     which is monitorable/revocable from the Cloudinary dashboard.
 *   - We additionally validate file type and size client-side before
 *     ever making the request, both for UX (instant feedback) and to
 *     avoid wasting upload bandwidth on files that will be rejected.
 *
 * If DeskDrop later needs stricter control (e.g. per-user upload quotas,
 * server-side moderation), swap this for a signed upload minted by a
 * Cloud Function — the call sites in the admin forms wouldn't need to
 * change, only this file.
 */

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class UploadServiceError extends Error {}

function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new UploadServiceError(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and ' +
        'VITE_CLOUDINARY_UPLOAD_PRESET in your .env.local.',
    );
  }
  return { cloudName, uploadPreset };
}

function validateFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new UploadServiceError('Please choose a JPG, PNG, or WEBP image.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadServiceError('Image is too large. Please choose a file under 8 MB.');
  }
}

/**
 * Uploads a single image file and returns its Cloudinary `secure_url`.
 * `folder` scopes where in the Cloudinary media library the asset lands
 * (e.g. "deskdrop/products", "deskdrop/categories"), keeping the library
 * organized as the catalog grows.
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  validateFile(file);
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new UploadServiceError('Image upload failed. Please try again.');
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new UploadServiceError('Image upload failed. Please try again.');
  }
  return data.secure_url;
}

/** Uploads multiple images in parallel, preserving input order in the
 *  result array (Promise.all resolves in the order the promises were
 *  created, not completion order). */
export async function uploadImages(files: File[], folder: string): Promise<string[]> {
  return Promise.all(files.map((file) => uploadImage(file, folder)));
}
