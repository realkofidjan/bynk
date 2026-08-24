'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, Copy, FileImage, ExternalLink, RefreshCw, FolderGit2, Sparkles, AlertCircle } from 'lucide-react';

interface UploadedFileItem {
  filename: string;
  sizeBytes: number;
  sizeMb: string;
  uploadedAt: string;
  localUrl: string;
  githubRawUrl: string;
  githubBlobUrl: string;
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Fetch recent uploaded files list
  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/upload');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.files) {
          setUploadedFiles(data.files);
        }
      }
    } catch (err) {
      console.error('Failed to fetch upload list:', err);
    }
  }, []);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Upload handler
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setStatusMessage({ type: 'info', text: `Uploading ${files.length} file(s) directly to GitHub...` });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      if (githubToken) {
        formData.append('githubToken', githubToken);
      }

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (err) {
        console.error('Upload failed:', err);
        failCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setStatusMessage({
        type: 'success',
        text: `Successfully uploaded ${successCount} file(s) directly to GitHub repository!`,
      });
      fetchUploads();
    } else if (failCount > 0) {
      setStatusMessage({
        type: 'error',
        text: `Failed to upload ${failCount} file(s). Please check your file format.`,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-16 px-4 sm:px-8 lg:px-16 overflow-y-auto selection:bg-foreground/20 font-sans">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Secret Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-foreground/15 pb-6">
          <div>
            <div className="flex items-center gap-2 text-foreground/40 font-mono text-[10px] uppercase tracking-[0.3em] mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Secret Asset Portal · URL Only
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-foreground">
              Direct GitHub Uploads
            </h1>
            <p className="text-xs font-mono text-foreground/50 mt-1">
              Upload high-resolution photography assets directly to <code className="text-foreground font-semibold">realkofidjan/bynk</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="flex items-center gap-2 px-3 py-1.5 border border-foreground/20 text-[10px] font-mono uppercase tracking-wider hover:bg-foreground/5 transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              {showTokenInput ? 'Hide Token' : 'Optional PAT'}
            </button>
            <button
              onClick={fetchUploads}
              className="p-2 border border-foreground/20 hover:bg-foreground/5 transition-colors"
              title="Refresh upload list"
            >
              <RefreshCw className="w-3.5 h-3.5 text-foreground/60" />
            </button>
          </div>
        </div>

        {/* Optional GitHub Token Panel */}
        <AnimatePresence>
          {showTokenInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-foreground/[0.03] border border-foreground/15 p-4 rounded-none space-y-2 overflow-hidden"
            >
              <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/60">
                GitHub Personal Access Token (Optional for Remote Web Hosting):
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="flex-1 bg-background border border-foreground/20 px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-foreground/50"
                />
                <button
                  onClick={() => setShowTokenInput(false)}
                  className="px-4 py-2 bg-foreground text-background text-xs font-mono uppercase tracking-wider font-semibold"
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  : 'bg-foreground/5 border-foreground/20 text-foreground/70'
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
                className="text-[10px] uppercase underline opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag & Drop Upload Container */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed transition-all p-10 sm:p-16 flex flex-col items-center justify-center text-center cursor-pointer ${
            dragging
              ? 'border-foreground bg-foreground/[0.05] scale-[1.01]'
              : 'border-foreground/20 bg-foreground/[0.02] hover:border-foreground/40 hover:bg-foreground/[0.03]'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />

          <div className="flex flex-col items-center space-y-4 pointer-events-none">
            <div className="p-4 rounded-full bg-foreground/5 border border-foreground/10">
              <Upload className="w-8 h-8 text-foreground/70" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-foreground font-semibold">
                {uploading ? 'Uploading assets to GitHub...' : 'Drag & Drop photos to upload'}
              </h3>
              <p className="text-xs font-mono text-foreground/50 mt-1">
                Supports JPG, PNG, WebP, AVIF, GIF · Auto-syncs directly to repository
              </p>
            </div>
            <span className="px-4 py-2 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.25em] font-semibold">
              Select Files
            </span>
          </div>
        </div>

        {/* Uploaded GitHub Files Gallery */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-foreground/10 pb-3">
            <h2 className="text-lg font-serif text-foreground flex items-center gap-2">
              <FileImage className="w-4 h-4 text-foreground/60" />
              Uploaded Repository Assets ({uploadedFiles.length})
            </h2>
            <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-widest">
              Live GitHub Raw Readers
            </span>
          </div>

          {uploadedFiles.length === 0 ? (
            <div className="text-center py-12 border border-foreground/10 bg-foreground/[0.02] text-foreground/40 font-mono text-xs">
              No files uploaded yet. Drag photos above to upload directly to GitHub.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedFiles.map((file) => (
                <div
                  key={file.filename}
                  className="border border-foreground/15 bg-background p-3 flex flex-col justify-between space-y-3 group hover:border-foreground/40 transition-colors"
                >
                  <div className="relative aspect-[4/3] bg-foreground/5 overflow-hidden">
                    <img
                      src={file.localUrl}
                      alt={file.filename}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="space-y-1 font-mono text-[11px]">
                    <p className="font-semibold text-foreground truncate" title={file.filename}>
                      {file.filename}
                    </p>
                    <div className="flex justify-between text-foreground/40 text-[9px] uppercase tracking-wider">
                      <span>{file.sizeMb} MB</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-foreground/10 space-y-1.5 font-mono text-[10px]">
                    <button
                      onClick={() => copyToClipboard(file.githubRawUrl)}
                      className="w-full py-1.5 px-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/15 flex items-center justify-between text-foreground transition-colors"
                    >
                      <span className="truncate pr-2">Copy GitHub Raw URL</span>
                      {copiedUrl === file.githubRawUrl ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                      )}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(file.localUrl)}
                        className="flex-1 py-1 px-2 border border-foreground/15 text-foreground/60 hover:text-foreground text-[9px] uppercase tracking-wider truncate text-center"
                        title="Copy Local Relative Path"
                      >
                        {copiedUrl === file.localUrl ? 'Copied!' : 'Copy Local Path'}
                      </button>
                      <a
                        href={file.githubBlobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 border border-foreground/15 text-foreground/60 hover:text-foreground flex items-center justify-center"
                        title="View on GitHub Repository"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
