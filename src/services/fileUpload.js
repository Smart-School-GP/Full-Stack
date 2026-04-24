const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const Sentry = require('@sentry/node');
const logger = require('../lib/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
 * Upload file to Cloudinary with error handling
 * Returns null on failure (doesn't throw), logs to Sentry
 */
async function uploadToCloudinary(buffer, folder, publicId) {
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
    logger.error('[FileUpload] Cloudinary upload failed', {
      error: error.message,
      folder,
      publicId,
    });
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`Cloudinary upload failed: ${error.message}`, 'warning');
    }
    return null;
  }
}

/**
 * Delete file from Cloudinary with error handling
 */
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error('[FileUpload] Cloudinary delete failed', {
      error: error.message,
      publicId,
    });
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`Cloudinary delete failed: ${error.message}`, 'warning');
    }
    return null;
  }
}

/**
 * Check if Cloudinary is configured and accessible
 */
async function checkCloudinaryStatus() {
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
