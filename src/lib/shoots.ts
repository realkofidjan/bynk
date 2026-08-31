import fs from 'fs';
import path from 'path';

const REPO_OWNER = 'realkofidjan';
const REPO_NAME = 'bynk';
const REPO_BRANCH = 'main';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public/shoots`;
const GITHUB_MANIFEST_URL = `${GITHUB_RAW_BASE}/manifest.json`;

export interface ShootImage {
  src: string;
  alt: string;
  filename: string;
}

export interface Shoot {
  slug: string;
  passcode: string;
  clientInfo: string;
  coverPhoto: string;
  images: ShootImage[];
  isRemote?: boolean;
}

/**
 * Fetch shoots from local disk or manifest.json
 */
export function getShoots(): Shoot[] {
  const shootsDir = path.join(process.cwd(), 'public', 'shoots');
  const manifestPath = path.join(shootsDir, 'manifest.json');

  // Try local manifest.json first
  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {}
  }

  if (!fs.existsSync(shootsDir)) {
    return [];
  }

  const entries = fs.readdirSync(shootsDir, { withFileTypes: true });
  const shootFolders = entries.filter((entry) => entry.isDirectory());

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

  const shoots: Shoot[] = shootFolders
    .map((folder) => {
      const folderPath = path.join(shootsDir, folder.name);
      const folderFiles = fs.readdirSync(folderPath);

      let passcode = '';
      let clientInfo = '';
      let coverPhoto = '';

      const txtFile = folderFiles.find((f) => f.toLowerCase() === 'info.txt' || f.endsWith('.txt'));
      if (txtFile) {
        const txtPath = path.join(folderPath, txtFile);
        const content = fs.readFileSync(txtPath, 'utf-8');
        const lines = content
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length > 0) passcode = lines[0];
        if (lines.length > 1) clientInfo = lines[1];
        if (lines.length > 2) coverPhoto = lines[2];
      }

      const imageFiles = folderFiles.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return imageExtensions.includes(ext);
      });

      if (!coverPhoto || !imageFiles.includes(coverPhoto)) {
        coverPhoto = imageFiles.length > 0 ? imageFiles[0] : '';
      }

      const images: ShootImage[] = imageFiles.map((filename) => {
        return {
          filename,
          src: `${GITHUB_RAW_BASE}/${folder.name}/${filename}`,
          alt: `${clientInfo} - ${path.parse(filename).name}`,
        };
      });

      return {
        slug: folder.name,
        passcode,
        clientInfo,
        coverPhoto: coverPhoto ? `${GITHUB_RAW_BASE}/${folder.name}/${coverPhoto}` : '',
        images,
      };
    })
    .filter((shoot) => shoot.images.length > 0 && shoot.passcode !== '');

  return shoots;
}

/**
 * Async fetch shoots from GitHub Raw CDN manifest with local fallback
 * 100% reliable on Vercel and serverless (no GitHub API rate limits)
 */
export async function getShootsAsync(): Promise<Shoot[]> {
  // Strategy 1: Fetch raw manifest from GitHub CDN (instant, non-rate-limited)
  try {
    const res = await fetch(`${GITHUB_MANIFEST_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const shoots = await res.json();
      if (Array.isArray(shoots) && shoots.length > 0) {
        return shoots;
      }
    }
  } catch (err) {
    console.warn('Could not fetch manifest from GitHub Raw, trying local/API:', err);
  }

  // Strategy 2: Local disk check
  const localShoots = getShoots();
  if (localShoots.length > 0) {
    return localShoots;
  }

  // Strategy 3: GitHub Contents API
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/shoots`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const contents = await res.json();
      if (Array.isArray(contents)) {
        const folderDirs = contents.filter((item: any) => item.type === 'dir');
        const shoots: Shoot[] = [];

        for (const dir of folderDirs) {
          const slug = dir.name;
          try {
            const infoRes = await fetch(`${GITHUB_RAW_BASE}/${slug}/info.txt`, { cache: 'no-store' });
            if (!infoRes.ok) continue;
            const infoText = await infoRes.text();
            const lines = infoText
              .split('\n')
              .map((l) => l.trim())
              .filter((l) => l.length > 0);

            const passcode = lines[0] || '';
            const clientInfo = lines[1] || slug;
            let coverPhoto = lines[2] || '';

            const dirRes = await fetch(dir.url, {
              headers: {
                Accept: 'application/vnd.github.v3+json',
                ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
              },
              cache: 'no-store',
            });

            if (dirRes.ok) {
              const files = await dirRes.json();
              const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
              const imageFiles = files.filter((f: any) => {
                const ext = path.extname(f.name).toLowerCase();
                return f.type === 'file' && imageExtensions.includes(ext);
              });

              if (!coverPhoto && imageFiles.length > 0) {
                coverPhoto = imageFiles[0].name;
              }

              const images: ShootImage[] = imageFiles.map((f: any) => ({
                filename: f.name,
                src: `${GITHUB_RAW_BASE}/${slug}/${f.name}`,
                alt: `${clientInfo} - ${path.parse(f.name).name}`,
              }));

              if (passcode && images.length > 0) {
                shoots.push({
                  slug,
                  passcode,
                  clientInfo,
                  coverPhoto: coverPhoto ? `${GITHUB_RAW_BASE}/${slug}/${coverPhoto}` : '',
                  images,
                  isRemote: true,
                });
              }
            }
          } catch {}
        }

        if (shoots.length > 0) {
          return shoots;
        }
      }
    }
  } catch {}

  return [];
}

export function getShootByPasscode(passcode: string): Shoot | undefined {
  const shoots = getShoots();
  return shoots.find((shoot) => shoot.passcode === passcode);
}

export async function getShootByPasscodeAsync(passcode: string): Promise<Shoot | undefined> {
  const shoots = await getShootsAsync();
  return shoots.find((shoot) => shoot.passcode.trim() === passcode.trim());
}

/**
 * Regenerate local public/shoots/manifest.json from all shoot directories
 */
export function syncShootsManifest(): Shoot[] {
  const shootsDir = path.join(process.cwd(), 'public', 'shoots');
  if (!fs.existsSync(shootsDir)) return [];

  const entries = fs.readdirSync(shootsDir, { withFileTypes: true });
  const shootFolders = entries.filter((entry) => entry.isDirectory());
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

  const shoots: Shoot[] = shootFolders
    .map((folder) => {
      const folderPath = path.join(shootsDir, folder.name);
      const folderFiles = fs.readdirSync(folderPath);

      let passcode = '';
      let clientInfo = '';
      let coverPhoto = '';

      const txtFile = folderFiles.find((f) => f.toLowerCase() === 'info.txt' || f.endsWith('.txt'));
      if (txtFile) {
        const txtPath = path.join(folderPath, txtFile);
        const content = fs.readFileSync(txtPath, 'utf-8');
        const lines = content
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length > 0) passcode = lines[0];
        if (lines.length > 1) clientInfo = lines[1];
        if (lines.length > 2) coverPhoto = lines[2];
      }

      const imageFiles = folderFiles.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return imageExtensions.includes(ext);
      });

      if (!coverPhoto || !imageFiles.includes(coverPhoto)) {
        coverPhoto = imageFiles.length > 0 ? imageFiles[0] : '';
      }

      const images: ShootImage[] = imageFiles.map((filename) => {
        return {
          filename,
          src: `/api/shoots/image?slug=${folder.name}&file=${filename}`,
          rawUrl: `${GITHUB_RAW_BASE}/${folder.name}/${filename}`,
          alt: `${clientInfo} - ${path.parse(filename).name}`,
        };
      });

      return {
        slug: folder.name,
        passcode,
        clientInfo,
        coverPhoto: coverPhoto ? `/api/shoots/image?slug=${folder.name}&file=${coverPhoto}` : '',
        images,
      };
    })
    .filter((shoot) => shoot.images.length > 0 && shoot.passcode !== '');

  fs.writeFileSync(path.join(shootsDir, 'manifest.json'), JSON.stringify(shoots, null, 2));
  return shoots;
}

