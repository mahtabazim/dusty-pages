import { v2 as cloudinary } from "cloudinary";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const cloudinaryConfigured =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Stores an uploaded image and returns its public URL. Uses Cloudinary when
 * configured; otherwise falls back to public/uploads (dev only — files do not
 * persist on serverless hosts).
 */
export async function storeImage(
  file: File,
  folder: "covers" | "chat" | "evidence" | "avatars",
): Promise<string> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Image too large (max 8MB)");
  if (!file.type.startsWith("image/")) throw new Error("Not an image");

  const buffer = Buffer.from(await file.arrayBuffer());

  if (cloudinaryConfigured) {
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `bookbarter/${folder}`,
      resource_type: "image",
      transformation: [{ width: 1200, height: 1200, crop: "limit" }],
    });
    return result.secure_url;
  }

  console.warn("[uploads] Cloudinary not configured — using local dev storage");
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${folder}/${name}`;
}
