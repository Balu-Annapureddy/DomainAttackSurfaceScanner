import multer from 'multer';
import { config } from '../config';

// Multer stores to memory buffer so we can validate before writing to disk
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allAllowed = [
      ...config.allowedMimeTypes.image,
      ...config.allowedMimeTypes.pdf,
      ...config.allowedMimeTypes.video,
    ];
    if (allAllowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});
