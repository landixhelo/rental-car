import { useState } from "react";

type Props = {
  images: string[];
  alt: string;
  className?: string;
};

export default function ImageCarousel({ images, alt, className = "" }: Props) {
  const slides = images.length ? images : [];
  const [index, setIndex] = useState(0);
  const safeIndex = slides.length ? Math.min(index, slides.length - 1) : 0;

  if (!slides.length) {
    return <div className={`carousel empty ${className}`}>Pa foto</div>;
  }

  const current = slides[safeIndex];

  function prev() {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }

  function next() {
    setIndex((i) => (i + 1) % slides.length);
  }

  return (
    <div className={`carousel ${className}`}>
      <img src={current} alt={alt} className="carousel-image" />
      {slides.length > 1 ? (
        <>
          <button type="button" className="carousel-nav prev" onClick={prev} aria-label="Previous">
            ‹
          </button>
          <button type="button" className="carousel-nav next" onClick={next} aria-label="Next">
            ›
          </button>
          <div className="carousel-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`carousel-dot${i === safeIndex ? " active" : ""}`}
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
