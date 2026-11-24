import { v2 as cloudinary } from "cloudinary";
import { AppError } from "@/lib/api";

const FOLDER = "doveeys-kitchen/meals";
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit

function configure() {
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
  if (!cloud_name || !api_key || !api_secret) throw new AppError("UPLOADS_NOT_CONFIGURED", "Image uploads are not configured. Set the Cloudinary environment variables.", 503);
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

/** Detect the real format from the file's bytes, not from the client-supplied type or filename. */
export function sniffImage(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export async function uploadMealImage(buf: Buffer) {
  configure();
  if (buf.length > MAX_IMAGE_BYTES) throw new AppError("IMAGE_TOO_LARGE", "Images must be 4 MB or smaller.", 413);
  if (!sniffImage(buf)) throw new AppError("INVALID_IMAGE", "Upload a JPEG, PNG or WebP image.", 415);
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: FOLDER, resource_type: "image", allowed_formats: ["jpg", "png", "webp"], overwrite: false }, (err, res) => {
      if (err || !res) return reject(new AppError("UPLOAD_FAILED", "The image could not be uploaded. Try again.", 502));
      resolve({ url: res.secure_url, publicId: res.public_id });
    }).end(buf);
  });
}

/** Only deletes assets inside our own folder, so a forged id cannot remove unrelated images. */
export async function deleteImage(publicId: string | null | undefined) {
  if (!publicId || !publicId.startsWith(`${FOLDER}/`)) return;
  try { configure(); await cloudinary.uploader.destroy(publicId); } catch (e) { console.error("[cloudinary] delete failed", e); }
}

export { optimizedUrl, ogImage } from "@/lib/image-url";
