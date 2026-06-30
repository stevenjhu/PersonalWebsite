import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { isR2Photo, type Photo } from "../data/photos";
import { r2DefaultSrc, r2Srcset } from "../lib/utils";

interface Props {
  photos: Photo[];
}

const STRIP_H = 260;
const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

function photoSrc(photo: Photo): string {
  return isR2Photo(photo) ? r2DefaultSrc(photo) : photo.src;
}

function PhotoSources({ photo, sizes }: { photo: Photo; sizes: string }) {
  if (!isR2Photo(photo)) return null;
  return (
    <>
      <source type="image/avif" srcSet={r2Srcset(photo, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={r2Srcset(photo, "webp")} sizes={sizes} />
    </>
  );
}

// Shortest circular offset for wrapping carousel (-half … +half)
function wrapOffset(i: number, active: number, total: number): number {
  let d = ((i - active) % total + total) % total;
  if (d > total / 2) d -= total;
  return d;
}

export default function Gallery({ photos }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const isOpen = activeIndex !== null;

  const navigate = useCallback(
    (dir: 1 | -1) =>
      setActiveIndex((i) =>
        i === null ? i : (i + dir + photos.length) % photos.length,
      ),
    [photos.length],
  );
  const close = useCallback(() => setActiveIndex(null), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "ArrowLeft") navigate(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close, navigate]);

  // Duplicate for seamless infinite loop
  const doubled = [...photos, ...photos];
  const scrollDuration = `${Math.max(photos.length * 7, 32)}s`;

  return (
    <>
      {/* ── Infinite rolling strip ── */}
      <div
        className="relative overflow-hidden py-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-label="Photo gallery — click a photo to view it"
      >
        {/* Edge vignette fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-28 bg-gradient-to-l from-bg to-transparent" />

        <div
          className="flex gap-3"
          style={{
            width: "max-content",
            animationName: "gallery-scroll",
            animationDuration: scrollDuration,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {doubled.map((photo, i) => (
            <button
              key={`strip-${i}`}
              type="button"
              onClick={() => setActiveIndex(i % photos.length)}
              aria-label={`Open photo: ${photo.alt}`}
              className="border-border bg-surface group relative flex-none overflow-hidden rounded-lg border transition-opacity duration-200 hover:opacity-75"
              style={{
                height: `${STRIP_H}px`,
                width: `${(photo.width / photo.height) * STRIP_H}px`,
              }}
            >
              <picture>
                <PhotoSources photo={photo} sizes="33vw" />
                <img
                  src={photoSrc(photo)}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </picture>
            </button>
          ))}
        </div>
      </div>

      {/* ── Cinema lightbox ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            className="fixed inset-0 z-[100]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/88"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              onClick={close}
            />

            {/* Photo track — overflow:hidden crops the adjacent photo peeks */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              {photos.map((photo, i) => {
                const offset = wrapOffset(i, activeIndex!, photos.length);
                const isCurrent = offset === 0;
                const isAdjacent = Math.abs(offset) === 1;

                return (
                  <motion.figure
                    key={i}
                    className="absolute m-0"
                    style={{
                      width: "min(58vw, 820px)",
                      pointerEvents: isCurrent || isAdjacent ? "auto" : "none",
                    }}
                    initial={isCurrent ? { scale: 0.7, opacity: 0 } : false}
                    animate={{
                      x: `${offset * 62}vw`,
                      scale: isCurrent ? 1 : 0.77,
                      filter: `blur(${isCurrent ? 0 : 7}px)`,
                      opacity: isCurrent ? 1 : isAdjacent ? 0.6 : 0,
                      zIndex: isCurrent ? 20 : 10,
                    }}
                    exit={
                      isCurrent
                        ? {
                            scale: 0.65,
                            opacity: 0,
                            transition: { duration: 0.3, ease: EASE_EXPO },
                          }
                        : {}
                    }
                    transition={{ duration: 0.55, ease: EASE_EXPO }}
                    onClick={
                      isCurrent
                        ? (e) => e.stopPropagation()
                        : isAdjacent
                          ? (e) => {
                              e.stopPropagation();
                              navigate(offset as 1 | -1);
                            }
                          : undefined
                    }
                  >
                    {/* Floating depth shadow on current photo */}
                    {isCurrent && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-4 rounded-3xl shadow-[0_48px_120px_rgba(0,0,0,0.7)]"
                      />
                    )}

                    <picture>
                      <PhotoSources
                        photo={photo}
                        sizes="(min-width: 1024px) 58vw, 90vw"
                      />
                      <img
                        src={photoSrc(photo)}
                        alt={photo.alt}
                        width={photo.width}
                        height={photo.height}
                        className="block h-auto max-h-[80vh] w-full select-none rounded-xl object-contain"
                        draggable={false}
                      />
                    </picture>

                    {isCurrent && photo.caption && (
                      <figcaption className="mt-3 text-center font-mono text-sm text-white/50">
                        {photo.caption}
                      </figcaption>
                    )}
                  </motion.figure>
                );
              })}
            </div>

            {/* Close */}
            <motion.button
              type="button"
              onClick={close}
              aria-label="Close photo viewer"
              className="absolute top-5 right-5 z-30 flex h-9 w-9 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.2 }}
            >
              <X size={18} strokeWidth={1.5} aria-hidden />
            </motion.button>

            {/* Previous */}
            {photos.length > 1 && (
              <motion.button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Previous photo"
                className="absolute left-5 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18, duration: 0.2 }}
              >
                <ChevronLeft size={22} strokeWidth={1.5} aria-hidden />
              </motion.button>
            )}

            {/* Next */}
            {photos.length > 1 && (
              <motion.button
                type="button"
                onClick={() => navigate(1)}
                aria-label="Next photo"
                className="absolute right-5 top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18, duration: 0.2 }}
              >
                <ChevronRight size={22} strokeWidth={1.5} aria-hidden />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
