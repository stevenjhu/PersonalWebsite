interface PhotoBase {
  width: number;
  height: number;
  alt: string;
  caption?: string;
}

/** A single static image (committed asset or any direct URL). */
export interface StaticPhoto extends PhotoBase {
  src: string;
}

/**
 * An R2-hosted photo. `base` is the URL/key without size suffix, e.g.
 * "https://img.shiqihu.com/sunset". `npm run photos` uploads
 * <base>-480.avif/.webp, <base>-960.*, <base>-1600.* and the gallery
 * builds a responsive <img srcset> from it.
 */
export interface R2Photo extends PhotoBase {
  base: string;
}

export type Photo = StaticPhoto | R2Photo;

export const PHOTO_WIDTHS = [480, 960, 1600] as const;

export function isR2Photo(photo: Photo): photo is R2Photo {
  return "base" in photo;
}

/**
 * Gallery entries. The placeholder below renders a real committed asset so the
 * section looks intentional before Cloudflare R2 is wired. Replace these with
 * R2Photo entries (just a `base`) once real photos are uploaded.
 */
export const photos: Photo[] = [
  {
    src: "/photo-placeholder.svg",
    width: 1600,
    height: 1067,
    alt: "Placeholder photograph — sample gradient until real photos are added.",
    caption: "photography · coming soon",
  },
  {
    src: "/photo-placeholder.svg",
    width: 1920,
    height: 1080,
    alt: "Placeholder — wide landscape frame, coming soon.",
    caption: "photography · coming soon",
  },
  {
    src: "/photo-placeholder.svg",
    width: 1067,
    height: 1600,
    alt: "Placeholder — portrait frame, coming soon.",
    caption: "photography · coming soon",
  },
  {
    src: "/photo-placeholder.svg",
    width: 1600,
    height: 1200,
    alt: "Placeholder — 4:3 landscape frame, coming soon.",
    caption: "photography · coming soon",
  },
  {
    src: "/photo-placeholder.svg",
    width: 1500,
    height: 1500,
    alt: "Placeholder — square frame, coming soon.",
    caption: "photography · coming soon",
  },
  {
    src: "/photo-placeholder.svg",
    width: 2400,
    height: 1350,
    alt: "Placeholder — panoramic landscape frame, coming soon.",
    caption: "photography · coming soon",
  },
  {
    src: "/photo-placeholder.svg",
    width: 1200,
    height: 1600,
    alt: "Placeholder — tall portrait frame, coming soon.",
    caption: "photography · coming soon",
  },
  {
    src: "/photo-placeholder.svg",
    width: 1800,
    height: 1200,
    alt: "Placeholder — classic 3:2 landscape frame, coming soon.",
    caption: "photography · coming soon",
  },
];
