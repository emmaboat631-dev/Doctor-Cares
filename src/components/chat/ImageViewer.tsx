import { useEffect, useState } from 'react';
import { Download, X, Check } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNative } from '@/lib/native/platform';

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

/**
 * Fullscreen image viewer for chat attachments.
 *
 *   • Tap outside the image (or the ✕) to dismiss
 *   • Tap the download button:
 *       — On native (Android/iOS): fetch the image, base64-encode it, and
 *         write it to the OS Documents directory via @capacitor/filesystem.
 *         Android media scanner picks it up so it appears in the gallery.
 *       — On the web/PWA: use a hidden <a download> anchor which drops the
 *         file into the browser's Downloads folder.
 */
export function ImageViewer({ src, alt, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Esc / Android back closes the viewer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = async () => {
    setError(undefined);
    setSaving(true);
    try {
      const fileName = `doctor-cares-${Date.now()}.jpg`;

      if (isNative()) {
        // Native: fetch → base64 → Filesystem.writeFile
        const res = await fetch(src);
        const blob = await res.blob();
        const b64 = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: fileName,
          data: b64,
          directory: Directory.Documents,
        });
      } else {
        // Web: trigger browser download
        const res = await fetch(src);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 safe-top">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 active:scale-95 transition"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); download(); }}
          disabled={saving}
          aria-label="Save to gallery"
          className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/10 text-white text-sm font-bold backdrop-blur hover:bg-white/20 active:scale-95 transition disabled:opacity-60"
        >
          {saved ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {saved ? 'Saved' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Image — click doesn't propagate so it stays open */}
      <img
        src={src}
        alt={alt || 'Attachment'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg select-none"
        draggable={false}
      />

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white">
          {error}
        </div>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      // strip `data:image/xxx;base64,` prefix — Filesystem wants raw base64
      resolve(result.split(',')[1] ?? result);
    };
    reader.readAsDataURL(blob);
  });
}
