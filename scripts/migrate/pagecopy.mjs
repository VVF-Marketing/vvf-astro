// Step: live Spanish page copy → seed/page-copy.es.json
//
// Every copy slot declared in code (src/pages/**/_copy*.ts, src/copy/_copy.ts)
// has an English default copied from the live site. This step aligns each live
// English page with its /es counterpart (scripts/migrate/lib/align.mjs) into an
// English → Spanish table and looks up every slot default in it. Results go to
// seed/page-copy.es.json (route → key → Spanish value), which `importCopy`
// writes into the Spanish `page_copy` rows. Slots with no translation are
// listed in the migration report.
//
// Child pages are used only to translate interface text in memory; the
// committed table (snapshot/es/translations.json) is built from other pages.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { load } from 'cheerio'
import { fetchText } from './lib/http.mjs'
import { alignPages, corrected, mergeTables, translate } from './lib/align.mjs'
import { LIVE_BASE_URL, ROOT_DIR, SNAPSHOT_DIR } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'
import { sanitizeRichText, toPortableText } from './lib/richtext.mjs'
import { relativizeSameSiteLinks } from '../../src/lib/site.mjs'
import { projectPathFor } from '../../src/lib/legacyRoutes.mjs'

const GLOBAL = '_global'

// Live Spanish corrected per slot:
// - where it differs by place while the English is the same: "Contact Us" is
//   "Contacto" on the navbar button but "Contáctanos" in the live footer, and
//   the spec takes the footer's words from the live footer (VVF website
//   spec 6.3);
// - where it speaks as *usted* outside Corporate Sponsorships; the site uses
//   *tú* everywhere else (spec 8.6, rule 1).
export const SLOT_CORRECTIONS = {
  [GLOBAL]: { 'footer.link.contact': 'Contáctanos' },
  '/sponsor-a-child': { 'checklistPanel.items.7': 'Conexión contigo:', 'checklistPanel.title.4': 'Conexión contigo:' },
  '/ways-to-give': {
    'pastelCard.body': 'Muchas empresas duplican las donaciones de sus empleados. Busca a tu empleador y descúbrelo en pocos segundos.',
    'pastelCard2.body': 'Realiza tus donaciones benéficas desde tu cuenta DAF usando nuestro EIN, 88-3282100. Te ayudaremos a completar la designación.',
  },
}
export const PAGE_COPY_ES_PATH = path.join(ROOT_DIR, 'seed/page-copy.es.json')
const TRANSLATIONS_PATH = path.join(SNAPSHOT_DIR, 'es/translations.json')

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback)

