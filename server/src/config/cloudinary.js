import fs from 'fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import env from './env.js';

const hasCloudinaryConfig = [
  env.CLOUDINARY_CLOUD_NAME,
  env.CLOUDINARY_API_KEY,
  env.CLOUDINARY_API_SECRET,
].every((value) => typeof value === 'string' && value.trim().length > 0);

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadImageFile = async (file, options = {}) => {
  if (!file) {
    throw new Error('Image file is required.');
  }

  const fallbackLocalUrl = `http://localhost:${env.PORT}/uploads/${file.filename}`;

  if (hasCloudinaryConfig) {
    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: options.folder || env.CLOUDINARY_FOLDER || 'nfc-restaurant',
        resource_type: 'image',
        format: 'png',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });

      await fs.unlink(file.path).catch(() => {});
      return uploadResult.secure_url || uploadResult.url;
    } catch (error) {
      console.warn('Cloudinary upload failed, falling back to local storage:', error.message);
    }
  }

  return fallbackLocalUrl;
};
