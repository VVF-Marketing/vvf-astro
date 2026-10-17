// Article slugs can't take a Resources category page's path (/resources/
// stories, /financials, /news; spec 2.2 and check 2.8-8). Checked on every
// write to the CMS, from the admin, the REST API or an AI assistant over MCP
// (src/lib/emdashGuard.ts): EmDash's own save hooks don't see the slug.
export const RESERVED_ARTICLE_SLUGS = ['stories', 'financials', 'news']

export function reservedSlugError(collection: unknown, slug: unknown): string | undefined {
  if (collection !== 'articles' || typeof slug !== 'string') return undefined
  const s = slug.trim().toLowerCase()
  return RESERVED_ARTICLE_SLUGS.includes(s)
    ? `The slug "${s}" belongs to a Resources category page (/resources/${s}). Choose another slug for this article.`
    : undefined
}

// The collection and slug a CMS write sets: a REST create or update of
// /_emdash/api/content/<collection>[/<id>], or an MCP content_create /
// content_update tool call.
export function writtenSlug(path: string, method: string, body: unknown): { collection?: string; slug?: unknown } | undefined {
  const b = (body ?? {}) as Record<string, any>
  const rest = path.match(/^\/_emdash\/api\/content\/([a-z0-9_]+)(?:\/[^/]+)?$/)
  if (rest && ['POST', 'PUT', 'PATCH'].includes(method)) return { collection: rest[1], slug: b.slug }
  if (path === '/_emdash/api/mcp' && method === 'POST') {
    const calls = Array.isArray(body) ? body : [b]
    for (const c of calls) {
      const name = c?.params?.name
      if (c?.method === 'tools/call' && (name === 'content_create' || name === 'content_update')) {
        return { collection: c.params.arguments?.collection, slug: c.params.arguments?.slug }
      }
    }
  }
  return undefined
}
