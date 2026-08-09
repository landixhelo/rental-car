import { useEffect, useState } from "react";
import { useT } from "../context/LocaleContext";
import { mediaUrl } from "../lib/mediaUrl";

type Props = {
  images: string[];
  alt: string;
  className?: string;
};

export default function ImageCarousel({ images, alt, className = "" }: Props) {
  const t = useT();
  const slides = images.map(mediaUrl).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setIndex(0);
    setFailed({});
  }, [images.join("|")]);

  const safeIndex = slides.length ? Math.min(index, slides.length - 1) : 0;
  const usable = slides
    .map((src, i) => ({ src, i }))
    .filter(({ i }) => !failed[i]);

  if (!slides.length || !usable.length) {
    return (
      <div className={`carousel empty ${className}`}>{t("details.noPhoto")}</div>
    );
  }

  const currentEntry = usable.find((u) => u.i === safeIndex) || usable[0];
  const current = currentEntry.src;
  const currentIndex = currentEntry.i;

  function prev() {
    const pos = usable.findIndex((u) => u.i === currentIndex);
    const next = usable[(pos - 1 + usable.length) % usable.length];
    setIndex(next.i);
  }

  function next() {
    const pos = usable.findIndex((u) => u.i === currentIndex);
    const next = usable[(pos + 1) % usable.length];
    setIndex(next.i);
  }

  return (
    <div className={`carousel ${className}`}>
      <img
        src={current}
        alt={alt}
        className="carousel-image"
        onError={() => {
          setFailed((prev) => ({ ...prev, [currentIndex]: true }));
        }}
      />
      {usable.length > 1 ? (
        <>
          <button
            type="button"
            className="carousel-nav prev"
            onClick={prev}
            aria-label={t("labels.prev")}
          >
            ‹
          </button>
          <button
            type="button"
            className="carousel-nav next"
            onClick={next}
            aria-label={t("labels.next")}
          >
            ›
          </button>
          <div className="carousel-dots">
            {usable.map(({ i }) => (
              <button
                key={i}
                type="button"
                className={`carousel-dot${i === currentIndex ? " active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
