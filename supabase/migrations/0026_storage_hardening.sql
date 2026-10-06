-- ============================================================================
-- Doctor Cares — 0026 · Storage bucket hardening
-- ============================================================================
-- Enforce file-size and MIME-type restrictions at the bucket level so the
-- UI's client-side checks (4 MB avatars, image-only chat attachments)
-- can't be bypassed by calling the Storage API directly.
--
-- Supabase Storage buckets accept these as bucket-level config via the
-- storage.buckets table. We tighten both buckets we use.
-- ============================================================================

-- Avatars: 4 MB cap, only JPEG/PNG/WebP/GIF. Public bucket.
update storage.buckets
   set file_size_limit    = 4 * 1024 * 1024,       -- 4 MB
       allowed_mime_types = array[
         'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
       ]
 where id = 'avatars';

-- Chat attachments: 10 MB cap, images + PDFs only (no executables).
update storage.buckets
   set file_size_limit    = 10 * 1024 * 1024,      -- 10 MB
       allowed_mime_types = array[
         'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
         'application/pdf'
       ]
 where id = 'chat-attachments';

-- Make sure neither bucket allows arbitrary MIME types going forward.
-- (NULL allowed_mime_types means "any".)
