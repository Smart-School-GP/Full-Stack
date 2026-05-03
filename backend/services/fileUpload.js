const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Sentry = require('@sentry/node');
const logger = require('../lib/logger');

// Configure Cloudinary only if credentials exist
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, GIF, DOC, DOCX'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter,
});

/**
 * Upload file to Local Storage
 */
async function uploadToLocal(buffer, folder, filename) {
  try {
    const uploadDir = path.join(__dirname, '..', 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = filename ? path.extname(filename) : '.png';
    const randomName = crypto.randomBytes(16).toString('hex') + ext;
    const filePath = path.join(uploadDir, randomName);

    fs.writeFileSync(filePath, buffer);

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return {
      secure_url: `${baseUrl}/uploads/${folder}/${randomName}`,
      public_id: randomName,
    };
  } catch (error) {
    logger.error('[FileUpload] Local upload failed', { error: error.message, folder });
    return null;
  }
}

/**
 * Upload file to Cloudinary with fallback to Local Storage
 */
async function uploadToCloudinary(buffer, folder, publicId, originalFilename) {
  // If Cloudinary is not configured, fallback to local storage immediately
  if (!isCloudinaryConfigured) {
    logger.info('[FileUpload] Cloudinary not configured, falling back to local storage');
    return uploadToLocal(buffer, folder, originalFilename);
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
    return result;
  } catch (error) {
    logger.warn('[FileUpload] Cloudinary upload failed, attempting local fallback', {
      error: error.message,
      folder,
    });
    // Fallback to local storage on Cloudinary failure
    return uploadToLocal(buffer, folder, originalFilename);
  }
}

/**
 * Delete file (stub for local, functional for Cloudinary)
 */
async function deleteFromCloudinary(publicId) {
  if (!isCloudinaryConfigured) return { result: 'ok (local delete not fully implemented)' };
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error('[FileUpload] Cloudinary delete failed', { error: error.message, publicId });
    return null;
  }
}

async function checkCloudinaryStatus() {
  if (!isCloudinaryConfigured) return false;
  try {
    await cloudinary.api.ping();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  checkCloudinaryStatus,
  cloudinary,
};
