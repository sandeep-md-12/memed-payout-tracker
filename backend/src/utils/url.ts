import { ErrorCode, PLATFORM_LABELS, PLATFORMS, type Platform } from './constants';
import { BadRequestError } from './exceptions';

const PLATFORM_HOSTS: Record<Platform, readonly string[]> = {
  instagram: ['instagram.com'],
  youtube: ['youtube.com', 'youtu.be'],
};

const ID = /^[\w-]+$/;

/**
 * Turns any common form of a post link into one canonical URL, so the same post can't be
 * submitted twice by formatting the link differently, and checks it belongs to `platform`.
 *
 *   https://www.instagram.com/reel/Abc123/?igsh=xyz  → https://instagram.com/reel/Abc123
 *   https://youtu.be/dQw4w9WgXcQ?t=10                → https://youtube.com/watch?v=dQw4w9WgXcQ
 *   https://m.youtube.com/shorts/dQw4w9WgXcQ         → https://youtube.com/watch?v=dQw4w9WgXcQ
 */
export function normalizePostUrl(raw: string, platform: Platform): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestError(ErrorCode.INVALID_POST_URL, 'Post link must be a full URL, like https://www.instagram.com/reel/Abc123');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BadRequestError(ErrorCode.INVALID_POST_URL, 'Post link must start with https://');
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
  const linkPlatform = PLATFORMS.find((p) => PLATFORM_HOSTS[p].includes(host));
  if (!linkPlatform) {
    throw new BadRequestError(ErrorCode.INVALID_POST_URL, 'Post link must be an Instagram or YouTube URL');
  }
  if (linkPlatform !== platform) {
    throw new BadRequestError(
      ErrorCode.PLATFORM_MISMATCH,
      `This campaign runs on ${PLATFORM_LABELS[platform]}, but the link is a ${PLATFORM_LABELS[linkPlatform]} URL`,
    );
  }

  const path = url.pathname.replace(/\/+$/, '');
  return platform === 'youtube' ? normalizeYouTube(host, path, url.searchParams) : normalizeInstagram(path);
}

function normalizeYouTube(host: string, path: string, query: URLSearchParams): string {
  let videoId: string | null = null;
  if (host === 'youtu.be') videoId = path.slice(1);
  else if (path === '/watch') videoId = query.get('v');
  else videoId = path.match(/^\/shorts\/([^/]+)$/)?.[1] ?? null;

  if (!videoId || !ID.test(videoId)) {
    throw new BadRequestError(ErrorCode.INVALID_POST_URL, 'YouTube link must point to a video or a Short');
  }
  return `https://youtube.com/watch?v=${videoId}`;
}

function normalizeInstagram(path: string): string {
  const match = path.match(/^\/(p|reel|reels|tv)\/([^/]+)$/);
  const kind = match?.[1];
  const code = match?.[2];
  if (!kind || !code || !ID.test(code)) {
    throw new BadRequestError(ErrorCode.INVALID_POST_URL, 'Instagram link must point to a post or reel');
  }
  return `https://instagram.com/${kind === 'reels' ? 'reel' : kind}/${code}`;
}
