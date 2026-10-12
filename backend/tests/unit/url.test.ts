import { ErrorCode } from '../../src/utils/constants';
import { AppError } from '../../src/utils/exceptions';
import { normalizePostUrl } from '../../src/utils/url';

function errorCodeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    return err instanceof AppError ? err.code : 'NOT_APP_ERROR';
  }
  return undefined;
}

describe('normalizePostUrl', () => {
  it.each([
    'https://www.instagram.com/reel/Abc_123/',
    'https://instagram.com/reel/Abc_123',
    'http://m.instagram.com/reels/Abc_123/?igsh=tracking',
    'https://www.instagram.com/reel/Abc_123/#comments',
  ])('turns the Instagram link %s into one canonical form', (link) => {
    expect(normalizePostUrl(link, 'instagram')).toBe('https://instagram.com/reel/Abc_123');
  });

  it('keeps the post type for Instagram photo posts', () => {
    expect(normalizePostUrl('https://www.instagram.com/p/XyZ9/', 'instagram')).toBe('https://instagram.com/p/XyZ9');
  });

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://m.youtube.com/shorts/dQw4w9WgXcQ/',
  ])('turns the YouTube link %s into one canonical form', (link) => {
    expect(normalizePostUrl(link, 'youtube')).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('rejects a link from the other platform', () => {
    expect(errorCodeOf(() => normalizePostUrl('https://youtu.be/dQw4w9WgXcQ', 'instagram'))).toBe(
      ErrorCode.PLATFORM_MISMATCH,
    );
  });

  it.each([
    ['not a url', 'instagram'],
    ['https://tiktok.com/@someone/video/1', 'instagram'],
    ['https://instagram.com/', 'instagram'],
    ['https://instagram.com/some.profile', 'instagram'],
    ['https://youtube.com/@channel', 'youtube'],
    ['ftp://instagram.com/reel/Abc', 'instagram'],
  ] as const)('rejects %s', (link, platform) => {
    expect(errorCodeOf(() => normalizePostUrl(link, platform))).toBe(ErrorCode.INVALID_POST_URL);
  });
});
