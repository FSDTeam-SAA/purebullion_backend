import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs   from 'fs';

export const createDiskStorage = (subfolder: 'images' | 'files' | 'audio') =>
  diskStorage({
    destination: (_req, _file, cb) => {
      const folder = `uploads/${subfolder}`;
      fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      cb(null, unique);
    },
  });

// file size limits per type
export const FILE_SIZE_LIMITS = {
  audio: 200 * 1024 * 1024,   // 200MB per audio file
  image: 10  * 1024 * 1024,   // 10MB per image
};