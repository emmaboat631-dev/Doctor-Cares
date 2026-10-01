import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNative } from './platform';

export interface PickedImage {
  /** Blob suitable for upload to Supabase Storage. */
  blob: Blob;
  /** File extension without leading dot. */
  extension: string;
  /** MIME type. */
  contentType: string;
}

/**
 * Pick an image from the OS. On native, offers "Camera or Gallery" via
 * @capacitor/camera. On web, opens a hidden <input type="file"> and returns
 * whatever the user picked.
 *
 * Called from AvatarUploader and (later) the chat attachment button.
 */
export async function pickImage(): Promise<PickedImage | null> {
  if (isNative()) {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      correctOrientation: true,
    });
    if (!photo.base64String) return null;
    const ext = (photo.format || 'jpg').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : `image/${ext}`;
    const bytes = Uint8Array.from(atob(photo.base64String), (c) => c.charCodeAt(0));
    return { blob: new Blob([bytes], { type: contentType }), extension: ext, contentType };
  }

  // Web fallback — open a hidden file picker
  return new Promise<PickedImage | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const ext = (f.name.split('.').pop() || f.type.split('/')[1] || 'jpg').toLowerCase();
      resolve({ blob: f, extension: ext, contentType: f.type || `image/${ext}` });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
