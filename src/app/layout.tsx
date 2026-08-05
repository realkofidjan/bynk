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
        <Navigation />
        <GlobalGalleryProvider projects={projects}>
          {children}
        </GlobalGalleryProvider>
      </body>
    </html>
  );
}
