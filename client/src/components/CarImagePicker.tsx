import { useEffect, useRef, useState } from "react";
import { useT } from "../context/LocaleContext";
import { mediaUrl } from "../lib/mediaUrl";

const MAX_PHOTOS = 8;

type Props = {
  existingImages: string[];
  onExistingChange: (urls: string[]) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
};

export default function CarImagePicker({
  existingImages,
  onExistingChange,
  files,
  onFilesChange,
  imageUrl,
  onImageUrlChange,
}: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const total = existingImages.length + files.length + (imageUrl.trim() ? 1 : 0);
  const remaining = Math.max(0, MAX_PHOTOS - existingImages.length - files.length);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!incoming.length) return;
    const room = MAX_PHOTOS - existingImages.length;
    onFilesChange([...files, ...incoming].slice(0, room));
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="image-picker car-image-picker">
      <div className="car-image-picker-head">
        <strong>{t("carForm.photos")}</strong>
        <span className="muted">
          {Math.min(total, MAX_PHOTOS)}/{MAX_PHOTOS}
        </span>
      </div>
      <p className="muted car-image-picker-hint">{t("carForm.photosHint")}</p>

      <div className="car-image-picker-actions">
        <button
          type="button"
          className="btn"
          disabled={remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          {t("carForm.addPhotos")}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      <div className="image-thumbs">
        {existingImages.map((src) => (
          <div key={src} className="image-thumb">
            <img src={mediaUrl(src)} alt="" />
            <button
              type="button"
              className="btn danger"
              aria-label={t("common.delete")}
              onClick={() =>
                onExistingChange(existingImages.filter((x) => x !== src))
              }
            >
              ×
            </button>
          </div>
        ))}
        {files.map((file, i) => (
          <div key={`${file.name}-${file.size}-${i}`} className="image-thumb">
            <img src={previews[i] || ""} alt="" />
            <button
              type="button"
              className="btn danger"
              aria-label={t("common.delete")}
              onClick={() => removeFile(i)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <label className="field" style={{ display: "block", marginTop: 4 }}>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--muted)",
          }}
        >
          {t("carForm.imageUrl")}
        </span>
        <input
          placeholder="https://..."
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
        />
      </label>
    </div>
  );
}
