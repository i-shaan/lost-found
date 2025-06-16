import { v2 as cloudinary } from 'cloudinary';
import { logger } from "../utils/loggers"

// Configure Cloudinary
cloudinary.config({
    cloud_name: "lost-and-found-",
    api_key: "577487499671543",
    api_secret: "P1B-Vceca8vtweVv3EL9ticChHw",
});

interface CloudinaryOptions {
  folder?: string;
  transformation?: any[];
  public_id?: string;
  overwrite?: boolean;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
}

export const uploadToCloudinary = async (
  buffer: Buffer,
  options: CloudinaryOptions = {}
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'image' as const,
      folder: 'lost-found',
      ...options,
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          logger.info(`Image uploaded successfully: ${result?.public_id}`);
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Image deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw error;
  }
};

export const getCloudinaryUrl = (publicId: string, transformation?: any[]): string => {
  return cloudinary.url(publicId, {
    transformation: transformation || [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto' },
      { format: 'webp' }
    ]
  });
};

export default cloudinary;