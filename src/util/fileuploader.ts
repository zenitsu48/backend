import path from 'path';
import multer from 'multer';

const hashStorage = multer.diskStorage({
  destination: './uploads/hash',
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + '-c' + Date.now() + path.extname(file.originalname)
    );
  }
});

export const hashUploader = multer({
  storage: hashStorage,
  limits: {
    fileSize: 1024 * 1024 * 10
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.toLowerCase()) {
      return cb(new Error('Please upload a Image'));
    }
    cb(null, true);
  }
});
