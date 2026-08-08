import fs from 'fs';
import path from 'path';

export interface ShootImage {
  src: string;
  alt: string;
  filename: string;
}

export interface Shoot {
  slug: string;
  passcode: string;
  clientInfo: string;
  coverPhoto: string;
  images: ShootImage[];
}

export function getShoots(): Shoot[] {
  const shootsDir = path.join(process.cwd(), 'public', 'shoots');

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

      // Read passcode, client info, and cover photo from info.txt
      let passcode = '';
      let clientInfo = '';
      let coverPhoto = '';
      
      const txtFile = folderFiles.find((f) => f.toLowerCase() === 'info.txt' || f.endsWith('.txt'));
      if (txtFile) {
        const txtPath = path.join(folderPath, txtFile);
        const content = fs.readFileSync(txtPath, 'utf-8');
        const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length > 0) {
          passcode = lines[0];
        }
        if (lines.length > 1) {
          clientInfo = lines[1];
        }
        if (lines.length > 2) {
          coverPhoto = lines[2];
        }
      }

      // Filter image files
      const imageFiles = folderFiles.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return imageExtensions.includes(ext);
      });

      // Default cover photo if not specified or doesn't exist
      if (!coverPhoto || !imageFiles.includes(coverPhoto)) {
        coverPhoto = imageFiles.length > 0 ? imageFiles[0] : '';
      }

      const images: ShootImage[] = imageFiles.map((filename) => {
        return {
          filename,
          src: `/shoots/${folder.name}/${filename}`,
          alt: `${clientInfo} - ${path.parse(filename).name}`,
        };
      });

      return {
        slug: folder.name,
        passcode,
        clientInfo,
        coverPhoto: coverPhoto ? `/shoots/${folder.name}/${coverPhoto}` : '',
        images,
      };
    })
    .filter((shoot) => shoot.images.length > 0 && shoot.passcode !== '');

  return shoots;
}

export function getShootByPasscode(passcode: string): Shoot | undefined {
  const shoots = getShoots();
  return shoots.find((shoot) => shoot.passcode === passcode);
}
