import { v2 as cloudinary } from 'cloudinary';

/* ────────────────────────────────────────
   Cloudinary Configuration
   ──────────────────────────────────────── */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/** Check if all Cloudinary env vars are present */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/* ────────────────────────────────────────
   Upload Helpers
   ──────────────────────────────────────── */

interface UploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/**
 * Upload a buffer to Cloudinary via stream.
 */
function uploadBuffer(
  buffer: Buffer,
  options: { folder: string; publicId: string; transformation?: Record<string, unknown> }
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadOpts: Record<string, unknown> = {
      folder: options.folder,
      public_id: options.publicId,
      resource_type: 'image',
      overwrite: true,
    };
    if (options.transformation) {
      uploadOpts.transformation = options.transformation;
    }

    const stream = cloudinary.uploader.upload_stream(uploadOpts, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Empty Cloudinary response'));
      resolve({
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      });
    });
    stream.end(buffer);
  });
}

/**
 * Upload original full-resolution image.
 * Stored in: bynk/originals/{slug}/{baseName}
 */
export async function uploadOriginal(buffer: Buffer, slug: string, filename: string): Promise<UploadResult> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  return uploadBuffer(buffer, {
    folder: `bynk/originals/${slug}`,
    publicId: baseName,
  });
}

/**
 * Upload gallery-quality copy (1600px max width, quality 80).
 * Stored in: bynk/gallery/{slug}/{baseName}
 */
export async function uploadGalleryImage(buffer: Buffer, slug: string, filename: string): Promise<UploadResult> {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  return uploadBuffer(buffer, {
    folder: `bynk/gallery/${slug}`,
    publicId: baseName,
    transformation: { width: 1600, crop: 'limit', quality: 80 },
  });
}

/* ────────────────────────────────────────
   URL Helpers
   ──────────────────────────────────────── */

/**
 * Build a Cloudinary URL with auto-format and auto-quality for optimal delivery.
 * Takes a stored secure_url and injects f_auto,q_auto transformations.
 */
export function getOptimizedUrl(secureUrl: string): string {
  return secureUrl.replace('/upload/', '/upload/f_auto,q_auto/');
}

/**
 * Build a Cloudinary URL that forces a file download (Content-Disposition: attachment).
 */
export function getDownloadUrl(secureUrl: string, filename: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  return secureUrl.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(baseName)}/`);
}

/* ────────────────────────────────────────
   Deletion Helpers
   ──────────────────────────────────────── */

/** Delete a single Cloudinary asset by public_id */
export async function deleteAsset(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

/**
 * Delete all assets under a folder prefix, then the folder itself.
 * Used when deleting an entire shoot or cleaning up expired originals.
 */
export async function deleteFolder(folderPath: string): Promise<void> {
  try {
    await cloudinary.api.delete_resources_by_prefix(folderPath, { resource_type: 'image' });
  } catch {}
  try {
    await cloudinary.api.delete_folder(folderPath);
  } catch (err: any) {
    if (err?.error?.http_code !== 404 && err?.http_code !== 404) {
      console.warn(`Cloudinary: failed to delete folder ${folderPath}:`, err?.message || err);
    }
  }
}
