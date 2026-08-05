import fs from 'fs';
import path from 'path';

export interface ProjectImage {
  src: string;
  alt: string;
}

export interface Project {
  slug: string;
  title: string;
  category: string;
  mtime: number;
  images: ProjectImage[];
}

function formatTitle(str: string): string {
  return str
    .replace(/^\d+[-_]?/, '') // remove leading numbers if any
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getProjects(): Project[] {
  const projectsDir = path.join(process.cwd(), 'public', 'projects');

  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  const projectFolders = entries.filter((entry) => entry.isDirectory());

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

  const projects: Project[] = projectFolders
    .map((folder) => {
      const folderPath = path.join(projectsDir, folder.name);
      const folderStats = fs.statSync(folderPath);

      const folderFiles = fs.readdirSync(folderPath);

      // Read category and main image filename from .txt file in folder
      let category = 'Photography';
      let mainImageFilename = '';
      const txtFile = folderFiles.find((f) => f.endsWith('.txt'));
      if (txtFile) {
        const txtPath = path.join(folderPath, txtFile);
        const content = fs.readFileSync(txtPath, 'utf-8');
        const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length > 0) {
          category = lines[0];
        }
        if (lines.length > 1) {
          mainImageFilename = lines[1];
        }
      }

      // Filter image files
      const imageFiles = folderFiles.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return imageExtensions.includes(ext);
      });

      // Map images with mtime to determine first uploaded image
      const imagesWithStats = imageFiles.map((filename) => {
        const filePath = path.join(folderPath, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          src: `/projects/${folder.name}/${filename}`,
          alt: formatTitle(path.parse(filename).name),
          mtime: stats.birthtimeMs || stats.mtimeMs || 0,
        };
      });

      // Sort images by creation/upload time (earliest first)
      imagesWithStats.sort(
        (a, b) => a.mtime - b.mtime || a.filename.localeCompare(b.filename)
      );

      // If a main image filename is specified on line 2 of category.txt, place it at index 0
      if (mainImageFilename) {
        const mainIndex = imagesWithStats.findIndex(
          (img) =>
            img.filename.toLowerCase() === mainImageFilename.toLowerCase() ||
            path.parse(img.filename).name.toLowerCase() === mainImageFilename.toLowerCase()
        );
        if (mainIndex > 0) {
          const [mainImage] = imagesWithStats.splice(mainIndex, 1);
          imagesWithStats.unshift(mainImage);
        }
      }

      const title = formatTitle(folder.name);

      return {
        slug: folder.name,
        title,
        category,
        mtime: folderStats.birthtimeMs || folderStats.mtimeMs || 0,
        images: imagesWithStats.map(({ src, alt }) => ({ src, alt })),
      };
    })
    .filter((project) => project.images.length > 0); // Only include projects with images

  // Sort projects by date of upload / creation time
  projects.sort((a, b) => a.mtime - b.mtime);

  return projects;
}
