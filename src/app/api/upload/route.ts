import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REPO_OWNER = 'realkofidjan';
const REPO_NAME = 'bynk';
const REPO_BRANCH = 'main';

/* ────────────────────────────────────────
   GET /api/upload — List all uploaded images
   ──────────────────────────────────────── */

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const files = fs.readdirSync(uploadDir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'].includes(ext);
    });

    const fileDetails = files.map((filename) => {
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
    }).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({
      success: true,
      files: fileDetails,
    });
  } catch (err) {
    console.error('Failed to list uploads:', err);
    return NextResponse.json({ error: 'Failed to list uploaded files' }, { status: 500 });
  }
}

/* ────────────────────────────────────────
   POST /api/upload — Upload file directly to GitHub & public/uploads/
   ──────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const customGithubToken = (formData.get('githubToken') as string) || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

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

    // Sanitize filename
    const originalName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `${timestamp}_${originalName}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);

    // Convert file to Buffer & save locally
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const relativePath = `public/uploads/${filename}`;
    const localUrl = `/uploads/${filename}`;
    const githubRawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${relativePath}`;
    const githubBlobUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/${relativePath}`;

    let pushedToGithub = false;
    let githubCommitSha = '';

    // Method A: Direct GitHub REST API Commit if GITHUB_TOKEN is available
    if (customGithubToken) {
      try {
        const base64Content = buffer.toString('base64');
        const apiResponse = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${relativePath}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `token ${customGithubToken}`,
              'Content-Type': 'application/json',
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'BYNK-Photo-Portfolio-Uploader',
            },
            body: JSON.stringify({
              message: `upload: Add ${filename} via BYNK URL upload portal`,
              content: base64Content,
              branch: REPO_BRANCH,
            }),
          }
        );

        if (apiResponse.ok) {
          const resData = await apiResponse.json();
          pushedToGithub = true;
          githubCommitSha = resData.commit?.sha || '';
        } else {
          const errData = await apiResponse.json();
          console.warn('GitHub API upload warning:', errData.message);
        }
      } catch (ghErr) {
        console.warn('GitHub API upload error:', ghErr);
      }
    }

    // Method B: Local Git CLI Push fallback if in server/local environment
    if (!pushedToGithub) {
      try {
        await execAsync(`git add "${filePath}"`, { cwd: process.cwd() });
        await execAsync(`git commit -m "upload: Add ${filename} via BYNK upload portal"`, { cwd: process.cwd() });
        await execAsync(`git push origin ${REPO_BRANCH}`, { cwd: process.cwd() });
        pushedToGithub = true;
      } catch (gitErr) {
        console.info('Git CLI push skipped or not in git environment:', gitErr instanceof Error ? gitErr.message : gitErr);
      }
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
      commitSha: githubCommitSha,
    });
  } catch (err) {
    console.error('Upload POST error:', err);
    return NextResponse.json({ error: 'Internal server upload error' }, { status: 500 });
  }
}
