// Vercel's CDN caches the media route's files for a short time
// (store-media-in-vercel-blob, design D3). EmDash's own Cache-Control is
// `max-age=0, must-revalidate` for images, and Vercel ignores `max-age` on
// function responses, so without this every image view is a function call
// plus a Blob read (spike D0.3).
//
// Short on purpose: a removed or replaced file, a child's photo included, can
// still be served from the CDN for up to 10 minutes (then one stale response
// while it revalidates). `vercel cache purge --type cdn` clears it at once.
// Browsers keep EmDash's Cache-Control; only Vercel's CDN reads this header.
export const MEDIA_FILE_PREFIX = '/_emdash/api/media/file/'
export const MEDIA_CDN_CACHE_CONTROL = 'max-age=600, stale-while-revalidate=3600'

export function withMediaCdnCache(path: string, method: string, response: Response): Response {
  if (!path.startsWith(MEDIA_FILE_PREFIX) || response.status !== 200) return response
  if (method !== 'GET' && method !== 'HEAD') return response
  try {
    response.headers.set('Vercel-CDN-Cache-Control', MEDIA_CDN_CACHE_CONTROL)
    return response
  } catch {
    // Immutable headers (e.g. a fetched Response): copy it.
    const copy = new Response(response.body, response)
    copy.headers.set('Vercel-CDN-Cache-Control', MEDIA_CDN_CACHE_CONTROL)
    return copy
  }
}
