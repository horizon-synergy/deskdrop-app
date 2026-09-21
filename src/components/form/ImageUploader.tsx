/**
 * ImageUploader.tsx
 * ----------------------------------------------------------------------------
 * A controlled multi-image picker: shows thumbnails of already-uploaded
 * image URLs (`value`), lets the admin add more (uploaded to Cloudinary
 * via lib/cloudinary/upload.service.ts) or remove existing ones, and
 * reports the updated URL array back via `onChange`. The component is
 * "controlled" in the React sense — it holds no image-list state of its
 * own, so it composes cleanly with React Hook Form's `Controller` or a
 * plain useState in the parent form.
 *
 * Upload is async and can fail (network error, oversized file, wrong
 * type) — errors surface inline rather than throwing, so one bad file
 * doesn't crash the surrounding form.
 */

import { useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { uploadImages, UploadServiceError } from '@/lib/cloudinary/upload.service';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
  label: string;
  /** Current list of already-uploaded image URLs. */
  value: string[];
  onChange: (urls: string[]) => void;
  /** Cloudinary folder these images should be organized under. */
  folder: string;
  error?: string;
}

export function ImageUploader({ label, value, onChange, folder, error }: ImageUploaderProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const uploadedUrls = await uploadImages(Array.from(files), folder);
      onChange([...value, ...uploadedUrls]);
    } catch (uploadFailure) {
      setUploadError(
        uploadFailure instanceof UploadServiceError
          ? uploadFailure.message
          : 'Upload failed. Please try again.',
      );
    } finally {
      setIsUploading(false);
      // Reset the input so selecting the same file again re-triggers onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeImage(urlToRemove: string): void {
    onChange(value.filter((url) => url !== urlToRemove));
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>

      <div className={styles.grid}>
        {value.map((url) => (
          <div key={url} className={styles.thumb}>
            <img src={url} alt="" className={styles.thumbImage} />
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => removeImage(url)}
              aria-label="Remove image"
            >
              <XMarkIcon width={14} height={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          className={styles.addButton}
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <PhotoIcon width={20} height={20} />
          {isUploading ? 'Uploading…' : 'Add image'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => void handleFilesSelected(e)}
      />

      {uploadError ? (
        <p className={styles.errorText} role="alert">
          {uploadError}
        </p>
      ) : null}
      {error ? (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
