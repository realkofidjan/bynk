import fs from 'fs';
import path from 'path';
import { createServerSupabase } from '@/lib/supabase';
import { getOptimizedUrl } from '@/lib/cloudinary';

const REPO_OWNER = 'realkofidjan';
const REPO_NAME = 'bynk';
const REPO_BRANCH = 'main';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public/shoots`;
const GITHUB_MANIFEST_URL = `${GITHUB_RAW_BASE}/manifest.json`;

export interface ShootImage {
  src: string;
  alt: string;
  filename: string;
  originalUrl?: string;
  originalDeleted?: boolean;
  galleryPublicId?: string;
  originalPublicId?: string;
  /** @deprecated Used by legacy GitHub-based shoots */
  rawUrl?: string;
}

export interface Shoot {
  slug: string;
  passcode: string;
  clientInfo: string;
  coverPhoto: string;
  images: ShootImage[];
  isRemote?: boolean;
  /** Whether full-res originals are still available for download */
  downloadsAvailable?: boolean;
  /** ISO timestamp when originals expire */
  expiresAt?: string;
  /** Supabase gallery ID (only for Cloudinary-backed galleries) */
  galleryId?: string;
}

/* ────────────────────────────────────────
   Strategy 1: Supabase + Cloudinary (new)
   ──────────────────────────────────────── */

/**
 * Fetch all shoots from Supabase (Cloudinary-backed galleries).
 * Returns [] if no Supabase galleries exist or if query fails.
 */
async function getShootsFromSupabase(): Promise<Shoot[]> {
  try {
    const supabase = createServerSupabase();
    const { data: galleries, error } = await supabase
      .from('client_galleries')
      .select(`
        id,
        slug,
        passcode,
        client_info,
        cover_photo_url,
        status,
        expires_at,
        gallery_images (
          id,
          filename,
          original_public_id,
          gallery_public_id,
          original_url,
          gallery_url,
          original_deleted
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error || !galleries) return [];

    return galleries.map((g: Record<string, unknown>) => {
      const rawImages = (g.gallery_images as Record<string, unknown>[]) || [];
      // Deduplicate images by filename to ensure no duplicates ever appear
      const uniqueImagesMap = new Map<string, Record<string, unknown>>();
      for (const img of rawImages) {
        const fn = img.filename as string;
        if (!uniqueImagesMap.has(fn)) {
          uniqueImagesMap.set(fn, img);
        }
      }
      const images = Array.from(uniqueImagesMap.values());
      const hasOriginals = images.some((img) => !img.original_deleted && img.original_url);
      const expiresAt = g.expires_at as string;

      return {
        slug: g.slug as string,
        passcode: g.passcode as string,
        clientInfo: g.client_info as string,
        coverPhoto: (g.cover_photo_url as string) || (images[0] ? getOptimizedUrl(images[0].gallery_url as string) : ''),
        galleryId: g.id as string,
        expiresAt,
        downloadsAvailable: g.status === 'active' && hasOriginals && new Date(expiresAt) > new Date(),
        images: images.map((img) => ({
          src: getOptimizedUrl(img.gallery_url as string),
          alt: `${g.client_info} - ${(img.filename as string).replace(/\.[^/.]+$/, '')}`,
          filename: img.filename as string,
          originalUrl: img.original_url as string | undefined,
          originalDeleted: img.original_deleted as boolean,
          galleryPublicId: img.gallery_public_id as string,
          originalPublicId: img.original_public_id as string | undefined,
        })),
      };
    });
  } catch (err) {
    console.warn('Failed to fetch shoots from Supabase:', err);
    return [];
  }
}

/* ────────────────────────────────────────
   Strategy 2: Local filesystem (legacy)
   ──────────────────────────────────────── */

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
        downloadsAvailable: true,
      };
    })
    .filter((shoot) => shoot.images.length > 0 && shoot.passcode !== '');

  return shoots;
}

/* ────────────────────────────────────────
   Strategy 3: GitHub Raw CDN (legacy remote)
   ──────────────────────────────────────── */

async function getShootsFromGitHub(): Promise<Shoot[]> {
  try {
    const res = await fetch(`${GITHUB_MANIFEST_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const shoots = await res.json();
      if (Array.isArray(shoots) && shoots.length > 0) {
        return shoots.map((s: Shoot) => ({ ...s, downloadsAvailable: true }));
      }
    }
  } catch (err) {
    console.warn('Could not fetch manifest from GitHub Raw:', err);
  }
  return [];
}

/* ────────────────────────────────────────
   Public API: Combined async fetch
   Priority: Supabase → GitHub CDN → Local disk
   ──────────────────────────────────────── */

export async function getShootsAsync(): Promise<Shoot[]> {
  // Supabase (Cloudinary-backed) is the single source of truth
  return await getShootsFromSupabase();
}

export function getShootByPasscode(passcode: string): Shoot | undefined {
  const shoots = getShoots();
  return shoots.find((shoot) => shoot.passcode === passcode);
}

export async function getShootByPasscodeAsync(passcode: string): Promise<Shoot | undefined> {
  const shoots = await getShootsAsync();
  return shoots.find((shoot) => shoot.passcode.trim() === passcode.trim());
}

/* ────────────────────────────────────────
   Manifest sync (legacy — kept for backward compat)
   ──────────────────────────────────────── */

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
