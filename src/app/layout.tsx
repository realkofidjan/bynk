import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/navigation";
import { getProjects } from "@/lib/projects";
import { GlobalGalleryProvider } from "@/components/global-gallery-provider";

export const metadata: Metadata = {
  title: "bynk",
  description: "A minimalist photography portfolio showcasing visual stories through the lens.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const projects = getProjects();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        {/* Global grain overlay */}
        <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03] mix-blend-difference bg-[url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')]" />
        <Navigation />
        <GlobalGalleryProvider projects={projects}>
          {children}
        </GlobalGalleryProvider>
      </body>
    </html>
  );
}