// The manifests are TypeScript with extensionless imports: bundle them.
export async function loadManifests() {
  const files = (readdirSync(path.join(ROOT_DIR, 'src/pages'), { recursive: true }))
    .map((f) => f.split(path.sep).join('/'))
    .filter((f) => /(^|\/)_copy(\.detail)?\.ts$/.test(f))
    .map((f) => `src/pages/${f}`)
    .concat('src/copy/_copy.ts')
  const entry = files.map((f, i) => `export { default as m${i} } from ${JSON.stringify(path.join(ROOT_DIR, f))}`).join('\n')
  const outfile = path.join(ROOT_DIR, 'scripts/migrate/.cache/manifests.bundle.mjs')
  await build({ stdin: { contents: entry, resolveDir: ROOT_DIR, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error' })
  const mod = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)
  return Object.values(mod).flatMap((m) => (Array.isArray(m) ? m : [m]))
}

async function livePair(livePath) {
  const en = await fetchText(`${LIVE_BASE_URL}${livePath}`)
  const es = await fetchText(`${LIVE_BASE_URL}/es${livePath === '/' ? '' : livePath}`)
  return { en, es }
}

// The live privacy policy body, sanitized and converted like the English one.
function privacyBody(html) {
  const $ = load(html)
  const section = $('.claude_temp-legal_body-section .w-richtext').first().html() ?? $('.w-richtext').first().html()
  return section ? toPortableText(sanitizeRichText(section).html, 'pp') : undefined
}

export async function pageCopy() {
  const report = createSection('Spanish page copy')
  const sitemap = readJson(path.join(SNAPSHOT_DIR, 'sitemap.json'), { urls: [] })
  const children = readJson(path.join(SNAPSHOT_DIR, 'children.json'), { items: [] }).items

  const publicTables = []
  const childTables = []
  let privacyEs
  const manifests = await loadManifests()
  // Pages in the sitemap snapshot, plus any declared page route the live site
  // has (e.g. pages added there after the snapshot); others are skipped.
  const extra = manifests.map((m) => m.route).filter((r) => r.startsWith('/') && !r.includes('*') && !sitemap.urls.includes(r))
  const livePaths = [...sitemap.urls]
  for (const route of extra) {
    try {
      await livePair(route)
      livePaths.push(route)
    } catch {
      // Not on the live site (e.g. pages new to this project).
    }
  }
  // Each live page's own table, by project route: a slot is translated from
  // its own page first, so a string that differs by context (or a misaligned
  // node elsewhere) can't leak in from another page.
  const pageTables = new Map()
  for (const livePath of livePaths) {
    const { en, es } = await livePair(livePath)
    const t = alignPages(en, es)
    publicTables.push(t)
    pageTables.set(projectPathFor(livePath), t)
    if (livePath === '/privacy-policy') privacyEs = privacyBody(es)
  }
  // Template routes (/events/*) take the tables of the pages they render.
  const tablesFor = (route) => {
    if (!route.includes('*')) return pageTables.has(route) ? [pageTables.get(route)] : undefined
    const prefix = route.replace('*', '')
    const own = [...pageTables].filter(([r]) => r.startsWith(prefix) && r !== prefix.replace(/\/$/, '')).map(([, t]) => t)
    return own.length ? own : undefined
  }
  for (const c of children.slice(0, 3)) {
    const { en, es } = await livePair(new URL(c.url).pathname)
    childTables.push(alignPages(en, es))
  }
  const table = corrected(mergeTables([mergeTables(publicTables), ...childTables]))
  // The committed table must not carry child data: pages that list children
  // (Sponsor a Child, the listing) contain names and dreams.
  const childEs = readJson(path.join(SNAPSHOT_DIR, 'es/children.json'), { items: [] }).items
  const childStrings = [...children, ...childEs]
    .flatMap((c) => [c.displayName, c.dream, c.about])
    .filter((v) => typeof v === 'string' && v.trim().length > 2)
  const mentionsChild = (text) => childStrings.some((v) => text.includes(v))
  const publicTable = new Map([...corrected(mergeTables(publicTables))].filter(([en, es]) => !mentionsChild(en) && !mentionsChild(es)))
  mkdirSync(path.dirname(TRANSLATIONS_PATH), { recursive: true })
  writeFileSync(TRANSLATIONS_PATH, `${JSON.stringify(Object.fromEntries(publicTable), null, 2)}\n`)

  const out = {}
  const unmapped = []
  const noLivePage = []
  let mapped = 0
  for (const manifest of manifests) {
    const own = manifest.route === GLOBAL ? [] : tablesFor(manifest.route)
    if (!own) {
      // No live Spanish page: leave it untranslated (falls back to English)
      // rather than half-translate it from other pages' labels.
      noLivePage.push(manifest.route)
      continue
    }
    const pageTable = mergeTables([...own, table])
    for (const [key, spec] of Object.entries(manifest.slots)) {
      const format = spec.format ?? 'plain'
      if (format === 'image') continue
      let value
      if (format === 'rich') value = manifest.route === '/privacy-policy' && key === 'body' ? privacyEs : undefined
      else if (!/[A-Za-z]/.test(spec.default)) continue // numbers, symbols: same in every locale
      else if (spec.default.includes('\n')) {
        // Multi-line slots (e.g. the footer legal note) are separate text nodes live.
        const lines = spec.default.split('\n').map((l) => translate(pageTable, l))
        value = lines.every(Boolean) ? lines.join('\n') : undefined
      } else value = translate(pageTable, spec.default)
      value = SLOT_CORRECTIONS[manifest.route]?.[key] ?? value
      if (value) {
        ;(out[manifest.route] ??= {})[key] = value
        mapped++
      } else unmapped.push(`${manifest.route} \`${key}\`: ${format === 'rich' ? '(rich text)' : spec.default}`)
    }
  }
  writeFileSync(PAGE_COPY_ES_PATH, `${JSON.stringify(relativizeSameSiteLinks(withManualTranslations(out)), null, 2)}\n`)

  report.line(`Aligned ${livePaths.length} live pages with their /es versions (${publicTable.size} translated strings).`)
  report.line(`- Slots translated: ${mapped}; without a live Spanish counterpart: ${unmapped.length} (they fall back to English).`)
  if (noLivePage.length) report.line(`- Pages with no live Spanish version (left for marketing to translate): ${noLivePage.join(', ')}`)
  if (unmapped.length) report.list(unmapped)
  report.write()
  return { translated: mapped, unmapped: unmapped.length }
}

// Spanish for slots with no counterpart on the live site, written and reviewed
// by a person: { route: { key: text } }. Merged into seed/page-copy.es.json
// after alignment and never overwritten by it. Marketing can still change
// them in the CMS like any slot.
export const MANUAL_TRANSLATIONS = {
  _global: {
    'a11y.newTab': '(se abre en una pestaña nueva)',
    'contactForm.topicPlaceholder': 'Elige un tema',
    'pagination.previous': 'Anterior',
    'pagination.next': 'Siguiente',
    'pagination.status': 'Página {page} de {pages}',
    'pagination.label': 'Páginas',
    'a11y.slide': 'Mostrar elemento {n}',
    'child.carouselPrev': 'Niños anteriores',
    'child.carouselLabel': 'Más niños',
    'event.soldTab': '(AGOTADO)',
    'event.benefitsCount': '{included} de {total} beneficios',
    'notFound.heading': 'Página no encontrada',
    // Forms (spec 8.4): the live Spanish success and error messages, and the
    // validation messages in the page's language.
    'contactForm.sent': 'Hemos recibido tu mensaje. Un miembro de nuestro equipo se pondrá en contacto contigo pronto.',
    'newsletter.sent': '¡Gracias por tu interés! A partir de ahora, te mantendremos al tanto de nuestros eventos y campañas.',
    'form.required': 'Completa este campo.',
    'form.email': 'Escribe un correo electrónico válido.',
    'form.topic': 'Elige un tema.',
    'form.consent': 'Acepta la Política de privacidad para enviar tu mensaje.',
    'form.invalid': '¡Vaya! Algo salió mal al enviar el formulario.',
    'form.unavailable': 'Todavía no podemos enviar este formulario. Escríbenos a info@victoriavenezuelafoundation.org.',
    // Spec 7.12: "Financial Reports" (renamed 2026-10-07), the All filter, press cards.
    'resources.category.financials': 'Informes financieros',
    'resources.viewAll': 'Todos',
    'resources.breadcrumb': 'Recursos',
    'card.readOnOutlet': 'Leer en {outlet} ↗',
    'a11y.photoDot': 'Mostrar foto {n}',
    // The live Spanish list shows "years old" in English (a stylesheet leftover).
    // The shared earthquake appeal (from Ways to Give's live Spanish; "tu", spec 8.9).
    'appeal.text': "Los fondos recaudados en esta campaña se destinarán a la construcción del centro de apoyo permanente de VVF en La Guaira. Cuando abra sus puertas, ofrecerá alojamiento, nutrición y atención médica a 500 niños desplazados y sus familias.",
    'appeal.imageAlt': "Representación del futuro centro de apoyo de VVF en La Guaira, visto desde la calle.",
    'appeal.caption': "Así será el centro en La Guaira. El centro aún no está construido. Estas imágenes son representaciones generadas por IA.",
    'appeal.cardsLabel': "En qué se utilizará tu donativo",
    'appeal.title.1': "Alojamiento",
    'appeal.text.1': "Un lugar seguro donde alojarse para las familias cuyos hogares fueron destruidos en los terremotos de junio de 2026.",
    'appeal.imageAlt.1': "Familias llegando al patio del futuro centro de apoyo de VVF.",
    'appeal.title.2': "Atención médica",
    'appeal.text.2': "Revisiones, medicamentos y tratamiento para los niños y sus familias en el centro.",
    'appeal.imageAlt.2': "Una enfermera examina a una niña mientras su madre está sentada a su lado.",
    'appeal.title.3': "Nutrición",
    'appeal.text.3': "Comidas diarias para los niños que se alojen en el centro de apoyo de La Guaira.",
    'appeal.imageAlt.3': "Niños comiendo juntos una comida caliente en el comedor del centro.",
    'appeal.give': "Donar a la campaña",
    'appeal.learnMore': "Más información",
    'child.ageValue': '{age} años',
    // The live Spanish profile shows these in English too.
    'child.age': 'Edad',
    'child.birthday': 'Fecha de nacimiento',
    'child.gender': 'Género',
    'child.dream': 'Sueño',
    'child.gender.Male': 'Masculino',
    'child.gender.Female': 'Femenino',
    // Review of PR #28: the LinkedIn link's screen-reader name, and News (Q14).
    'team.linkedin': '{name} en LinkedIn',
    'resources.category.news': 'Noticias',
  },
  // Spec 7.1 (Home): the past-event fallback and the program cards' button.
  '/': {
    'events.pastLabel': 'Pasado',
    'events.pastButton': 'Ver lo más destacado',
    'programs.learnMore': 'Más información',
  },
  // Spec 7.3 (Meet the Children): result count and empty states.
  '/children': {
    'filters.clear': 'Borrar filtros',
    'results.count': '{count} niños',
    'results.countOne': '1 niño',
    'empty.text': 'En este momento todos los niños de nuestros programas tienen padrino. Puedes ayudar de otras formas.',
    'empty.button': 'Formas de ayudar',
  },
  // Spec 7.4 (Child Profile). The Spanish description is the live page's, with
  // the foundation named as the spec's Spanish titles and descriptions name it (8.10).
  '/children/*': {
    'seo.titleTemplate': '{name} | Apadrina a un niño | Fundación Victoria Venezuela',
    'seo.descriptionTemplate': 'Te presentamos a {name}, uno de los niños que recibe apoyo de la Fundación Victoria Venezuela en Venezuela. Descubre cómo funciona el programa de apadrinamiento.',
    'breadcrumb.list': 'Conoce a los niños',
    'about.heading': 'Sobre {name}',
    'form.title': 'Apadrina a {name} a través de Donorbox',
  },
  // News (spec 3.1, Q14): the live Spanish News page's title and description.
  '/resources/news': {
    'seo.title': 'Noticias | Recursos | Fundación Victoria Venezuela',
    'seo.description': 'Noticias y anuncios de la Fundación Victoria Venezuela sobre nuestra labor con la infancia en Venezuela.',
    'seo.titleTemplate': '{name} | Recursos | Fundación Victoria Venezuela',
  },
  // Resource pages without their own Spanish SEO title.
  '/resources/*': {
    'seo.titleFallback': '{title} | Fundación Victoria Venezuela',
  },
  // A project page (no live counterpart): the Spanish brand in its title, and
  // a Spanish description.
  '/financials-and-transparency': {
    'seo.title': 'Finanzas y transparencia | Fundación Victoria Venezuela',
    'seo.description': 'Informes de impacto anuales y trimestrales, Sello Platino de Transparencia de Candid y registro ante el IRS. Somos una 501(c)(3), Tax ID 88-3282100.',
  },
  // Spec 7.9 (Our Team): the open-seat tile's button. The live Spanish page
  // keeps both hero photo descriptions in English.
  '/our-team': {
    'openSeat.cta': 'Escríbenos',
    'hero.imageAlt': 'Voluntarios y personal de la Fundación Victoria Venezuela frente a una bandera de Venezuela durante una misión.',
    'hero.mobileImageAlt': 'Un médico ausculta con un estetoscopio el pecho de un niño en una jornada médica de la Fundación Victoria Venezuela.',
    // Team profile titles and descriptions, as on the live Spanish profiles.
    'profile.seo.title': '{name} | Nuestro equipo | Fundación Victoria Venezuela',
    'profile.seo.description': 'Te presentamos a {name}, parte del equipo de la Fundación Victoria Venezuela. Conoce su trayectoria y su labor en nuestro trabajo en Venezuela.',
  },
  // Event pages: the raised tile's line (live Spanish recap), and the
  // closed / sold-out notes (spec 7.8-2), which the live Spanish page shows
  // in English.
  '/events/*': {
    // The live Spanish event pages' brand in the title.
    'seo.titleFallback': '{title} | Fundación Victoria Venezuela',
    'recap.raisedCaption': 'Para nutrición, atención médica y educación',
    'editions.tagline': 'Historia',
    'editions.heading': 'Ediciones anteriores',
    'editions.text': 'Mira cómo fue el torneo cada año.',
    'editions.button': 'Todos los eventos',
    'registration.closed': 'Las inscripciones están cerradas. ¿Tienes preguntas? Escríbenos con los datos de contacto que aparecen más abajo.',
    'registration.soldOut': 'Las entradas están agotadas. ¿Tienes preguntas? Escríbenos con los datos de contacto que aparecen más abajo.',
  },
}

export function withManualTranslations(out, manual = MANUAL_TRANSLATIONS) {
  const merged = structuredClone(out)
  for (const [route, slots] of Object.entries(manual)) merged[route] = { ...(merged[route] ?? {}), ...slots }
  return merged
}

// Translation table for other steps (e.g. event content kept in mappers).
export function translationTable() {
  return new Map(Object.entries(readJson(TRANSLATIONS_PATH, {})))
}
