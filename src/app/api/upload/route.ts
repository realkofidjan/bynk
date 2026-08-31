import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getShoots } from '@/lib/shoots';

const execAsync = promisify(exec);

const REPO_OWNER = 'realkofidjan';
const REPO_NAME = 'bynk';
const REPO_BRANCH = 'main';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/* ────────────────────────────────────────
   GET /api/upload — List client galleries and uploaded assets
   ──────────────────────────────────────── */

export async function GET() {
  try {
    // 1. Fetch Client Shoot Galleries
    const clientGalleries = getShoots().map((shoot) => {
      const folderPath = path.join(process.cwd(), 'public', 'shoots', shoot.slug);
      let totalSizeBytes = 0;
      let lastModified = new Date().toISOString();

      if (fs.existsSync(folderPath)) {
        const stats = fs.statSync(folderPath);
        lastModified = stats.mtime.toISOString();
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
          try {
            const fileStat = fs.statSync(path.join(folderPath, file));
            totalSizeBytes += fileStat.size;
          } catch {}
        }
      }

      return {
        ...shoot,
        imageCount: shoot.images.length,
        totalSizeBytes,
        totalSizeMb: (totalSizeBytes / (1024 * 1024)).toFixed(2),
        lastModified,
      };
    });

    // 2. Fetch General Uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const files = fs.readdirSync(uploadDir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'].includes(ext);
    });

    const generalUploads = files
      .map((filename) => {
        const stats = fs.statSync(path.join(uploadDir, filename));
        return {
          filename,
          sizeBytes: stats.size,
          sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
          uploadedAt: stats.mtime.toISOString(),
          localUrl: `/uploads/${filename}`,
          githubRawUrl: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public/uploads/${filename}`,
          githubBlobUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/public/uploads/${filename}`,
        };
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    let currentCommit = 'main';
    try {
      const { stdout } = await execAsync('git rev-parse --short HEAD', { cwd: process.cwd() });
      currentCommit = stdout.trim();
    } catch {}

    return NextResponse.json({
      success: true,
      clientGalleries,
      generalUploads,
      currentCommit,
      repo: `${REPO_OWNER}/${REPO_NAME}`,
      branch: REPO_BRANCH,
    });
  } catch (err: any) {
    console.error('Failed to list uploads:', err);
    return NextResponse.json({ error: 'Failed to list uploaded files', details: err?.message }, { status: 500 });
  }
}

