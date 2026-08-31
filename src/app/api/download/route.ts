import { NextRequest, NextResponse } from 'next/server';
import { getShootByPasscodeAsync } from '@/lib/shoots';
import path from 'path';
import fs from 'fs';
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

    // MODE 1: Single image direct download
    if (file) {
      const targetImage = shoot.images.find(
        (img) => img.filename.toLowerCase() === file.toLowerCase()
      );

      if (!targetImage) {
        return new NextResponse('File not found in gallery', { status: 404 });
      }

      const localPath = path.join(process.cwd(), 'public', 'shoots', shoot.slug, targetImage.filename);
      if (fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath);
        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename="${targetImage.filename}"`,
          },
        });
      }

      let fetchUrl = targetImage.src;
      if (fetchUrl.startsWith('/')) {
        fetchUrl = `https://raw.githubusercontent.com/realkofidjan/bynk/main/public/shoots/${shoot.slug}/${encodeURIComponent(targetImage.filename)}`;
      }

      const imgRes = await fetch(fetchUrl, { cache: 'no-store' });
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        return new NextResponse(arrayBuf, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename="${targetImage.filename}"`,
          },
        });
      }

      return new NextResponse('Image source unavailable', { status: 404 });
    }

    // MODE 2: Full shoot ZIP download
    const zip = new JSZip();
    const localDir = path.join(process.cwd(), 'public', 'shoots', shoot.slug);

    await Promise.all(
      shoot.images.map(async (image) => {
        const localFilePath = path.join(localDir, image.filename);
        if (fs.existsSync(localFilePath)) {
          try {
            const buf = fs.readFileSync(localFilePath);
            zip.file(image.filename, buf);
            return;
          } catch {}
        }

        try {
          let fetchUrl = image.src;
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

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 5 },
    });

    const zipName = `${shoot.clientInfo.replace(/[^a-zA-Z0-9_-]/g, '_')}_Gallery.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error in /api/download:', error);
    return new NextResponse('Internal Server Error: ' + error?.message, { status: 500 });
  }
}
