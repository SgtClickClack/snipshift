import multer from 'multer';
import { Request } from 'express';

// Configure multer for memory storage (files will be in req.files as buffers)
const storage = multer.memoryStorage();

// File filter:
// - Profile images: images only
// - RSA certificate uploads: image or PDF
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';

  if (file.fieldname === 'rsaCertificate') {
    if (isImage || isPdf) {
      cb(null, true);
      return;
    }
    cb(new Error('RSA certificate must be an image or PDF'));
    return;
  }

  if (isImage) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image files are allowed'));
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Middleware for handling multiple file fields (logo and banner)
export const uploadProfileImages = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'avatar', maxCount: 1 }, // Also support 'avatar' for compatibility
  { name: 'rsaCertificate', maxCount: 1 },
]);

// Middleware for single file upload (for backward compatibility)
export const uploadSingle = upload.single('file');

export default upload;

