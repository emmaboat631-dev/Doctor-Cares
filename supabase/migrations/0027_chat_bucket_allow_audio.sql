-- ============================================================================
-- Doctor Cares — 0027 · chat-attachments bucket: allow audio voice notes
-- ============================================================================
-- Migration 0026 hardened the chat-attachments bucket by restricting
-- allowed_mime_types to images + PDF only. That change silently broke
-- voice notes because the browser-recorded blobs (audio/mp4, audio/webm,
-- audio/ogg) were rejected at upload time with
--   'mime type audio/mp4 is not supported'
-- which surfaced in the chat as a generic error.
--
-- Add every container the client-side recorder picks via tryStartRecorder()
-- plus the common playback types the <audio> element may negotiate on the
-- recipient side.
-- ============================================================================

update storage.buckets
   set allowed_mime_types = array[
         -- images (unchanged)
         'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
         -- documents (unchanged)
         'application/pdf',
         -- voice notes: every mime our recorder may negotiate
         'audio/mp4', 'audio/aac', 'audio/mpeg',
         'audio/webm', 'audio/ogg',
         'audio/x-m4a'
       ]
 where id = 'chat-attachments';
