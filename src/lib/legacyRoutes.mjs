// Live Webflow paths → this project's routes. Single source for the
// redirects (astro.config.mjs; 301 unless listed in TEMPORARY_REDIRECTS),
// page SEO lookup (scripts/migrate) and the sitemap coverage test
// (e2e/sitemap.spec.ts). Paths not listed are the same on both sites.
// Webflow's own 301 list (exported 2026-10-14, spec 2.6), each pointing
// straight at today's page. Redirects to child profiles aren't here: their
// old addresses carry children's full names, so they live in EmDash's
// redirects table (scripts/migrate/redirects.mjs).
export const WEBFLOW_REDIRECTS = {
  '/annual-report-2022': '/resources/annual-report-2022',
  '/annual-report-2023': '/resources/annual-report-2023',
  '/annual-report-2025': '/resources/impact-report-2025',
  '/apadrinar-a-un-nino': '/es/children',
  '/apadrinar-a-un-nino/page/2': '/es/children',
  '/artistas-y-influenciadores': '/es',
  '/author-sitemap.xml': '/sitemap.xml',
  '/author/adminvic': '/resources',
  '/author/adminvic/page/2': '/resources',
  '/author/enriquepaulainc-ca': '/resources',
  '/beta-1': '/events/2026-golf-tournament',
  '/campaign': '/ways-to-give',
  '/categories/financials': '/resources/financials',
  '/categories/news': '/resources',
  '/categories/stories': '/resources/stories',
  '/category-sitemap.xml': '/sitemap.xml',
  '/category/reportes': '/es/resources/financials',
  '/category/sin-categoria': '/es/resources',
  '/christmas-celebration-2022': '/resources',
  '/conectate': '/es/contact',
  '/contacto': '/es/contact',
  '/contribucion-de-companias': '/es/corporate-sponsorships',
  '/corporate-partnerships': '/corporate-sponsorships',
  '/donacion-fallida': '/es/ways-to-give',
  '/donaciones-mensuales': '/es/ways-to-give',
  '/donar-ahora': '/es/ways-to-give',
  '/donate': '/ways-to-give',
  '/donate3': '/ways-to-give',
  '/donations': '/ways-to-give',
  '/donations/formulario-de-donaciones': '/es/ways-to-give',
  '/donde-servimos': '/es',
  '/donor-advised-funds': '/ways-to-give',
  '/en': '/',
  '/es/all-events': '/es/events-and-campaigns',
  '/es/categories/financials': '/es/resources/financials',
  '/es/categories/news': '/es/resources',
  '/es/categories/stories': '/es/resources/stories',
  '/escritorio-del-donante': '/es/ways-to-give',
  '/event-category/evento': '/es/events-and-campaigns',
  '/event-sitemap.xml': '/sitemap.xml',
  '/event_category-sitemap.xml': '/sitemap.xml',
  '/evento': '/es/events-and-campaigns',
  '/evento/annual-golf-charity-tournament-2026': '/events/2026-golf-tournament',
  '/evento/charity-golf-tournament': '/events/2025-golf-tournament',
  '/evento/programa-de-atencion-medica': '/es/sponsor-a-child',
  '/evento/programa-de-nutricion': '/es/sponsor-a-child',
  '/evento/programa-educativo': '/es/sponsor-a-child',
  '/eventos': '/es/events-and-campaigns',
  '/eventos-y-campanas': '/es/events-and-campaigns',
  '/gabriel-leal': '/our-team',
  '/give_forms-sitemap.xml': '/sitemap.xml',
  '/golf': '/events/2026-golf-tournament',
  '/helen-bello': '/our-team/helen-bello',
  '/home': '/',
  '/impact-results': '/resources/impact-report-2025',
  '/jessica-alvarado': '/our-team',
  '/johnny-yataco': '/our-team/johnny-yataco',
  '/lara-bersano-calot': '/our-team',
  '/mision-y-vision': '/es',
  '/mission-visit-to-venezuela-march-2024': '/resources',
  '/newsletter': '/resources',
  '/newsletter-2': '/resources',
  '/nosotros': '/es/our-team',
  '/nuestro-compromiso': '/es',
  '/nuestro-equipo': '/es/our-team',
  '/nuestro-trabajo': '/es',
  '/omhlzgf62gf6digpjemj4n-victoria-venezuela-golf-eventnode-id51-145t7gtmgjph9nn708jb-1scalingmin-zoomcontent-scalingfixedpage-id03a1': '/events/2026-golf-tournament',
  '/ora-con-nosotros': '/es',
  '/page-sitemap.xml': '/sitemap.xml',
  '/pagina-temporal-golf-beta-1': '/es/events/2026-golf-tournament',
  '/post-sitemap.xml': '/sitemap.xml',
  '/press-releases': '/resources',
  '/randy-lander': '/our-team/randy-lander',
  '/resources-categories/resources-list': '/resources',
  '/sitemap_index.xml': '/sitemap.xml',
  '/sponsor': '/children',
  '/sponsor-a-child-program': '/sponsor-a-child',
  '/sponsor-a-child-↗': '/sponsor-a-child',
  '/sponsor-sitemap.xml': '/sitemap.xml',
  '/stephanie-medina': '/our-team',
  '/testimonios': '/es',
  '/thank-you': '/',
  '/torneo-de-golf': '/es/events/2026-golf-tournament',
  '/vanessa-sanchez': '/our-team/vanessa-sanchez',
  '/wp-content/uploads/2023/08/FVV-Annual-Report-2022.pdf': '/resources/annual-report-2022',
  '/wp-content/uploads/2023/08/NOTA-DE-PRENSA-December-10-2022.docx.pdf': '/es/resources',
  '/wp-content/uploads/2023/10/Victoria-Venezuela-Foundation_3Q23_Your-Impact-Oct-2023.pdf': '/resources/your-impact-3q2023',
  '/wp-content/uploads/2024/01/Victoria-Venezuela-Foundation-Annual-Report-2023.pdf': '/resources/annual-report-2023',
  '/wp-content/uploads/2024/03/Victoria-Venezuela-Foundation_2Q23_Your-Impact-Jul-2023.pdf': '/resources/your-impact-2q2023',
  '/wp-content/uploads/2024/03/Victoria-Venezuela-Foundation_Venezuela-Visit-March-2024.pdf': '/resources',
  '/wp-content/uploads/2024/04/Victoria-Venezuela-Foundation_1Q24_Your-Impact-Apr-2024.pdf': '/resources/your-impact-1q2024',
  '/wp-content/uploads/2024/07/Victoria-Venezuela-Foundation_2Q24_Your-Impact-Jul-2024.pdf': '/resources/your-impact-2q2024',
  '/wp-content/uploads/2024/10/Victoria-Venezuela-Foundation_3Q24_Your-Impact-Oct-2024.pdf': '/resources/your-impact-3q2024',
  '/wp-content/uploads/2024/11/Victoria-Venezuela-Foundation_Sponsor-a-Child-Program-Nov-2024.pdf': '/sponsor-a-child',
  '/wp-content/uploads/2025/01/Golf-Classic-Sponsorship-Package-live.pdf': '/events/2026-golf-tournament',
  '/wp-content/uploads/2025/05/Victoria-Venezuela-Foundation_1Q25_Your-Impact-April-2025.pdf': '/resources/your-impact-1q2025',
  '/your-impact-1q2024': '/resources/your-impact-1q2024',
  '/your-impact-1q2025': '/resources/your-impact-1q2025',
  '/your-impact-2q2024': '/resources/your-impact-2q2024',
  '/your-impact-2q23': '/resources/your-impact-2q2023',
  '/your-impact-3q2024': '/resources/your-impact-3q2024',
  '/your-impact-3q23': '/resources/your-impact-3q2023',
}

