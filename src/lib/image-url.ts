/** Serve optimised formats and quality through Cloudinary's delivery transformations. */
export const optimizedUrl = (url: string | null | undefined, width = 900) =>
  url && url.includes("/image/upload/") && !url.includes("/upload/f_auto") ? url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`) : url ?? null;

/** 1200x630 crop for social sharing cards. */
export const ogImage = (url: string | null | undefined) =>
  url && url.includes("/image/upload/") ? url.replace("/image/upload/", "/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/") : url ?? null;
