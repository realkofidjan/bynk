import { NextResponse } from 'next/server';
import { getShootByPasscodeAsync } from '@/lib/shoots';
import path from 'path';
import fs from 'fs';
import { ZipArchive } from 'archiver';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return new NextResponse('Missing code parameter', { status: 400 });
    }

    const shoot = await getShootByPasscodeAsync(code.trim());

    if (!shoot) {
      return new NextResponse('Invalid passcode', { status: 401 });
    }

    const zipName = `${shoot.clientInfo.replace(/[^a-zA-Z0-9]/g, '_')}_Gallery.zip`;

    // Create a new archiver instance
    const archive = new ZipArchive({
      zlib: { level: 5 },
    });

    // Create a TransformStream to stream the zip data to the client
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    archive.on('data', (chunk: any) => {
      writer.write(chunk);
    });

    archive.on('end', () => {
      writer.close();
    });

    archive.on('error', (err: any) => {
      writer.abort(err);
    });

    // Append each image (from local disk or fetch from GitHub Raw URL)
    const localDir = path.join(process.cwd(), 'public', 'shoots', shoot.slug);

    for (const image of shoot.images) {
      const localFilePath = path.join(localDir, image.filename);
      if (fs.existsSync(localFilePath)) {
        archive.file(localFilePath, { name: image.filename });
      } else if (image.src.startsWith('http')) {
        try {
          const imgRes = await fetch(image.src);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            archive.append(buffer, { name: image.filename });
          }
        } catch (fetchErr) {
          console.warn(`Could not fetch remote image for zip: ${image.src}`, fetchErr);
        }
      }
    }

    // Finalize the archive
    archive.finalize();

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    });
  } catch (error) {
    console.error('Error generating zip:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
