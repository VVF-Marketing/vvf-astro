// Server-side paging for the lists the spec pages (7.3 children, 20 a page;
// 7.7 event archive and 7.12 articles, six a page). The page number lives in
// `?page=N`; page 1 has no parameter.

export interface Paged<T> {
  items: T[]
  page: number
  pages: number
}

// A page number out of range (or not a number) falls back to the nearest
// real page, so a stale link still shows something.
export function paginate<T>(all: T[], requested: string | number | null | undefined, perPage: number): Paged<T> {
  const pages = Math.max(1, Math.ceil(all.length / perPage))
  const n = Math.floor(Number(requested ?? 1))
  const page = Number.isFinite(n) ? Math.min(Math.max(n, 1), pages) : 1
  return { items: all.slice((page - 1) * perPage, page * perPage), page, pages }
}

// `url` with `?page=` set to `page` (removed for page 1), other parameters
// and the hash kept. Returns path + search + hash.
export function pageHref(url: URL, page: number, hash = ''): string {
  const next = new URL(url)
  if (page <= 1) next.searchParams.delete('page')
  else next.searchParams.set('page', String(page))
  const path = next.pathname.length > 1 ? next.pathname.replace(/\/$/, '') : next.pathname
  return `${path}${next.search}${hash}`
}

// A list page's alternates with its page number, so page 2 carries its own
// canonical (spec 7.12): { en: '/resources' } → { en: '/resources?page=2' }.
export function withPage<T extends Record<string, string | undefined>>(alternates: T, requested: string | null): T {
  const n = Math.floor(Number(requested))
  if (!Number.isFinite(n) || n < 2) return alternates
  return Object.fromEntries(Object.entries(alternates).map(([k, v]) => [k, v && `${v}?page=${n}`])) as T
}
