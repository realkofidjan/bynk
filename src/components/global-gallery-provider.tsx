'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Project } from '@/lib/projects';
import InfiniteGallery from '@/components/ui/3d-gallery-photography';
import { Lightbox } from '@/components/home-client';
import { usePathname } from 'next/navigation';

interface GalleryContextType {
  selectedProject: { project: Project; index: number } | null;
  setSelectedProject: (val: { project: Project; index: number } | null) => void;
  openProject: (index: number) => void;
}

const GalleryContext = createContext<GalleryContextType | null>(null);

export function useGallery() {
  const ctx = useContext(GalleryContext);
  return ctx;
}

export function GlobalGalleryProvider({
  projects,
  children,
}: {
  projects: Project[];
  children: ReactNode;
}) {
  const [selectedProject, setSelectedProject] = useState<{
    project: Project;
    index: number;
  } | null>(null);

  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const galleryImages = projects.map((p) => p.images[0]?.src || '');

  const handleImageClick = useCallback(
    (_image: { src: string; alt?: string }, index: number) => {
      const project = projects[index];
      if (project) setSelectedProject({ project, index });
    },
    [projects]
  );

  const openProject = useCallback(
    (index: number) => {
      const project = projects[index];
      if (project) setSelectedProject({ project, index });
    },
    [projects]
  );

  return (
    <GalleryContext.Provider
      value={{ selectedProject, setSelectedProject, openProject }}
    >
      {/* Persistent 3D Gallery Canvas - Never Unmounts across page navigation */}
      <div
        className={`fixed inset-0 z-0 transition-all duration-700 ease-out ${
          isHomePage ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-25'
        }`}
      >
        <InfiniteGallery
          images={galleryImages}
          speed={1.2}
          zSpacing={3}
          visibleCount={Math.max(projects.length, 8)}
          falloff={{ near: 0.8, far: 14 }}
          className="h-screen w-full"
          onImageClick={handleImageClick}
        />
      </div>

      {/* Main Page Children (Home / Me) - pointer-events-none so clicks hit 3D canvas */}
      <div className="relative z-10 pointer-events-none">{children}</div>

      {/* Project Lightbox */}
      {selectedProject && (
        <Lightbox
          project={selectedProject.project}
          projectIndex={selectedProject.index}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </GalleryContext.Provider>
  );
}
