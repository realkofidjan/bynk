import { NextResponse } from 'next/server';
import { getShootByPasscode } from '@/lib/shoots';
import path from 'path';
import { ZipArchive } from 'archiver';
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return new NextResponse('Missing code parameter', { status: 400 });
    }

    const shoot = getShootByPasscode(code);

    if (!shoot) {
      return new NextResponse('Invalid passcode', { status: 401 });
    }

    const shootsDir = path.join(process.cwd(), 'public', 'shoots', shoot.slug);
    const zipName = `${shoot.clientInfo.replace(/[^a-zA-Z0-9]/g, '_')}_Gallery.zip`;

    // Create a new archiver instance
    const archive = new ZipArchive({
      zlib: { level: 5 } // Sets the compression level.
    });

    // Create a TransformStream to stream the zip data to the client
    const { readable, writable } = new TransformStream();
    
    const writer = writable.getWriter();
    
    // Listen for all archive data and write it to the stream
    archive.on('data', (chunk: any) => {
      writer.write(chunk);
    });

    archive.on('end', () => {
      writer.close();
    });

    archive.on('error', (err: any) => {
      writer.abort(err);
    });

    // Append files
    shoot.images.forEach(image => {
      const filePath = path.join(shootsDir, image.filename);
      archive.file(filePath, { name: image.filename });
    });

    // Finalize the archive (this will trigger the end event)
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
