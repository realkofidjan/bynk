import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import {
  isCloudinaryConfigured,
  uploadOriginal,
  uploadGalleryImage,
  getOptimizedUrl,
  deleteFolder,
} from '@/lib/cloudinary';
import { getShootsAsync } from '@/lib/shoots';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** 30 days in milliseconds */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/* ────────────────────────────────────────
   GET /api/upload — List client galleries
   ──────────────────────────────────────── */

export async function GET() {
  try {
    const shoots = await getShootsAsync();

    const clientGalleries = shoots.map((shoot) => {
      return {
        ...shoot,
        imageCount: shoot.images.length,
        totalSizeMb: (shoot.images.length * 1.1).toFixed(2),
        lastModified: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      clientGalleries,
      generalUploads: [],
      cloudinaryEnabled: isCloudinaryConfigured(),
    });
  } catch (err: unknown) {
    console.error('Failed to list uploads:', err);
    return NextResponse.json(
      { error: 'Failed to list uploaded files', details: String(err) },
      { status: 500 }
    );
  }
}

/* ────────────────────────────────────────
   POST /api/upload — Upload Gallery or Files
   ──────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        {
          error: 'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.',
        },
        { status: 500 }
      );
    }

    const supabase = createServerSupabase();

    // ── Raw binary upload (one image at a time) ──
    const rawUploadType = request.headers.get('x-upload-type');

    if (rawUploadType === 'raw_photo') {
      const rawSlug = request.headers.get('x-slug') || '';
      const galleryId = request.headers.get('x-gallery-id') || '';
      let rawFilename = request.headers.get('x-filename') || '';

      try {
        rawFilename = decodeURIComponent(rawFilename);
      } catch {}

      if (!rawSlug || !rawFilename) {
        return NextResponse.json({ error: 'Missing x-slug or x-filename header' }, { status: 400 });
      }

      const sanitized = rawFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const arrayBuffer = await request.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Cloudinary: original + gallery copy in parallel
      const [originalResult, galleryResult] = await Promise.all([
        uploadOriginal(buffer, rawSlug, sanitized),
        uploadGalleryImage(buffer, rawSlug, sanitized),
      ]);

      // Resolve gallery ID from slug if not provided
      let resolvedGalleryId = galleryId;
      if (!resolvedGalleryId) {
        const { data: gallery } = await supabase
          .from('client_galleries')
          .select('id')
          .eq('slug', rawSlug)
          .single();
        resolvedGalleryId = gallery?.id || '';
      }

      // Save image record to Supabase
      if (resolvedGalleryId) {
        await supabase.from('gallery_images').upsert(
          {
            gallery_id: resolvedGalleryId,
            filename: sanitized,
            original_public_id: originalResult.publicId,
            gallery_public_id: galleryResult.publicId,
            original_url: originalResult.secureUrl,
            gallery_url: galleryResult.secureUrl,
            size_bytes: originalResult.bytes,
            width: originalResult.width,
            height: originalResult.height,
          },
          { onConflict: 'gallery_id,filename' }
        );
      }

      return NextResponse.json({
        success: true,
        filename: sanitized,
        sizeBytes: arrayBuffer.byteLength,
        url: getOptimizedUrl(galleryResult.secureUrl),
        galleryUrl: getOptimizedUrl(galleryResult.secureUrl),
        originalUrl: originalResult.secureUrl,
      });
    }

    // ── Standard FormData handling ──
    const formData = await request.formData();
    const uploadType = (formData.get('uploadType') as string) || 'general';

    /* ════════════════════════════════════════
       MODE 1A: INITIALIZE CLIENT GALLERY
       ════════════════════════════════════════ */
    if (uploadType === 'init_gallery') {
      const clientTitle = ((formData.get('clientTitle') as string) || '').trim();
      let slug = ((formData.get('slug') as string) || '').trim().toLowerCase();
      let passcode = ((formData.get('passcode') as string) || '').trim();

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

      const expiresAt = new Date(Date.now() + RETENTION_MS).toISOString();

      // Upsert gallery record (handles retries gracefully)
      const { data: gallery, error: upsertError } = await supabase
        .from('client_galleries')
        .upsert(
          {
            slug,
            passcode,
            client_info: clientTitle,
            status: 'active',
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        )
        .select()
        .single();

      if (upsertError || !gallery) {
        console.error('Supabase upsert error:', upsertError);
        return NextResponse.json(
          { error: 'Failed to create gallery record', details: upsertError?.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        slug: gallery.slug,
        clientTitle,
        passcode,
        galleryId: gallery.id,
        expiresAt,
      });
    }

    /* ════════════════════════════════════════
       MODE 1B: FINALIZE GALLERY
       ════════════════════════════════════════ */
    if (uploadType === 'finalize_gallery') {
      const slug = ((formData.get('slug') as string) || '').trim();
      const coverPhotoName = ((formData.get('coverPhotoName') as string) || '').trim();

      if (!slug) {
        return NextResponse.json({ error: 'Slug required' }, { status: 400 });
      }

      // Get gallery and its images
      const { data: gallery } = await supabase
        .from('client_galleries')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!gallery) {
        return NextResponse.json({ error: 'Gallery not found' }, { status: 404 });
      }

      // Find the cover photo image record
      let coverPhotoUrl = '';
      if (coverPhotoName) {
        const sanitizedCover = coverPhotoName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const { data: coverImage } = await supabase
          .from('gallery_images')
          .select('gallery_url')
          .eq('gallery_id', gallery.id)
          .eq('filename', sanitizedCover)
          .single();

        if (coverImage) {
          coverPhotoUrl = getOptimizedUrl(coverImage.gallery_url);
        }
      }

      // If no cover photo set, use first image
      if (!coverPhotoUrl) {
        const { data: firstImage } = await supabase
          .from('gallery_images')
          .select('gallery_url')
          .eq('gallery_id', gallery.id)
          .limit(1)
          .single();

        if (firstImage) {
          coverPhotoUrl = getOptimizedUrl(firstImage.gallery_url);
        }
      }

      // Update gallery with cover photo
      await supabase
        .from('client_galleries')
        .update({
          cover_photo_url: coverPhotoUrl,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', gallery.id);

      // Count images
      const { count } = await supabase
        .from('gallery_images')
        .select('*', { count: 'exact', head: true })
        .eq('gallery_id', gallery.id);

      return NextResponse.json({
        success: true,
        gallery: {
          slug,
          coverPhoto: coverPhotoUrl,
          imageCount: count || 0,
          cloudinary: true,
        },
      });
    }

    /* ════════════════════════════════════════
       MODE 2: DELETE GALLERY
       ════════════════════════════════════════ */
    if (uploadType === 'delete_gallery') {
      const slug = ((formData.get('slug') as string) || '').trim();
      if (!slug) {
        return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
      }

      // Delete from Cloudinary (both originals and gallery folders)
      await Promise.all([
        deleteFolder(`bynk/originals/${slug}`),
        deleteFolder(`bynk/gallery/${slug}`),
      ]);

      // Delete from Supabase (cascade deletes gallery_images)
      await supabase.from('client_galleries').delete().eq('slug', slug);

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

      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const baseName = sanitizedFileName.replace(/\.[^/.]+$/, '');

      const result = await uploadGalleryImage(buffer, 'assets', baseName);

      return NextResponse.json({
        success: true,
        filename: sanitizedFileName,
        url: getOptimizedUrl(result.secureUrl),
        cloudinaryUrl: result.secureUrl,
      });
    }

    return NextResponse.json({ error: 'Invalid uploadType' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Upload handler exception:', err);
    return NextResponse.json(
      { error: 'Internal server upload error', details: String(err) },
      { status: 500 }
    );
  }
}
