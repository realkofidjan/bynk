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
          const fileStat = fs.statSync(path.join(folderPath, file));
          totalSizeBytes += fileStat.size;
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

    // 3. Check git branch
    let currentCommit = '';
    try {
      const { stdout } = await execAsync('git rev-parse --short HEAD', { cwd: process.cwd() });
      currentCommit = stdout.trim();
    } catch {
      currentCommit = 'main';
    }

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

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
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

      const infoContent = `${passcode}\n${clientTitle}\n${coverPhotoName}\n`;
      fs.writeFileSync(path.join(shootDir, 'info.txt'), infoContent, 'utf-8');

      return NextResponse.json({
        success: true,
        slug,
        clientTitle,
        passcode,
        coverPhotoName,
      });
    }

    /* ════════════════════════════════════════
       MODE 1B: UPLOAD SINGLE PHOTO TO GALLERY
       ════════════════════════════════════════ */
    if (uploadType === 'upload_gallery_file') {
      const slug = (formData.get('slug') as string || '').trim();
      const file = formData.get('file') as File | null;

      if (!slug || !file) {
        return NextResponse.json({ error: 'Slug and file required' }, { status: 400 });
      }

      const shootDir = path.join(process.cwd(), 'public', 'shoots', slug);
      if (!fs.existsSync(shootDir)) {
        fs.mkdirSync(shootDir, { recursive: true });
      }

      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filePath = path.join(shootDir, sanitizedFileName);
      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

      return NextResponse.json({
        success: true,
        filename: sanitizedFileName,
        sizeBytes: arrayBuffer.byteLength,
      });
    }

    /* ════════════════════════════════════════
       MODE 1C: FINALIZE GALLERY & PUSH TO GITHUB
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

      // Check files in folder
      const allFiles = fs.readdirSync(shootDir).filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext);
      });

      const effectiveCover = coverPhotoName || (allFiles.length > 0 ? allFiles[0] : '');
      const infoContent = `${passcode}\n${clientTitle}\n${effectiveCover}\n`;
      fs.writeFileSync(path.join(shootDir, 'info.txt'), infoContent, 'utf-8');

      // Commit and Push
      let pushedToGithub = false;
      const commitMessage = `feat(gallery): add/update client gallery "${clientTitle}" (${slug}) with passcode [${passcode}]`;

      try {
        await execAsync(`git add "public/shoots/${slug}"`, { cwd: process.cwd() });
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: process.cwd() });
        await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
        pushedToGithub = true;
      } catch (gitErr: any) {
        console.warn('Git push notice:', gitErr?.message || gitErr);
      }

      return NextResponse.json({
        success: true,
        gallery: {
          slug,
          clientInfo: clientTitle,
          passcode,
          coverPhoto: effectiveCover ? `/shoots/${slug}/${effectiveCover}` : '',
          imageCount: allFiles.length,
          pushedToGithub,
        },
      });
    }

    /* ════════════════════════════════════════
       MODE 1D: LEGACY BATCH CLIENT GALLERY UPLOAD
       ════════════════════════════════════════ */
    if (uploadType === 'client_gallery') {
      const clientTitle = (formData.get('clientTitle') as string || '').trim();
      let slug = (formData.get('slug') as string || '').trim().toLowerCase();
      let passcode = (formData.get('passcode') as string || '').trim();
      const coverPhotoName = (formData.get('coverPhotoName') as string || '').trim();
      const files = formData.getAll('files') as File[];

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

      const savedFiles: string[] = [];

      for (const file of files) {
        if (!file || typeof file === 'string' || !file.name) continue;
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePath = path.join(shootDir, sanitizedFileName);
        const arrayBuffer = await file.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        savedFiles.push(sanitizedFileName);
      }

      const effectiveCover = coverPhotoName || (savedFiles.length > 0 ? savedFiles[0] : '');
      const infoContent = `${passcode}\n${clientTitle}\n${effectiveCover}\n`;
      fs.writeFileSync(path.join(shootDir, 'info.txt'), infoContent, 'utf-8');

      let pushedToGithub = false;
      const commitMessage = `feat(gallery): add/update client gallery "${clientTitle}" (${slug}) with passcode [${passcode}]`;

      try {
        await execAsync(`git add "public/shoots/${slug}"`, { cwd: process.cwd() });
        await execAsync(`git commit -m "${commitMessage}"`, { cwd: process.cwd() });
        await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
        pushedToGithub = true;
      } catch (gitErr: any) {
        console.warn('Git push notice:', gitErr?.message || gitErr);
      }

      return NextResponse.json({
        success: true,
        gallery: {
          slug,
          clientInfo: clientTitle,
          passcode,
          coverPhoto: effectiveCover ? `/shoots/${slug}/${effectiveCover}` : '',
          imageCount: savedFiles.length,
          pushedToGithub,
        },
      });
    }

    /* ════════════════════════════════════════
       MODE 2: DELETE CLIENT GALLERY
       ════════════════════════════════════════ */
    if (uploadType === 'delete_gallery') {
      const slug = (formData.get('slug') as string || '').trim();
      if (!slug) {
        return NextResponse.json({ error: 'Gallery slug required for deletion' }, { status: 400 });
      }

      const shootDir = path.join(process.cwd(), 'public', 'shoots', slug);
      if (fs.existsSync(shootDir)) {
        fs.rmSync(shootDir, { recursive: true, force: true });

        try {
          await execAsync(`git add -A "public/shoots/${slug}"`, { cwd: process.cwd() });
          await execAsync(`git commit -m "chore(gallery): remove client gallery ${slug}"`, { cwd: process.cwd() });
          await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
        } catch (gitErr: any) {
          console.warn('Git deletion push warning:', gitErr?.message || gitErr);
        }
      }

      return NextResponse.json({ success: true, message: `Gallery ${slug} deleted successfully.` });
    }

    /* ════════════════════════════════════════
       MODE 3: GENERAL ASSET UPLOADS
       ════════════════════════════════════════ */
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Allowed: JPG, PNG, WebP, GIF, AVIF, SVG` },
        { status: 400 }
      );
    }

    const originalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `${timestamp}_${originalName}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const relativePath = `public/uploads/${filename}`;
    const localUrl = `/uploads/${filename}`;
    const githubRawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${relativePath}`;
    const githubBlobUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/${relativePath}`;

    let pushedToGithub = false;

    // Git Push
    try {
      await execAsync(`git add "${filePath}"`, { cwd: process.cwd() });
      await execAsync(`git commit -m "upload: add ${filename} via BYNK upload portal"`, { cwd: process.cwd() });
      await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
      pushedToGithub = true;
    } catch (gitErr: any) {
      console.warn('Git push notice:', gitErr?.message || gitErr);
    }

    return NextResponse.json({
      success: true,
      filename,
      sizeBytes: buffer.length,
      sizeMb: (buffer.length / (1024 * 1024)).toFixed(2),
      localUrl,
      githubRawUrl,
      githubBlobUrl,
      pushedToGithub,
    });
  } catch (err: any) {
    console.error('Upload POST error:', err);
    return NextResponse.json({ error: 'Internal server upload error', details: err?.message }, { status: 500 });
  }
}