/* ────────────────────────────────────────
   POST /api/upload — Upload Gallery or Files & Sync to GitHub
   ──────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    // Check if raw binary upload (avoids FormData buffer limits completely)
    const rawUploadType = request.headers.get('x-upload-type');

    if (rawUploadType === 'raw_photo') {
      const rawSlug = request.headers.get('x-slug') || '';
      let rawFilename = request.headers.get('x-filename') || '';

      try {
        rawFilename = decodeURIComponent(rawFilename);
      } catch {}

      if (!rawSlug || !rawFilename) {
        return NextResponse.json({ error: 'Missing x-slug or x-filename header' }, { status: 400 });
      }

      const shootDir = path.join(process.cwd(), 'public', 'shoots', rawSlug);
      if (!fs.existsSync(shootDir)) {
        fs.mkdirSync(shootDir, { recursive: true });
      }

      const sanitized = rawFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const targetPath = path.join(shootDir, sanitized);
      const arrayBuffer = await request.arrayBuffer();
      fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));

      return NextResponse.json({
        success: true,
        filename: sanitized,
        sizeBytes: arrayBuffer.byteLength,
        url: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public/shoots/${rawSlug}/${sanitized}`,
      });
    }

    // Standard JSON / FormData Handling
    const formData = await request.formData();
    const uploadType = (formData.get('uploadType') as string) || 'general';

    /* ════════════════════════════════════════
       MODE 1A: INITIALIZE CLIENT GALLERY
       ════════════════════════════════════════ */
    if (uploadType === 'init_gallery') {
      const clientTitle = (formData.get('clientTitle') as string || '').trim();
      let slug = (formData.get('slug') as string || '').trim().toLowerCase();
      let passcode = (formData.get('passcode') as string || '').trim();
      const coverPhotoName = (formData.get('coverPhotoName') as string || '').trim();

      if (!clientTitle) {
        return NextResponse.json({ error: 'Client Shoot Title is required' }, { status: 400 });
      }

      if (!passcode) {
        passcode = Math.floor(100000 + Math.random() * 900000).toString();
      }

      if (!slug) {
        slug = clientTitle
          .replace(/[^a-zA-Z0-9\s-_]/g, '')
          .trim()
          .replace(/\s+/g, '_');
      } else {
        slug = slug.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, '_');
      }

      const shootDir = path.join(process.cwd(), 'public', 'shoots', slug);
      if (!fs.existsSync(shootDir)) {
        fs.mkdirSync(shootDir, { recursive: true });
      }

      const sanitizedCover = coverPhotoName.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const infoContent = `${passcode}\n${clientTitle}\n${sanitizedCover}\n`;
      fs.writeFileSync(path.join(shootDir, 'info.txt'), infoContent, 'utf-8');

      return NextResponse.json({
        success: true,
        slug,
        clientTitle,
        passcode,
        coverPhotoName: sanitizedCover,
      });
    }

    /* ════════════════════════════════════════
       MODE 1B: FINALIZE GALLERY & PUSH TO GITHUB
       ════════════════════════════════════════ */
    if (uploadType === 'finalize_gallery') {
      const slug = (formData.get('slug') as string || '').trim();
      const clientTitle = (formData.get('clientTitle') as string || '').trim();
      const passcode = (formData.get('passcode') as string || '').trim();
      const coverPhotoName = (formData.get('coverPhotoName') as string || '').trim();

      if (!slug) {
        return NextResponse.json({ error: 'Slug required' }, { status: 400 });
      }

      const shootDir = path.join(process.cwd(), 'public', 'shoots', slug);
      if (!fs.existsSync(shootDir)) {
        return NextResponse.json({ error: 'Gallery folder not found' }, { status: 404 });
      }

      // Check image files in folder
      const allFiles = fs.readdirSync(shootDir).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext);
      });

      if (allFiles.length === 0) {
        return NextResponse.json(
          { error: 'No photos were found in gallery folder to commit' },
          { status: 400 }
        );
      }

      const effectiveCover = coverPhotoName || allFiles[0];
      const infoContent = `${passcode}\n${clientTitle}\n${effectiveCover}\n`;
      fs.writeFileSync(path.join(shootDir, 'info.txt'), infoContent, 'utf-8');

      // Commit and Push to GitHub repository
      const commitMessage = `feat(gallery): add/update client gallery "${clientTitle}" (${slug}) with passcode [${passcode}]`;

      try {
        await execAsync(`git add -A "public/shoots/${slug}"`, { cwd: process.cwd() });
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: process.cwd() });
        await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
      } catch (gitErr: any) {
        console.error('Git push error:', gitErr);
        return NextResponse.json(
          {
            error: 'Git push to GitHub failed',
            details: gitErr?.stderr || gitErr?.message || String(gitErr),
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        gallery: {
          slug,
          clientInfo: clientTitle,
          passcode,
          coverPhoto: effectiveCover ? `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public/shoots/${slug}/${effectiveCover}` : '',
          imageCount: allFiles.length,
          pushedToGithub: true,
        },
      });
    }

    /* ════════════════════════════════════════
       MODE 2: DELETE GALLERY & SYNC TO GITHUB
       ════════════════════════════════════════ */
    if (uploadType === 'delete_gallery') {
      const slug = (formData.get('slug') as string || '').trim();
      if (!slug) {
        return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
      }

      const shootDir = path.join(process.cwd(), 'public', 'shoots', slug);
      if (fs.existsSync(shootDir)) {
        fs.rmSync(shootDir, { recursive: true, force: true });
      }

      try {
        await execAsync(`git add -A "public/shoots/${slug}"`, { cwd: process.cwd() });
        await execAsync(`git commit -m "feat(gallery): remove client gallery '${slug}'"`, { cwd: process.cwd() });
        await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
      } catch (gitErr: any) {
        console.warn('Git delete push notice:', gitErr?.message);
      }

      return NextResponse.json({ success: true, deletedSlug: slug });
    }

    /* ════════════════════════════════════════
       MODE 3: GENERAL ASSET UPLOAD
       ════════════════════════════════════════ */
    if (uploadType === 'general') {
      const file = formData.get('file') as File | null;
      if (!file || !file.name) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filePath = path.join(uploadDir, sanitizedFileName);
      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

      const commitMessage = `feat(uploads): upload asset ${sanitizedFileName}`;
      try {
        await execAsync(`git add "public/uploads/${sanitizedFileName}"`, { cwd: process.cwd() });
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: process.cwd() });
        await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
      } catch (gitErr: any) {
        console.warn('Git asset push notice:', gitErr?.message);
      }

      const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public/uploads/${sanitizedFileName}`;
      return NextResponse.json({
        success: true,
        filename: sanitizedFileName,
        url: `/uploads/${sanitizedFileName}`,
        githubRawUrl: rawUrl,
      });
    }

    return NextResponse.json({ error: 'Invalid uploadType' }, { status: 400 });
  } catch (err: any) {
    console.error('Upload handler exception:', err);
    return NextResponse.json({ error: 'Internal server upload error', details: err?.message }, { status: 500 });
  }
}
