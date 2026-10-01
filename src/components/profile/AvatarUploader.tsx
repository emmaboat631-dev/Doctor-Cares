import { useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Alert } from '@/components/ui/Alert';
import { uploadAvatar } from '@/lib/api/storage';
import { updateBaseProfile } from '@/lib/api/profile';
import { pickImage } from '@/lib/native/camera';
import { tap } from '@/lib/native/haptics';
import { cn } from '@/lib/cn';

interface Props {
  userId: string;
  name?: string | null;
  currentUrl?: string | null;
  onChange: (newUrl: string | null) => void;
}

const MAX_MB = 4;

/**
 * Circular avatar with an overlay "camera" button that opens the file picker,
 * uploads the chosen image to the `avatars` Storage bucket, patches the
 * profile's avatar_url and calls onChange with the new URL. Also supports
 * removing the current avatar.
 */
export function AvatarUploader({ userId, name, currentUrl, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const pick = async () => {
    setError(undefined);
    tap();
    let picked;
    try {
      picked = await pickImage();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      if (msg.toLowerCase().includes('cancel')) return; // user backed out — silent
      return setError(msg || 'Could not open the picker.');
    }
    if (!picked) return;

    if (picked.blob.size > MAX_MB * 1024 * 1024) {
      return setError(`Image too large — keep it under ${MAX_MB} MB.`);
    }

    setBusy(true);
    try {
      const { url } = await uploadAvatar({
        userId,
        file: picked.blob,
        extension: picked.extension,
        contentType: picked.contentType,
      });
      await updateBaseProfile(userId, { avatar_url: url });
      onChange(url);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Upload failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!currentUrl) return;
    setBusy(true);
    setError(undefined);
    try {
      await updateBaseProfile(userId, { avatar_url: null });
      onChange(null);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not remove.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar name={name} src={currentUrl ?? undefined} size="xl" className="mx-auto ring-4 ring-white dark:ring-slate-900 shadow-lg" />
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          aria-label={currentUrl ? 'Change photo' : 'Upload photo'}
          className={cn(
            'absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full',
            'bg-brand-500 text-white shadow-lg shadow-brand-500/40 border-2 border-white dark:border-slate-900',
            'transition-transform active:scale-90 hover:bg-brand-600',
            busy && 'opacity-70 cursor-not-allowed',
          )}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="font-bold text-brand-600 dark:text-brand-300 hover:underline disabled:opacity-50"
        >
          {currentUrl ? 'Change photo' : 'Upload photo'}
        </button>
        {currentUrl && (
          <>
            <span className="text-ink-muted">·</span>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </>
        )}
      </div>

      <div className="text-[10px] text-ink-muted">
        JPG, PNG, WebP or GIF · up to {MAX_MB}MB
      </div>

      {error && <Alert tone="error" className="w-full">{error}</Alert>}
    </div>
  );
}
