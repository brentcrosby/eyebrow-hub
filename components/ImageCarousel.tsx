"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

const images = [
  { src: "/images/carousel-1.png", alt: "Carousel image 1" },
  { src: "/images/carousel-2.png", alt: "Carousel image 2" },
  { src: "/images/carousel-3.png", alt: "Carousel image 3" },
];

// [clone of last, ...real images, clone of first]
const strip = [images[images.length - 1], ...images, images[0]];

const AUTOPLAY_INTERVAL = 4000;
const WIDTH = 800;

export default function ImageCarousel() {
  // Start at index 1 (the first real image)
  const [index, setIndex] = useState(1);
  const [animated, setAnimated] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setAnimated(true);
      setIndex((i) => i + 1);
    }, AUTOPLAY_INTERVAL);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTimer]);

  // After sliding onto a clone, instantly teleport to the real counterpart
  const handleTransitionEnd = () => {
    if (index === strip.length - 1) {
      setAnimated(false);
      setIndex(1);
    } else if (index === 0) {
      setAnimated(false);
      setIndex(images.length);
    }
  };

  const prev = () => {
    setAnimated(true);
    setIndex((i) => i - 1);
    startTimer();
  };

  const next = () => {
    setAnimated(true);
    setIndex((i) => i + 1);
    startTimer();
  };

  const goTo = (i: number) => {
    setAnimated(true);
    setIndex(i + 1); // offset by 1 for the leading clone
    startTimer();
  };

  // Map strip index back to a 0-based dot index
  const dotIndex =
    index === 0
      ? images.length - 1
      : index === strip.length - 1
      ? 0
      : index - 1;

  return (
    <div className="group relative w-[800px] h-[400px] rounded-xl overflow-hidden select-none">
      {/* Sliding strip */}
      <div
        style={{
          display: "flex",
          height: "100%",
          width: `${strip.length * WIDTH}px`,
          transform: `translateX(-${index * WIDTH}px)`,
          transition: animated ? "transform 500ms ease-in-out" : "none",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {strip.map((image, i) => (
          <div key={i} className="relative flex-shrink-0" style={{ width: WIDTH, height: 400 }}>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              priority
            />
          </div>
        ))}
      </div>

      {/* Left button */}
      <button
        onClick={prev}
        aria-label="Previous image"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/70 hover:bg-white transition-all shadow-md opacity-0 group-hover:opacity-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Right button */}
      <button
        onClick={next}
        aria-label="Next image"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/70 hover:bg-white transition-all shadow-md opacity-0 group-hover:opacity-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to image ${i + 1}`}
          >
            <span
              className={`block rounded-full transition-all duration-300 ${
                i === dotIndex
                  ? "w-5 h-2 bg-white"
                  : "w-2 h-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
