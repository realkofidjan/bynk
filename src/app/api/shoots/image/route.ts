import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REPO_OWNER = 'realkofidjan';
const REPO_NAME = 'bynk';
const REPO_BRANCH = 'main';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const file = searchParams.get('file');

    if (!slug || !file) {
      return new NextResponse('Missing slug or file parameter', { status: 400 });
    }

    const sanitizedSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedFile = file.replace(/[^a-zA-Z0-9_.-]/g, '');

    // 1. Try local disk first
    const localPath = path.join(process.cwd(), 'public', 'shoots', sanitizedSlug, sanitizedFile);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. Fetch from GitHub Raw
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public/shoots/${encodeURIComponent(sanitizedSlug)}/${encodeURIComponent(sanitizedFile)}`;
    const imgRes = await fetch(rawUrl, { cache: 'no-store' });

    if (imgRes.ok) {
      const arrayBuf = await imgRes.arrayBuffer();
      return new NextResponse(arrayBuf, {
        headers: {
          'Content-Type': imgRes.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse('Image not found', { status: 404 });
  } catch (err: any) {
    return new NextResponse('Internal error: ' + err?.message, { status: 500 });
  }
}
