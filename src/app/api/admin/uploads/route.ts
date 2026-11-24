import { z } from "zod";
import { AppError, ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { MAX_IMAGE_BYTES, deleteImage, uploadMealImage } from "@/lib/cloudinary";
import { readJson } from "@/lib/security/request";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/** The file goes to the server first, so type and size are checked here and the Cloudinary secret never reaches the browser. */
export const POST = adminRoute(async ({ req, admin }) => {
  await enforceRateLimit(`upload:${admin.id}`, 30, 10 * 60 * 1000);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new AppError("NO_FILE", "Choose an image to upload.", 422);
  if (file.size > MAX_IMAGE_BYTES) throw new AppError("IMAGE_TOO_LARGE", "Images must be 4 MB or smaller.", 413);
  return ok(await uploadMealImage(Buffer.from(await file.arrayBuffer())), 201);
});

/** Used to discard an image that was uploaded but never saved with a meal. Only our own folder can be deleted. */
export const DELETE = adminRoute(async ({ req }) => {
  const { publicId } = z.object({ publicId: z.string().max(300) }).strict().parse(await readJson(req));
  await deleteImage(publicId);
  return ok({ deleted: true });
});
