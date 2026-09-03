import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';
import { deleteFolder, isCloudinaryConfigured } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET /api/cleanup
 *
 * Cron-triggered endpoint that:
 * 1. Finds galleries where expires_at < now() AND status = 'active'
 * 2. Deletes the originals/ folder from Cloudinary for each
 * 3. Marks gallery_images.original_deleted = true
 * 4. Updates gallery status to 'expired'
 *
 * Gallery-quality images are preserved permanently.
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 });
  }

  try {
    const supabase = createServerSupabase();

    // Find galleries that have expired but are still marked active
    const { data: expiredGalleries, error: fetchError } = await supabase
      .from('client_galleries')
      .select('id, slug')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Cleanup: failed to fetch expired galleries:', fetchError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    if (!expiredGalleries || expiredGalleries.length === 0) {
      return NextResponse.json({ message: 'No expired galleries to clean up', cleaned: 0 });
    }

    let cleaned = 0;
    const errors: string[] = [];

    for (const gallery of expiredGalleries) {
      try {
        // Delete both originals and gallery folders from Cloudinary
        await Promise.all([
          deleteFolder(`bynk/originals/${gallery.slug}`),
          deleteFolder(`bynk/gallery/${gallery.slug}`),
        ]);

        // Remove gallery image records from Supabase
        await supabase
          .from('gallery_images')
          .delete()
          .eq('gallery_id', gallery.id);

        // Update gallery status to expired
        await supabase
          .from('client_galleries')
          .update({
            status: 'expired',
            cover_photo_url: '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', gallery.id);

        cleaned++;
        console.log(`Cleanup: expired gallery "${gallery.slug}" — all Cloudinary photos and records completely deleted.`);
      } catch (err) {
        const msg = `Failed to clean up gallery "${gallery.slug}": ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    return NextResponse.json({
      message: `Cleaned up ${cleaned} of ${expiredGalleries.length} expired galleries`,
      cleaned,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    console.error('Cleanup cron error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
