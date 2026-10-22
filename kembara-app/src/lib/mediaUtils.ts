// =============================================
// Kembara App — Media URL Detection & Embed Utilities
// Supports Images, Direct Videos (MP4/WebM), Instagram Posts/Reels, and YouTube
// =============================================

import type { MediaType, CarouselMediaItem, AgendaPhoto } from "@/types";

export interface ParsedMedia {
  type: MediaType;
  embedUrl: string;
  originalUrl: string;
  videoId?: string;
  isEmbeddable: boolean;
  thumbnailUrl?: string;
  title?: string;
}

/**
 * Extracts a clean URL from a string that might be a raw URL or an iframe embed code snippet.
 */
export function cleanMediaUrl(rawInput: string): string {
  let input = (rawInput || "").trim();
  if (!input) return "";

  // If user pasted an iframe embed code e.g. <iframe src="..." ...></iframe>
  const iframeSrcMatch = input.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    input = iframeSrcMatch[1];
  }

  return input;
}

/**
 * Parses and detects media type from URL string.
 */
export function detectMediaType(rawUrl: string): ParsedMedia {
  const url = cleanMediaUrl(rawUrl);

  if (!url) {
    return {
      type: "image",
      embedUrl: "",
      originalUrl: "",
      isEmbeddable: false,
    };
  }

  // 1. Instagram Post / Reel / Video / TV
  // Matches: instagram.com/p/ID, instagram.com/reel/ID, instagram.com/reels/ID, instagram.com/tv/ID
  const igRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;
  const igMatch = url.match(igRegex);
  if (igMatch && igMatch[1]) {
    const postId = igMatch[1];
    // Instagram embed URL format works reliably across posts and reels
    const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned/`;
    return {
      type: "instagram",
      embedUrl,
      originalUrl: url,
      videoId: postId,
      isEmbeddable: true,
      title: "Instagram Post / Reel",
    };
  }

  // 2. YouTube Video / Short / Embed
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return {
      type: "youtube",
      embedUrl,
      originalUrl: url,
      videoId,
      thumbnailUrl,
      isEmbeddable: true,
      title: "Video YouTube",
    };
  }

  // 3. Direct Video file (MP4, WEBM, OGG, MOV, M4V)
  const videoExtRegex = /\.(mp4|webm|ogg|mov|m4v)(?:\?.*)?$/i;
  if (videoExtRegex.test(url)) {
    return {
      type: "video",
      embedUrl: url,
      originalUrl: url,
      isEmbeddable: true,
      title: "Video (MP4/WebM)",
    };
  }

  // 4. Default: Standard Image
  return {
    type: "image",
    embedUrl: url,
    originalUrl: url,
    thumbnailUrl: url,
    isEmbeddable: false,
    title: "Foto / Gambar",
  };
}

/**
 * Normalizes an AgendaPhoto or Carousel item to obtain its slide list
 */
export function getPhotoSlides(photo: AgendaPhoto): CarouselMediaItem[] {
  if (photo.carousel_items && photo.carousel_items.length > 0) {
    return photo.carousel_items;
  }
  return [
    {
      id: photo.id,
      url: photo.url,
      media_type: photo.media_type || detectMediaType(photo.url).type,
      thumbnail_url: photo.thumbnail_url,
    },
  ];
}

/**
 * Returns helper boolean properties for an item
 */
export function getMediaProperties(item?: {
  url?: string;
  media_type?: MediaType;
  carousel_items?: CarouselMediaItem[];
}) {
  const isCarousel = Boolean(item?.carousel_items && item.carousel_items.length > 1);
  const slideCount = isCarousel ? item!.carousel_items!.length : 1;
  const type =
    item?.media_type || (item?.url ? detectMediaType(item.url).type : "image");
  const isVideo = type === "video";
  const isInstagram = type === "instagram";
  const isYoutube = type === "youtube";
  const isPlayable = isVideo || isInstagram || isYoutube;

  return {
    isCarousel,
    slideCount,
    type,
    isVideo,
    isInstagram,
    isYoutube,
    isPlayable,
  };
}

