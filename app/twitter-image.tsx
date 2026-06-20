// Reuse the Open Graph card for the Twitter/X summary_large_image preview.
export { default, alt, size, contentType } from './opengraph-image';

// Route segment config must be declared in-file (can't be re-exported).
export const dynamic = 'force-static';
