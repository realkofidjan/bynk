import { NextRequest, NextResponse } from 'next/server';
import { getShootByPasscodeAsync } from '@/lib/shoots';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';

const archiver = require('archiver');

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

    // MODE 1: Single image direct download proxy
    if (file) {
      const targetImage = shoot.images.find(
        (img) => img.filename.toLowerCase() === file.toLowerCase()
      );

      if (!targetImage) {
        return new NextResponse('File not found in gallery', { status: 404 });
      }

      const localDir = path.join(process.cwd(), 'public', 'shoots', shoot.slug);
      const localFilePath = path.join(localDir, targetImage.filename);

      if (fs.existsSync(localFilePath)) {
        const fileBuffer = fs.readFileSync(localFilePath);
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `attachment; filename="${targetImage.filename}"`,
          },
        });
      }

      // Fetch from GitHub Raw
      const imgRes = await fetch(targetImage.src, { cache: 'no-store' });
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
    const zipName = `${shoot.clientInfo.replace(/[^a-zA-Z0-9_-]/g, '_')}_Gallery.zip`;

    const archive = archiver('zip', {
      zlib: { level: 5 },
    });

    const stream = new PassThrough();

    archive.on('error', (err: any) => {
      console.error('Archiver error:', err);
    });

    // Pipe archive to PassThrough stream
    archive.pipe(stream);

    // Fetch and append all photos asynchronously
    (async () => {
      const localDir = path.join(process.cwd(), 'public', 'shoots', shoot.slug);

      for (const image of shoot.images) {
        const localFilePath = path.join(localDir, image.filename);
        if (fs.existsSync(localFilePath)) {
          archive.file(localFilePath, { name: image.filename });
        } else if (image.src.startsWith('http')) {
          try {
            const imgRes = await fetch(image.src, { cache: 'no-store' });
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              archive.append(buffer, { name: image.filename });
            }
          } catch (fetchErr) {
            console.warn(`Could not fetch remote image for zip: ${image.src}`, fetchErr);
          }
        }
      }

      await archive.finalize();
    })().catch((err: any) => console.error('Error finalizing zip archive:', err));

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/download:', error);
    return new NextResponse('Internal Server Error: ' + error?.message, { status: 500 });
  }
}
