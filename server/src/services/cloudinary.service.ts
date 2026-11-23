import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import multer from "multer";
import { Request } from "express";
import { env } from "../config/env";

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configure Multer memory storage
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."));
  }
};

export const uploadListingImages = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5,                  // up to 5 images per upload
  },
  fileFilter,
}).array("images", 5);

export interface UploadResult {
  secure_url: string;
  public_id: string;
}

export class CloudinaryService {
  /**
   * Upload an in-memory image buffer to Cloudinary
   */
  async uploadImageBuffer(
    buffer: Buffer,
    folder: string = "landconnect/listings"
  ): Promise<UploadResult> {
    // If running in development without live Cloudinary credentials, provide a mock fallback
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      env.CLOUDINARY_CLOUD_NAME === "your-cloud-name" ||
      !env.CLOUDINARY_API_KEY ||
      env.CLOUDINARY_API_KEY === "your-api-key"
    ) {
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      console.warn(`[CloudinaryService] Using mock upload URL for public ID: ${mockId}`);
      return {
        secure_url: `https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80#${mockId}`,
        public_id: mockId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
        },
        (error: unknown, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error || new Error("Cloudinary upload failed"));
          } else {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Delete an image from Cloudinary by public ID
   */
  async deleteImage(publicId: string): Promise<void> {
    if (
      !env.CLOUDINARY_CLOUD_NAME ||
      env.CLOUDINARY_CLOUD_NAME === "your-cloud-name" ||
      publicId.startsWith("mock_")
    ) {
      console.log(`[CloudinaryService] Mock deletion for public ID: ${publicId}`);
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`[CloudinaryService] Deleted image: ${publicId}`);
    } catch (err) {
      console.error(`[CloudinaryService] Failed to delete image ${publicId}:`, err);
    }
  }

  /**
   * Extract public ID from a Cloudinary URL
   */
  extractPublicIdFromUrl(url: string): string | null {
    try {
      if (url.includes("#mock_")) {
        return url.split("#")[1];
      }
      const parts = url.split("/upload/");
      if (parts.length < 2) return null;
      const fileWithExt = parts[1].replace(/^v\d+\//, "");
      const dotIndex = fileWithExt.lastIndexOf(".");
      return dotIndex === -1 ? fileWithExt : fileWithExt.substring(0, dotIndex);
    } catch {
      return null;
    }
  }
}

export const cloudinaryService = new CloudinaryService();
