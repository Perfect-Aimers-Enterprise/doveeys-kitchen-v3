# Cloudinary

Uploads go to `POST /api/admin/uploads` (multipart `file`). The server checks the **real format from the file bytes** (JPEG, PNG, WebP), a 4 MB limit (below Vercel's 4.5 MB request limit), a rate limit, then uploads to folder `doveeys-kitchen/meals`. The API secret never reaches the browser. `DELETE /api/admin/uploads` only deletes inside that folder. Meals store `imageUrl` and `imagePublicId`; replacing or removing an image deletes the old asset. The storefront receives optimised URLs (`f_auto,q_auto`, width-limited) and 1200x630 crops for social cards.
