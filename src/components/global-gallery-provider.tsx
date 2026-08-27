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
        className={`fixed inset-0 transition-all duration-700 ease-out ${
          isHomePage ? 'pointer-events-auto opacity-100 z-0 visible' : 'pointer-events-none opacity-0 -z-10 invisible'
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

      {/* Centered Logo with Exclusion Blend - same compositing context as gallery */}
      {isHomePage && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[5] mix-blend-difference">
          <img
            src="/logos/logo-white.svg"
            alt="Logo"
            className="w-48 sm:w-64 md:w-80 h-auto"
          />
        </div>
      )}

      {/* Main Page Children (Home / Me) - pointer-events-none so clicks hit 3D canvas only on home page */}
      <div className={isHomePage ? 'pointer-events-none' : 'pointer-events-auto'}>
        {children}
      </div>

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
