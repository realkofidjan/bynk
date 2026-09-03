'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Check,
  Copy,
  FileImage,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertCircle,
  FolderLock,
  Key,
  Download,
  MessageCircle,
  Trash2,
  Plus,
  Star,
  Image as ImageIcon,
  FolderGit2,
  Search,
  X,
  User,
  Phone,
  Calendar,
  Send,
  Sparkle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClientGalleryItem {
  slug: string;
  passcode: string;
  clientInfo: string;
  coverPhoto: string;
  imageCount: number;
  totalSizeMb: string;
  lastModified: string;
  images: { src: string; alt: string; filename: string }[];
}

interface UploadedFileItem {
  filename: string;
  sizeBytes: number;
  sizeMb: string;
  uploadedAt: string;
  localUrl: string;
  githubRawUrl: string;
  githubBlobUrl: string;
}

interface PastBooking {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  package_name: string;
  status: string;
  total_price: number;
}

function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '233' + cleaned.slice(1);
  }
  return cleaned;
}

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<'galleries' | 'assets'>('galleries');
  const [clientGalleries, setClientGalleries] = useState<ClientGalleryItem[]>([]);
  const [generalUploads, setGeneralUploads] = useState<UploadedFileItem[]>([]);
  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Gallery Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [clientTitle, setClientTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [passcode, setPasscode] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [coverPhotoIndex, setCoverPhotoIndex] = useState(0);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);

  // WhatsApp Share Modal State
  const [whatsappGallery, setWhatsappGallery] = useState<ClientGalleryItem | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<PastBooking | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');

  // Asset Drag & Drop State
  const [dragging, setDragging] = useState(false);

  // Helper to generate 6-digit random passcode
  const generateRandomPasscode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPasscode(code);
  };

  // Convert any image to high-quality JPEG (max 3200px, 92% quality)
  const convertToHighQualityJpeg = async (file: File, quality = 0.92, maxDimension = 3200): Promise<File> => {
    return new Promise((resolve) => {
      // If already a small JPEG, keep as is
      if (file.type === 'image/jpeg' && file.size < 5 * 1024 * 1024) {
        resolve(file);
        return;
      }

      const img = document.createElement('img');
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const jpegFilename = `${baseName}.jpg`;
            const jpegFile = new File([blob], jpegFilename, { type: 'image/jpeg' });
            resolve(jpegFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  };

  // Fetch all galleries, uploads, and past shoots
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [uploadRes, shootsRes] = await Promise.all([
        fetch('/api/upload').catch(() => null),
        fetch('/api/shoots?filter=all&limit=200').catch(() => null),
      ]);

      if (uploadRes && uploadRes.ok) {
        const data = await uploadRes.json();
        if (data.success && Array.isArray(data.clientGalleries)) {
          setClientGalleries(data.clientGalleries);
          setGeneralUploads(data.generalUploads || []);
        }
      }

      if (shootsRes && shootsRes.ok) {
        const shootsData = await shootsRes.json();
        setPastBookings(shootsData.shoots || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle selected files for gallery with automatic JPG conversion
  const handleGalleryFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const rawFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (rawFiles.length === 0) return;

    setConverting(true);
    setStatusMessage({
      type: 'info',
      text: `Optimizing and converting ${rawFiles.length} photo(s) to high-quality JPG...`,
    });

    const convertedFiles: File[] = [];
    for (let i = 0; i < rawFiles.length; i++) {
      const f = rawFiles[i];
      const jpg = await convertToHighQualityJpeg(f);
      convertedFiles.push(jpg);
    }

    // Deduplicate: only add files that aren't already selected (by name and size)
    const existingKeys = new Set(selectedFiles.map((f) => `${f.name}-${f.size}`));
    const uniqueConverted = convertedFiles.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));

    if (uniqueConverted.length === 0) {
      setConverting(false);
      setStatusMessage({
        type: 'info',
        text: 'Selected photo(s) are already in the list.',
      });
      return;
    }

    const combined = [...selectedFiles, ...uniqueConverted];
    setSelectedFiles(combined);

    // Create object URLs for previews
    const newPreviews = combined.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews(newPreviews);
    setConverting(false);
    setStatusMessage({
      type: 'success',
      text: `Ready! Added ${uniqueConverted.length} new photo(s) (total ${combined.length}).`,
    });
  };

  // Remove a file from pending gallery
  const removeGalleryFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
    if (coverPhotoIndex >= updatedFiles.length) {
      setCoverPhotoIndex(Math.max(0, updatedFiles.length - 1));
    }
    if (lightboxIndex === index) {
      setLightboxIndex(null);
    }
  };

  // Submit and upload client gallery
  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Client Shoot Title' });
      return;
    }
    if (selectedFiles.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least 1 image for this gallery' });
      return;
    }

    setUploading(true);
    const effectivePasscode = passcode.trim() || Math.floor(100000 + Math.random() * 900000).toString();
    const coverPhotoName = selectedFiles[coverPhotoIndex]?.name?.replace(/[^a-zA-Z0-9_.-]/g, '_') || '';
    const targetSlug =
      customSlug.trim() ||
      clientTitle
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .trim()
        .replace(/\s+/g, '_');

    try {
      // Step 1: Initialize gallery folder & info.txt
      setStatusMessage({ type: 'info', text: `Initializing gallery for "${clientTitle}"...` });
      const initFormData = new FormData();
      initFormData.append('uploadType', 'init_gallery');
      initFormData.append('clientTitle', clientTitle.trim());
      initFormData.append('slug', targetSlug);
      initFormData.append('passcode', effectivePasscode);
      initFormData.append('coverPhotoName', coverPhotoName);

      const initRes = await fetch('/api/upload', {
        method: 'POST',
        body: initFormData,
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Failed to initialize gallery directory');
      }

      const initData = await initRes.json();
      const actualSlug = initData.slug || targetSlug;
      const galleryId = initData.galleryId || '';

      // Step 2: Stream each photo as raw binary directly to server (uploads to Cloudinary)
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length, filename: file.name });
        setStatusMessage({
          type: 'info',
          text: `Uploading photo ${i + 1} of ${selectedFiles.length}: ${file.name}...`,
        });

        const fileRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'x-upload-type': 'raw_photo',
            'x-slug': actualSlug,
            'x-gallery-id': galleryId,
            'x-filename': encodeURIComponent(file.name),
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        });

        if (!fileRes.ok) {
          const errJson = await fileRes.json().catch(() => ({}));
          throw new Error(`Failed to upload ${file.name}: ${errJson.error || errJson.details || fileRes.statusText}`);
        }
      }

      // Step 3: Finalize gallery
      setStatusMessage({ type: 'info', text: `Finalizing gallery with ${selectedFiles.length} photos...` });
      const finalizeFormData = new FormData();
      finalizeFormData.append('uploadType', 'finalize_gallery');
      finalizeFormData.append('slug', actualSlug);
      finalizeFormData.append('clientTitle', clientTitle.trim());
      finalizeFormData.append('passcode', effectivePasscode);
      finalizeFormData.append('coverPhotoName', coverPhotoName);

      const finalizeRes = await fetch('/api/upload', {
        method: 'POST',
        body: finalizeFormData,
      });

      const finalizeData = await finalizeRes.json();

      if (finalizeRes.ok && finalizeData.success) {
        setStatusMessage({
          type: 'success',
          text: `Gallery "${clientTitle}" with passcode ${effectivePasscode} (${selectedFiles.length} photos) successfully uploaded to cloud storage!`,
        });
        // Reset form
        setClientTitle('');
        setCustomSlug('');
        setPasscode('');
        setSelectedBookingId('');
        setSelectedFiles([]);
        setPreviews([]);
        setCoverPhotoIndex(0);
        setShowCreateModal(false);
        fetchData();
      } else {
        setStatusMessage({
          type: 'error',
          text: finalizeData.error || 'Failed to finalize gallery git push',
        });
      }
    } catch (err: any) {
      console.error('Gallery upload error:', err);
      setStatusMessage({ type: 'error', text: err?.message || 'Error uploading gallery files' });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Delete Gallery
  const handleDeleteGallery = async (slug: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the gallery "${title}"? This will also remove it from GitHub.`)) {
      return;
    }

    setUploading(true);
    setStatusMessage({ type: 'info', text: `Deleting gallery "${title}"...` });

    const formData = new FormData();
    formData.append('uploadType', 'delete_gallery');
    formData.append('slug', slug);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: `Gallery "${title}" deleted from repository.` });
        fetchData();
      } else {
        const data = await res.json();
        setStatusMessage({ type: 'error', text: data.error || 'Failed to delete gallery' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error deleting gallery' });
    } finally {
      setUploading(false);
    }
  };

  // Upload single / batch asset
  const handleUploadAssets = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatusMessage({ type: 'info', text: `Uploading ${files.length} asset(s) directly to GitHub...` });

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('uploadType', 'general');
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          successCount++;
        }
      } catch (err) {
        console.error('Upload asset error:', err);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setStatusMessage({ type: 'success', text: `Successfully uploaded ${successCount} asset(s) to GitHub repository!` });
      fetchData();
    } else {
      setStatusMessage({ type: 'error', text: 'Failed to upload assets. Please try again.' });
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Open WhatsApp Modal for a Gallery
  const openWhatsAppModal = (gallery: ClientGalleryItem) => {
    setWhatsappGallery(gallery);
    setBookingSearch('');

    // Try to auto-match client from past shoots
    const match = pastBookings.find(
      (b) =>
        (b?.name && gallery.clientInfo.toLowerCase().includes(b.name.toLowerCase())) ||
        (b?.name && b.name.toLowerCase().includes(gallery.clientInfo.toLowerCase())) ||
        (b?.name && gallery.slug.toLowerCase().includes(b.name.toLowerCase().replace(/\s+/g, '_')))
    );

    if (match) {
      setSelectedBooking(match);
      setRecipientName(match.name || '');
      setRecipientPhone(match.phone || '');
    } else {
      setSelectedBooking(null);
      setRecipientName(gallery.clientInfo || '');
      setRecipientPhone('');
    }
  };

  // Build the WhatsApp message content
  const generateWhatsAppMessage = () => {
    if (!whatsappGallery) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bynk.photography';
    const name = recipientName.trim() || whatsappGallery.clientInfo;
    return `Hi ${name},\n\nYour private photography gallery for *${whatsappGallery.clientInfo}* is now ready to view and download! 📸\n\n🔗 *Gallery Link:* ${origin}/gallery\n🔑 *Passcode:* ${whatsappGallery.passcode}\n\nYou can view all ${whatsappGallery.imageCount} high-resolution photos and download them anytime.\n\nThank you for choosing BYNK Photography!`;
  };

  // Launch WhatsApp with pre-filled text
  const handleSendWhatsApp = () => {
    if (!recipientPhone.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select a client or enter a phone number' });
      return;
    }

    const formattedPhone = formatPhoneForWhatsApp(recipientPhone);
    const text = generateWhatsAppMessage();
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setWhatsappGallery(null);
  };

  // Filtered lists
  const filteredGalleries = clientGalleries.filter(
    (g) =>
      g.clientInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.passcode.includes(searchQuery) ||
      g.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssets = generalUploads.filter((a) =>
    a.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchLower = (bookingSearch || '').toLowerCase().trim();
  const filteredBookings = pastBookings.filter(
    (b) =>
      !searchLower ||
      (b.name || '').toLowerCase().includes(searchLower) ||
      (b.phone || '').includes(searchLower) ||
      (b.email || '').toLowerCase().includes(searchLower) ||
      (b.package_name || '').toLowerCase().includes(searchLower)
  );

  return (
    <main className="fixed inset-0 z-10 overflow-y-auto bg-background text-foreground pt-24 pb-20 px-4 sm:px-8 lg:px-16 selection:bg-foreground/20 font-sans overscroll-contain">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-foreground/15 pb-6">
          <div>
            <div className="flex items-center gap-2 text-foreground/40 font-mono text-[10px] uppercase tracking-[0.3em] mb-1">
              <FolderGit2 className="w-3.5 h-3.5" /> Client Gallery & GitHub Sync
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-foreground">
              Upload Gallery Portal
            </h1>
            <p className="text-xs font-mono text-foreground/50 mt-1">
              Passcode-protected client galleries & assets synced to{' '}
              <code className="text-foreground font-semibold">realkofidjan/bynk (main)</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!passcode) generateRandomPasscode();
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-all shadow-sm flex items-center gap-2 rounded-none cursor-pointer font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              New Client Gallery
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 border border-foreground/20 hover:bg-foreground/5 transition-colors cursor-pointer"
              title="Refresh galleries, uploads and past shoots"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-foreground/70 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 border font-mono text-xs flex items-center justify-between ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : statusMessage.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-foreground/5 border-foreground/20 text-foreground/80'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-[10px] uppercase underline opacity-70 hover:opacity-100 cursor-pointer ml-4"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-foreground/[0.02] border border-foreground/10 p-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('galleries')}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer flex items-center gap-2 ${
                activeTab === 'galleries'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
            >
              <FolderLock className="w-3.5 h-3.5" />
              Client Shoot Galleries ({clientGalleries.length})
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer flex items-center gap-2 ${
                activeTab === 'assets'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" />
              Raw Asset Uploads ({generalUploads.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'galleries' ? 'Search client or code...' : 'Search filename...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-foreground/15 pl-8 pr-3 py-1.5 text-xs font-mono text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/50"
            />
          </div>
        </div>

        {/* TAB 1: CLIENT SHOOT GALLERIES */}
        {activeTab === 'galleries' && (
          <div className="space-y-6">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground animate-spin mx-auto mb-3" />
                <p className="text-xs font-mono text-foreground/40 tracking-wider uppercase">Loading client galleries...</p>
              </div>
            ) : filteredGalleries.length === 0 ? (
              <div className="py-20 border border-dashed border-foreground/20 text-center space-y-4">
                <FolderLock className="w-10 h-10 text-foreground/20 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-serif text-foreground">No client galleries found</p>
                  <p className="text-xs font-mono text-foreground/40">
                    Create your first client gallery to upload photos and generate access passcodes.
                  </p>
                </div>
                <button
                  onClick={() => {
                    generateRandomPasscode();
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 bg-foreground text-background font-mono text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  + Create Gallery Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGalleries.map((gallery) => (
                  <motion.div
                    key={gallery.slug}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-foreground/[0.02] border border-foreground/15 hover:border-foreground/30 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Cover Photo Header */}
                    <div className="relative aspect-[16/10] bg-neutral-950 overflow-hidden border-b border-foreground/10 flex items-center justify-center">
                      {gallery.coverPhoto ? (
                        <img
                          src={gallery.coverPhoto}
                          alt={gallery.clientInfo}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/20">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}

                      {/* Top Overlay Badge */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-auto">
                        <span className="bg-background/90 backdrop-blur-md text-foreground px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold border border-foreground/10 shadow-sm">
                          {gallery.imageCount} Photo{gallery.imageCount === 1 ? '' : 's'} · {gallery.totalSizeMb} MB
                        </span>
                        <button
                          onClick={() => handleDeleteGallery(gallery.slug, gallery.clientInfo)}
                          className="p-1.5 bg-background/90 text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-foreground/10 transition-colors cursor-pointer"
                          title="Delete gallery"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/40">
                            Folder: public/shoots/{gallery.slug}
                          </p>
                          <h3 className="font-serif text-lg text-foreground font-medium line-clamp-1">
                            {gallery.clientInfo}
                          </h3>
                        </div>

                        {/* Passcode Copy Box */}
                        <div className="flex items-center justify-between bg-foreground/[0.04] border border-foreground/15 p-2.5">
                          <div className="flex items-center gap-2">
                            <Key className="w-3.5 h-3.5 text-foreground/50" />
                            <span className="text-[10px] font-mono text-foreground/50 uppercase tracking-wider">Passcode:</span>
                            <span className="font-mono text-xs font-bold tracking-widest text-emerald-400">
                              {gallery.passcode}
                            </span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(gallery.passcode, `pass_${gallery.slug}`)}
                            className="text-[9px] font-mono text-foreground/70 hover:text-foreground flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                          >
                            {copiedKey === `pass_${gallery.slug}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons: WhatsApp Client & Download ZIP */}
                      <div className="pt-2 border-t border-foreground/10 grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <button
                          onClick={() => openWhatsAppModal(gallery)}
                          className="px-2.5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider font-semibold"
                          title="Send passcode and gallery link to client on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Client
                        </button>

                        <a
                          href={`/api/download?code=${encodeURIComponent(gallery.passcode)}`}
                          className="px-2.5 py-2 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider text-center"
                          title="Download high-resolution ZIP of all photos"
                        >
                          <Download className="w-3.5 h-3.5" /> Download .ZIP
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RAW ASSET UPLOADS */}
        {activeTab === 'assets' && (
          <div className="space-y-8">
            {/* Drag & Drop Upload Container */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleUploadAssets(e.dataTransfer.files);
                }
              }}
              className={`relative border-2 border-dashed transition-all p-10 sm:p-14 flex flex-col items-center justify-center text-center cursor-pointer ${
                dragging
                  ? 'border-foreground bg-foreground/[0.05] scale-[1.01]'
                  : 'border-foreground/20 bg-foreground/[0.02] hover:border-foreground/40 hover:bg-foreground/[0.03]'
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadAssets(e.target.files);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />

              <div className="flex flex-col items-center space-y-3 pointer-events-none">
                <div className="p-3.5 rounded-full bg-foreground/5 border border-foreground/10">
                  <Upload className="w-7 h-7 text-foreground/70" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-base text-foreground font-medium">
                    Drag & Drop Assets to Auto-Push to GitHub
                  </p>
                  <p className="text-[11px] font-mono text-foreground/50">
                    High-res JPG, PNG, WebP, SVG (saved in <code>public/uploads/</code>)
                  </p>
                </div>
              </div>
            </div>

            {/* Assets List */}
            {filteredAssets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssets.map((item) => (
                  <div
                    key={item.filename}
                    className="bg-foreground/[0.02] border border-foreground/10 hover:border-foreground/25 transition-all p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-14 h-14 bg-neutral-950 border border-foreground/10 shrink-0 overflow-hidden flex items-center justify-center">
                        <img src={item.localUrl} alt={item.filename} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-foreground truncate font-medium">{item.filename}</p>
                        <p className="text-[10px] font-mono text-foreground/40 mt-0.5">
                          {item.sizeMb} MB · {new Date(item.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-foreground/10 text-[9px] font-mono uppercase tracking-wider">
                      <button
                        onClick={() => copyToClipboard(item.githubRawUrl, item.filename)}
                        className="flex-1 py-1.5 bg-foreground/[0.04] hover:bg-foreground/[0.08] text-foreground border border-foreground/20 text-center transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        {copiedKey === item.filename ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedKey === item.filename ? 'Copied' : 'Raw GitHub URL'}
                      </button>
                      <a
                        href={item.githubBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 border border-foreground/20 hover:bg-foreground/5 text-foreground/70 transition-colors"
                        title="View file on GitHub"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-foreground/40 uppercase tracking-wider border border-dashed border-foreground/10">
                No asset uploads found
              </div>
            )}
          </div>
        )}

        {/* MODAL: CREATE CLIENT GALLERY */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-background border border-foreground/20 max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-foreground/15 pb-4">
                  <div className="flex items-center gap-2">
                    <FolderLock className="w-5 h-5 text-foreground/70" />
                    <h2 className="font-serif text-xl sm:text-2xl text-foreground font-medium">
                      Create Client Shoot Gallery
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFiles([]);
                      setPreviews([]);
                      setSelectedBookingId('');
                      setShowCreateModal(false);
                    }}
                    className="p-1.5 text-foreground/50 hover:text-foreground cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateGallery} className="space-y-6">
                  {/* Select Past Client Helper Button */}
                  {pastBookings.length > 0 && (
                    <div className="p-3 bg-foreground/[0.03] border border-foreground/10 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-foreground/60 uppercase tracking-wider">
                        <span>Quick-Fill from Past Shoots ({pastBookings.length} found):</span>
                      </div>
                      <Select
                        value={selectedBookingId}
                        onValueChange={(val) => {
                          setSelectedBookingId(val);
                          const chosen = pastBookings.find((b) => b.id === val);
                          if (chosen) {
                            const name = chosen.name || 'Client';
                            const pkg = chosen.package_name || 'Shoot';
                            setClientTitle(`${name} - ${pkg}`);
                            setCustomSlug(
                              `${name}_${pkg}`
                                .toLowerCase()
                                .replace(/[^a-zA-Z0-9\s-_]/g, '')
                                .trim()
                                .replace(/\s+/g, '_')
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-full h-10 text-xs font-mono rounded-none border-foreground/20 bg-background focus:border-foreground">
                          <SelectValue placeholder="-- Or choose a client from past bookings --" />
                        </SelectTrigger>
                        <SelectContent className="border-foreground/20 bg-background rounded-none z-[100] max-h-60 overflow-y-auto">
                          {pastBookings.map((b) => (
                            <SelectItem
                              key={b.id}
                              value={b.id}
                              className="text-xs font-mono rounded-none cursor-pointer"
                            >
                              {b.name || 'Client'} ({b.phone || 'No phone'}) — {b.package_name || 'Shoot'} ({b.date || ''})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Client Info & Passcode Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/70">
                        Client Shoot Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kwame & Akosua Wedding"
                        value={clientTitle}
                        onChange={(e) => {
                          setClientTitle(e.target.value);
                          if (!customSlug) {
                            setCustomSlug(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-zA-Z0-9\s-_]/g, '')
                                .trim()
                                .replace(/\s+/g, '_')
                            );
                          }
                        }}
                        className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/70">
                          6-Digit Passcode *
                        </label>
                        <button
                          type="button"
                          onClick={generateRandomPasscode}
                          className="text-[9px] font-mono text-emerald-400 hover:underline uppercase tracking-wider cursor-pointer"
                        >
                          🎲 Random
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 748291"
                        maxLength={6}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs font-mono text-foreground font-bold tracking-widest outline-none focus:border-foreground/50"
                      />
                    </div>
                  </div>

                  {/* Slug override */}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/40">
                      Folder Slug (public/shoots/[slug])
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. kwame_akosua_wedding"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      className="w-full bg-background border border-foreground/15 px-3 py-1.5 text-xs font-mono text-foreground/70 outline-none focus:border-foreground/40"
                    />
                  </div>

                  {/* Multi-Image File Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/70">
                        Select Shoot Photos ({selectedFiles.length} selected) *
                      </label>
                      {previews.length > 0 && (
                        <span className="text-[9px] font-mono text-foreground/40">
                          Click ★ to set Cover Photo · Click image to expand
                        </span>
                      )}
                    </div>

                    <div className="border border-dashed border-foreground/20 p-4 text-center bg-foreground/[0.01]">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        id="gallery-file-input"
                        onChange={(e) => {
                          handleGalleryFileSelect(e.target.files);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="gallery-file-input"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/20 text-xs font-mono uppercase tracking-wider text-foreground cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Choose Photos / Add More (Auto-Converts to JPG)
                      </label>
                    </div>

                    {/* Previews Grid - Non-Overlapping Thumbnails */}
                    {previews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-3 border border-foreground/10 bg-foreground/[0.02] custom-scrollbar">
                        {previews.map((preview, index) => {
                          const isCover = coverPhotoIndex === index;
                          return (
                            <div
                              key={index}
                              onClick={() => setLightboxIndex(index)}
                              className={`relative w-full aspect-[3/4] bg-neutral-950 border overflow-hidden group flex flex-col justify-between cursor-pointer rounded-none select-none transition-all ${
                                isCover
                                  ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-lg'
                                  : 'border-foreground/20 hover:border-foreground/50'
                              }`}
                            >
                              {/* Centered bounded image */}
                              <div className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden pointer-events-none">
                                <img
                                  src={preview.url}
                                  alt={`Preview ${index}`}
                                  className="max-w-full max-h-full w-auto h-auto object-contain block"
                                />
                              </div>

                              {/* Top Control Overlay */}
                              <div className="relative z-10 p-1.5 flex items-center justify-between pointer-events-auto">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCoverPhotoIndex(index);
                                  }}
                                  className={`px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer backdrop-blur-md shadow-sm ${
                                    isCover
                                      ? 'bg-amber-400 text-black font-bold shadow-md'
                                      : 'bg-black/75 text-white/80 hover:bg-black hover:text-white'
                                  }`}
                                  title={isCover ? 'Cover Photo' : 'Set as Cover Photo'}
                                >
                                  <Star className={`w-2.5 h-2.5 ${isCover ? 'fill-current' : ''}`} />
                                  {isCover ? 'Cover' : 'Set Cover'}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeGalleryFile(index);
                                  }}
                                  className="p-1 bg-black/75 hover:bg-red-600 text-white/90 hover:text-white backdrop-blur-md transition-colors cursor-pointer shadow-sm"
                                  title="Remove photo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Bottom Filename Overlay */}
                              <div className="relative z-10 mt-auto bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1.5 pt-3 text-[9px] font-mono text-white/90 truncate pointer-events-none">
                                <span className="truncate block">{preview.file.name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Upload Progress Bar */}
                  {uploadProgress && (
                    <div className="space-y-1.5 p-3 bg-foreground/5 border border-foreground/15">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-foreground/70 truncate max-w-[280px]">
                          Uploading: {uploadProgress.filename}
                        </span>
                        <span className="text-emerald-400 font-semibold">
                          {uploadProgress.current} / {uploadProgress.total} (
                          {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-foreground/10 h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full transition-all duration-300"
                          style={{
                            width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-foreground/10">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => {
                        setSelectedFiles([]);
                        setPreviews([]);
                        setSelectedBookingId('');
                        setShowCreateModal(false);
                      }}
                      className="px-4 py-2 border border-foreground/20 text-foreground text-xs font-mono uppercase tracking-wider hover:bg-foreground/5 disabled:opacity-40 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || selectedFiles.length === 0}
                      className="px-5 py-2.5 bg-foreground text-background font-mono text-xs uppercase tracking-wider font-semibold hover:bg-foreground/90 disabled:opacity-40 transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      {uploading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          {uploadProgress
                            ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                            : 'Syncing to GitHub...'}
                        </>
                      ) : (
                        <>
                          <FolderGit2 className="w-3.5 h-3.5" />
                          Create & Push to GitHub
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: WHATSAPP SHARE TO CLIENT */}
        <AnimatePresence>
          {whatsappGallery && (
            <div className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-background border border-foreground/20 max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-foreground/15 pb-4">
                  <div className="flex items-center gap-2.5 text-emerald-400">
                    <MessageCircle className="w-5 h-5" />
                    <div>
                      <h2 className="font-serif text-xl sm:text-2xl text-foreground font-medium">
                        Send Gallery on WhatsApp
                      </h2>
                      <p className="text-[10px] font-mono text-foreground/50 uppercase tracking-widest">
                        {whatsappGallery.clientInfo} · Passcode: {whatsappGallery.passcode}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setWhatsappGallery(null)}
                    className="p-1.5 text-foreground/50 hover:text-foreground cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-5">
                  {/* Step 1: Choose from Past Shoots Picker */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/70 flex items-center justify-between">
                      <span>1. Select Client from Past Shoots</span>
                      {selectedBooking && (
                        <span className="text-emerald-400 normal-case font-mono text-[10px]">
                          ✓ Linked to {selectedBooking.name}
                        </span>
                      )}
                    </label>

                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-foreground/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search past clients by name, phone, or package..."
                          value={bookingSearch}
                          onChange={(e) => setBookingSearch(e.target.value)}
                          className="w-full bg-background border border-foreground/20 pl-8 pr-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground/30 outline-none focus:border-foreground/50"
                        />
                      </div>

                      {/* Matching Past Shoots List */}
                      <div className="max-h-40 overflow-y-auto border border-foreground/10 bg-foreground/[0.02] divide-y divide-foreground/5 custom-scrollbar">
                        {filteredBookings.length > 0 ? (
                          filteredBookings.map((b) => {
                            const isChosen = selectedBooking?.id === b.id;
                            return (
                              <div
                                key={b.id}
                                onClick={() => {
                                  setSelectedBooking(b);
                                  setRecipientName(b.name);
                                  setRecipientPhone(b.phone);
                                }}
                                className={`p-2.5 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                                  isChosen
                                    ? 'bg-emerald-500/15 border-l-2 border-emerald-400'
                                    : 'hover:bg-foreground/[0.04]'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-foreground flex items-center gap-2">
                                    <User className="w-3 h-3 text-foreground/50" />
                                    {b.name || 'Client'}
                                  </p>
                                  <p className="text-[10px] text-foreground/50 flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5" /> {b.phone || ''}
                                    </span>
                                    {b.date && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" /> {b.date}
                                      </span>
                                    )}
                                    {b.package_name && <span>{b.package_name}</span>}
                                  </p>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-emerald-400">
                                  {isChosen ? 'Selected' : 'Select'}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-3 text-center text-xs font-mono text-foreground/40">
                            No matching past shoots found. Enter recipient details below.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Recipient Phone & Name Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/70">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. Kwame Mensah"
                        className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-foreground/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/70">
                        Client WhatsApp Phone *
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="e.g. 024 123 4567 or +233241234567"
                        className="w-full bg-background border border-foreground/20 px-3 py-2 text-xs font-mono text-foreground font-semibold outline-none focus:border-foreground/50"
                      />
                    </div>
                  </div>

                  {/* Step 3: Message Preview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/70">
                      <span>Message Preview</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generateWhatsAppMessage(), 'wa_modal_msg')}
                        className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'wa_modal_msg' ? (
                          <>
                            <Check className="w-3 h-3" /> Copied Text
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Message
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-foreground/[0.04] border border-foreground/15 p-3.5 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {generateWhatsAppMessage()}
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-foreground/10">
                    <button
                      type="button"
                      onClick={() => setWhatsappGallery(null)}
                      className="px-4 py-2.5 border border-foreground/20 text-foreground text-xs font-mono uppercase tracking-wider hover:bg-foreground/5 cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      disabled={!recipientPhone.trim()}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send on WhatsApp
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* LIGHTBOX FOR FULL IMAGE INSPECTION */}
        <AnimatePresence>
          {lightboxIndex !== null && previews[lightboxIndex] && (
            <div
              className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
              onClick={() => setLightboxIndex(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="absolute top-2 right-2 z-10 p-2 bg-black/70 hover:bg-black text-white text-xs font-mono flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Close
                </button>

                <img
                  src={previews[lightboxIndex].url}
                  alt={previews[lightboxIndex].file.name}
                  className="max-h-[82vh] max-w-full object-contain shadow-2xl"
                />

                <div className="mt-3 text-center text-xs font-mono text-white/80">
                  <span>{previews[lightboxIndex].file.name}</span> ·{' '}
                  <span>
                    Photo {lightboxIndex + 1} of {previews.length}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
