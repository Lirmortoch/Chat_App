import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const rootDir = path.resolve();

const avatarsDir = path.join(rootDir, 'uploads', 'avatars');
const additionalsDir = path.join(rootDir, 'uploads', 'additionals');

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(additionalsDir)) {
  fs.mkdirSync(additionalsDir, { recursive: true });
}

const storage1 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, additionalsDir); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload1 = multer({ storage: storage1 });
const upload2 = multer({ storage: storage2 });

export const uploadAvatar = upload1.single("avatar");
export const uploadChatFile = upload2.array("files");
export const uploadAnything = upload1.any();