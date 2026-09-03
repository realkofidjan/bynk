import { NextRequest, NextResponse } from 'next/server';
import { getShootByPasscodeAsync } from '@/lib/shoots';
import { getDownloadUrl } from '@/lib/cloudinary';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get('code') || '').trim();
    const file = searchParams.get('file');

    if (!code) {
      return new NextResponse('Missing passcode parameter', { status: 400 });
    }

    const shoot = await getShootByPasscodeAsync(code);

    if (!shoot) {
      return new NextResponse('Invalid passcode', { status: 401 });
    }

    /* ────────────────────────────────────────
       MODE 1: Single image download
       ──────────────────────────────────────── */
    if (file) {
      const targetImage = shoot.images.find(
        (img) => img.filename.toLowerCase() === file.toLowerCase()
      );

      if (!targetImage) {
        return new NextResponse('File not found in gallery', { status: 404 });
      }

      // Prefer original (full-res) if available, fall back to gallery quality
      const downloadSource = (!targetImage.originalDeleted && targetImage.originalUrl)
        ? targetImage.originalUrl
        : targetImage.src;

      // If it's a Cloudinary URL, redirect with fl_attachment for direct CDN download
      if (downloadSource.includes('res.cloudinary.com')) {
        const redirectUrl = getDownloadUrl(downloadSource, targetImage.filename);
        return NextResponse.redirect(redirectUrl, 302);
      }

      // Legacy: fetch from GitHub/local and serve directly
      const fetchUrl = downloadSource.startsWith('/')
        ? `https://raw.githubusercontent.com/realkofidjan/bynk/main/public/shoots/${shoot.slug}/${encodeURIComponent(targetImage.filename)}`
        : downloadSource;

      const imgRes = await fetch(fetchUrl, { cache: 'no-store' });
      if (!imgRes.ok) {
        return new NextResponse('Image source unavailable', { status: 404 });
      }

      const contentType = imgRes.headers.get('content-type') || getMimeType(targetImage.filename);
      const arrayBuf = await imgRes.arrayBuffer();
      return new NextResponse(arrayBuf, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${targetImage.filename}"`,
        },
      });
    }

    /* ────────────────────────────────────────
       MODE 2: Full shoot ZIP download
       ──────────────────────────────────────── */
    const zip = new JSZip();
    const isCloudinaryBacked = shoot.images.some((img) =>
      img.src?.includes('res.cloudinary.com') || img.originalUrl?.includes('res.cloudinary.com')
    );

    await Promise.all(
      shoot.images.map(async (image) => {
        try {
          // Pick best available source
          let fetchUrl: string;

          if (!image.originalDeleted && image.originalUrl) {
            fetchUrl = image.originalUrl;
          } else if (image.src) {
            fetchUrl = image.src;
          } else {
            return;
          }

          // For Cloudinary URLs, remove any f_auto,q_auto transforms to get the stored version
          if (fetchUrl.includes('res.cloudinary.com')) {
            fetchUrl = fetchUrl.replace('/f_auto,q_auto/', '/');
          }

          // Legacy: resolve relative URLs
          if (fetchUrl.startsWith('/')) {
            fetchUrl = `https://raw.githubusercontent.com/realkofidjan/bynk/main/public/shoots/${shoot.slug}/${encodeURIComponent(image.filename)}`;
          }

          const res = await fetch(fetchUrl, { cache: 'no-store' });
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            zip.file(image.filename, arrayBuffer);
          }
        } catch (err) {
          console.warn(`Failed to fetch photo ${image.filename} for zip:`, err);
        }
      })
    );

    const quality = isCloudinaryBacked && shoot.downloadsAvailable === false ? 'gallery' : 'original';
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 5 },
    });

    const zipName = `${shoot.clientInfo.replace(/[^a-zA-Z0-9_-]/g, '_')}_Gallery${quality === 'gallery' ? '_web' : ''}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error in /api/download:', error);
    return new NextResponse('Internal Server Error: ' + String(error), { status: 500 });
  }
}

/** Determine MIME type from filename extension */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
  };
  return mimeMap[ext] || 'application/octet-stream';
}