export const STATIC_REDIRECTS = {
  ...WEBFLOW_REDIRECTS,
  // Live Webflow paths (spec 2.6): one 301 straight to the spec's URL map.
  '/all-events': '/events-and-campaigns',
  '/sponsor-a-child-list-page': '/children',
  '/resources-categories/all': '/resources',
  '/resources-categories/stories': '/resources/stories',
  '/resources-categories/financials-transparency': '/resources/financials',
  '/resources-categories/news': '/resources/news',
  // Empty placeholder profile on live; its "Board seat open" card links to
  // the contact page, so the old URL goes there too.
  '/team-members/join-our-board': '/contact',
  // Old WordPress news paths go to the Spanish News page (spec 2.6).
  '/noticias': '/es/resources/news',
  '/category/noticias': '/es/resources/news',
  '/en/noticias': '/es/resources/news',
  '/en/category/noticias': '/es/resources/news',
  // The blog is gone (Q4 on the spec card): each post goes to its
  // counterpart, and anything else under /blog to Resources.
  '/blog': '/resources',
  '/blog/how-to-sponsor-a-child-directly': '/resources/how-to-sponsor-a-child-directly',
  '/blog/golf-tournament-2025-recap': '/events/2025-golf-tournament',
  '/blog/fiscal-2025-transparency-report': '/resources/impact-report-2025',
  // This project's earlier paths (before the spec's URL map).
  '/events': '/events-and-campaigns',
  '/sponsor-a-child/children': '/children',
  '/earthquake-relief': '/venezuela-earthquake-relief',
  '/resources/category/stories': '/resources/stories',
  '/resources/category/financials-transparency': '/resources/financials',
}

// Redirects that stand in for a page not built yet: 302, so browsers and
// search engines don't remember them once the page exists. (The financials
// page's stand-in was one; the page is built now.)
export const TEMPORARY_REDIRECTS = new Set()

export function redirectStatus(from) {
  return TEMPORARY_REDIRECTS.has(from.replace(/\/$/, '') || '/') ? 302 : 301
}

// Dynamic patterns, in Astro redirect syntax.
export const DYNAMIC_REDIRECTS = {
  // Webflow pattern: the old WordPress list pages. (/en/(.*) → /%1 is in
  // src/middleware.ts: Astro can't carry a rest parameter into a redirect.)
  '/sponsor/page/[...page]': '/children',
  '/blog/[...slug]': '/resources',
  '/team-members/[slug]': '/our-team/[slug]',
  '/sponsor-a-child/children/[slug]': '/children/[slug]',
}

// Resolve a live path to its project path (identity when unchanged).
export function projectPathFor(livePath) {
  const path = livePath.replace(/\/$/, '') || '/'
  if (STATIC_REDIRECTS[path]) return STATIC_REDIRECTS[path]
  for (const [from, to] of Object.entries(DYNAMIC_REDIRECTS)) {
    const prefix = from.replace(/\[[^\]]+\]$/, '')
    if (path.startsWith(prefix) && !path.slice(prefix.length).includes('/')) {
      return to.replace(/\[[^\]]+\]$/, path.slice(prefix.length))
    }
  }
  return path
}
