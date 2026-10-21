// Mapped content → the site's content model (src/lib/contentModel.mjs, the
// VVF website spec's Appendix B). The mappers (mappers.mjs) read the live
// site into the earlier collections; this step reshapes them into the spec's
// types, in English and Spanish (spec 4.4 mapping table), so `npm run seed`
// builds the model the site reads. Pure: content in, content out.
import { DONORBOX_CAMPAIGNS, DONORBOX_SETTINGS, MODEL_COLLECTIONS, RETIRED_COLLECTIONS } from '../../src/lib/contentModel.mjs'

const REF = '$ref:'
const ref = (id) => `${REF}${id}`
const unref = (v) => (typeof v === 'string' && v.startsWith(REF) ? v.slice(REF.length) : v)

// Shared (non-translatable) fields per type: Spanish rows get them from the
// English row so every row is complete.
const SHARED = Object.fromEntries(
  MODEL_COLLECTIONS.map((c) => [c.slug, c.fields.filter((f) => f.translatable === false).map((f) => f.slug)])
)

// Plain text → Portable Text paragraphs.
export function toPortableText(text, keyPrefix = 'p') {
  if (!text) return undefined
  if (Array.isArray(text)) return text
  return String(text)
    .split(/\n{2,}/)
    .map((para, i) => ({
      _type: 'block',
      _key: `${keyPrefix}${i}`,
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: `${keyPrefix}${i}s`, text: para.trim(), marks: [] }],
    }))
}

// A bulleted Portable Text list.
function bullets(items, keyPrefix) {
  if (!items?.length) return undefined
  return items.map((text, i) => ({
    _type: 'block',
    _key: `${keyPrefix}${i}`,
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    markDefs: [],
    children: [{ _type: 'span', _key: `${keyPrefix}${i}s`, text, marks: [] }],
  }))
}

const plain = (blocks) =>
  (blocks ?? []).map((b) => (b.children ?? []).map((c) => c.text ?? '').join('')).filter(Boolean)

// Program bullets (bold time, then text) → [{ time, text }] (spec 4.4).
export function programRows(blocks) {
  return (blocks ?? [])
    .filter((b) => b._type === 'block')
    .map((b) => {
      const spans = b.children ?? []
      const bold = spans.filter((s) => (s.marks ?? []).includes('strong')).map((s) => s.text).join('').trim()
      const rest = spans.filter((s) => !(s.marks ?? []).includes('strong')).map((s) => s.text).join('').trim()
      if (bold) return { time: bold.replace(/[:\s–-]+$/, ''), text: rest.replace(/^[:\s–-]+/, '') }
      const m = rest.match(/^(\d{1,2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?(?:\s*[–-]\s*\d{1,2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)?)\s*[:–-]?\s*(.*)$/i)
      return m ? { time: m[1].trim(), text: m[2].trim() } : { time: '', text: rest }
    })
    .filter((r) => r.text)
}

const isEs = (e) => e.locale === 'es'
const byId = (entries) => new Map(entries.map((e) => [e.id, e]))

// Map each entry (and its Spanish translation) of an old collection.
function mapRows(entries = [], idOf, dataOf, collection) {
  const en = entries.filter((e) => !isEs(e))
  const enById = byId(en)
  const out = []
  for (const e of entries) {
    const base = isEs(e) ? enById.get(e.translationOf) : e
    if (!base) continue
    const id = idOf(base)
    const data = dataOf(e.data, base.data, isEs(e), base)
    if (!data) continue
    const row = { id: isEs(e) ? `${id}--es` : id, ...(base.slug ? { slug: e.slug ?? base.slug } : {}), status: e.status ?? 'published', data }
    if (isEs(e)) Object.assign(row, { locale: 'es', translationOf: id })
    out.push(row)
  }
  return fillShared(out, collection)
}

function fillShared(rows, collection) {
  const shared = SHARED[collection] ?? []
  const en = byId(rows.filter((r) => !r.locale))
  for (const r of rows.filter((r) => r.locale)) {
    const base = en.get(r.translationOf)
    if (!base) continue
    for (const k of shared) if (base.data[k] !== undefined) r.data[k] = base.data[k]
  }
  return rows
}

const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null))

const today = () => new Date().toISOString()

// Content-specific facts the live site doesn't expose in its HTML; each is
// the value the live page shows today (spec 4.4: "migrate as they are").
const EVENT_FACTS = {
  '2026-golf-tournament': { featured: true, previous_editions: ['event-2025-golf-tournament'] },
  '2025-golf-tournament': { featured: true, next_edition: 'event-2026-golf-tournament' },
}

// Impact figures typed on the pages today (spec 4.4: `site_fact` value,
// label and detail come from the pages, in the words of the Home stat cards,
// the Corporate Sponsorships cards and the "Where your money goes" line;
// period and source are for VVF to confirm, so they say so until then).
const SITE_FACTS = [
  { key: 'meals_served', value: '77,300+', en: ['Meals served', 'Nutrition reaching hungry children daily'], es: ['Comidas servidas', 'Nutrición diaria para niños con hambre'] },
  { key: 'medical_visits', value: '1,012+', en: ['Medical visits for children', 'Health restored through our clinics'], es: ['Consultas médicas para niños', 'Salud recuperada en nuestras clínicas'] },
  { key: 'children_in_programs', value: '1000+', en: ['Children in programs', 'Education opening doors to tomorrow'], es: ['Niños en nuestros programas', 'Educación que abre puertas al futuro'] },
  { key: 'children_in_education', value: '99', en: ['Children with educational support'], es: ['Niños con apoyo educativo'] },
  { key: 'corporate_sponsors', value: '41+', en: ['Corporate sponsors', 'Partners believing in this mission'], es: ['Patrocinadores corporativos', 'Aliados que creen en esta misión'] },
  { key: 'program_share', value: '95%', en: ['of funds went directly to programs', 'In fiscal 2025'], es: ['de los fondos se destinó directamente a nuestros programas', 'En el año fiscal 2025'] },
]
const PERIOD_PENDING = { en: 'To be confirmed by VVF', es: 'Pendiente de confirmación por VVF' }

// Descriptions are the live category pages' meta descriptions (spec 7.12:
// a category page's description is its category's).
const CATEGORIES = [
  {
    slug: 'stories',
    en: ['Stories', 'Stories from our nutrition, medical care and education programs for children in Venezuela.'],
    es: ['Historias', 'Historias de nuestros programas de nutrición, atención médica y educación para niños en Venezuela.'],
  },
  {
    slug: 'financials',
    en: ['Financial Reports', 'Our annual and quarterly impact reports, with condensed financials. Victoria Venezuela Foundation is a 501(c)(3), EIN 88-3282100.'],
    es: ['Informes financieros', 'Nuestros informes de impacto anuales y trimestrales, junto con estados financieros resumidos. La Fundación Victoria Venezuela es una organización 501(c)(3), EIN 88-3282100.'],
  },
  { slug: 'news', en: ['News', 'News and press coverage about the foundation.'], es: ['Noticias', 'Noticias y cobertura de prensa sobre la fundación.'] },
]

/**
 * @param {Record<string, any[]>} content  mapped content (earlier collections)
 * @returns {Record<string, any[]>} content with the model's collections
 */
// Placeholder for the open-seat record's required photo; the tile shows no photo.
const OPEN_SEAT_PHOTO = { provider: 'external', id: 'static-4e21b6fc-placeholder-image.png', src: '/images/pages/4e21b6fc-placeholder-image.png', alt: '', mimeType: 'image/png', filename: '4e21b6fc-placeholder-image.png' }

export function toContentModel(content) {
  const out = Object.fromEntries(Object.entries(content).filter(([k]) => !RETIRED_COLLECTIONS.includes(k) && !MODEL_COLLECTIONS.some((c) => c.slug === k)))
  const packages = (content.sponsorship_packages ?? []).filter((e) => !isEs(e) || true)
  const packageById = byId(packages.filter((e) => !isEs(e)))

  // --- Donorbox campaigns (spec 8.1): today's three IDs, stored once ---
  out[DONORBOX_SETTINGS.slug] = [
    {
      id: 'donorbox-settings',
      status: 'published',
      data: { general_donation: DONORBOX_CAMPAIGNS.general, earthquake_relief: DONORBOX_CAMPAIGNS.earthquake, child_sponsorship: DONORBOX_CAMPAIGNS.sponsorship },
    },
  ]

  // --- Partners (sponsors) ---
  const partnerId = (sponsorId) => sponsorId.replace(/^sponsor-/, 'partner-')
  out.partners = mapRows(
    content.sponsors,
    (e) => partnerId(e.id),
    (d, en) =>
      drop({
        name: d.name ?? en.name,
        logo: en.logo,
        // The live site links logos without a website to "#" (spec 7.1: no link).
        website_url: en.website && en.website !== '#' ? en.website : undefined,
        partner_type: 'corporate_sponsor',
        display_order: en.order,
        // Every partner shown on the general strips today stays on (spec 4.4).
        active: Boolean(en.partner),
      }),
    'partners'
  )

  // --- Event offers (event packages) and corporate tiers ---
  const eventPackages = packages.filter((e) => (isEs(e) ? packageById.get(e.translationOf)?.data.scope : e.data.scope) !== 'general')
  const offerId = (pkgId) => pkgId.replace(/^sp-/, 'offer-')
  const KIND = { ticket: 'ticket', package: 'package', special: 'special_opportunity' }
  out.event_offers = mapRows(
    eventPackages,
    (e) => offerId(e.id),
    (d, en, es, base) =>
      drop({
        name: d.tier_name ?? en.tier_name,
        short_name: d.short_name ?? undefined,
        kind: KIND[en.kind] ?? 'package',
        price: en.price,
        includes: bullets(d.benefits ?? en.benefits, `${base.id}-i`),
        button_label: d.cta_label ?? undefined,
        button_link: en.cta_url || undefined,
        sold_out: Boolean(en.sold_out),
        sort_order: en.order,
      }),
    'event_offers'
  )
  // Corporate Sponsorships tiers: page content (spec 7.6), kept as a collection
  // until that page is rebuilt.
  out.corporate_tiers = packages.filter((e) => (isEs(e) ? packageById.get(e.translationOf)?.data.scope : e.data.scope) === 'general')

  // --- FAQs ---
  const SHOWS_ON = { sponsorship: ['sponsor_a_child'], donation: ['ways_to_give'], general: [], tournament: [] }
  out.faqs = mapRows(
    content.faqs,
    (e) => e.id,
    (d, en, es, base) => drop({ question: d.question, answer: toPortableText(d.answer, `${base.id}-a`), shows_on: SHOWS_ON[en.category] ?? [], sort_order: en.order }),
    'faqs'
  )
  const tournamentFaqs = (content.faqs ?? []).filter((e) => !isEs(e) && e.data.category === 'tournament').sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)).map((e) => e.id)

  // --- Events, benefit rows ---
  const events = content.events ?? []
  const enEvents = byId(events.filter((e) => !isEs(e)))
  out.benefit_rows = []
  const SECTION = (s = '') => {
    const t = s.toLowerCase()
    if (/player|jugador/.test(t)) return 'players'
    if (/pre/.test(t)) return 'pre_event'
    if (/post/.test(t)) return 'post_event'
    return 'event'
  }
  for (const e of events) {
    const base = isEs(e) ? enEvents.get(e.translationOf) : e
    if (!base) continue
    const offerIds = (base.data.sponsor_packages ?? []).map((r) => offerId(unref(r)))
    const packageOffers = offerIds.filter((id) => (packageById.get(id.replace(/^offer-/, 'sp-'))?.data.kind ?? 'package') === 'package')
    ;(e.data.benefit_rows ?? base.data.benefit_rows ?? []).forEach((row, i) => {
      const id = `benefit-${base.slug}-${i + 1}`
      const values = Object.fromEntries(
        packageOffers.map((oid, j) => {
          const v = String(row.values?.[j] ?? '').trim()
          return [oid, /^(yes|sí|si|✓|✔)$/i.test(v) ? { check: true } : v ? { text: v } : {}]
        })
      )
      const data = { name: row.name, section: SECTION(base.data.benefit_rows?.[i]?.section ?? row.section), values, sort_order: i + 1 }
      out.benefit_rows.push(isEs(e) ? { id: `${id}--es`, status: 'published', locale: 'es', translationOf: id, data } : { id, status: 'published', data })
    })
  }
  fillShared(out.benefit_rows, 'benefit_rows')

  out.events = mapRows(
    events,
    (e) => e.id,
    (d, en, es, base) => {
      const upcoming = String(en.start_date) >= today()
      const facts = EVENT_FACTS[base.slug] ?? {}
      const offers = (en.sponsor_packages ?? []).map((r) => offerId(unref(r)))
      const ticketPrices = offers
        .map((id) => packageById.get(id.replace(/^offer-/, 'sp-'))?.data)
        .filter((p) => p?.kind === 'ticket')
        .map((p) => Number(String(p.price ?? '').replace(/[^0-9.]/g, '')))
        .filter((n) => n > 0)
      const stats = d.recap_stats ?? en.recap_stats ?? []
      const raised = stats.find((s) => /raised|recaudad/i.test(s.heading ?? ''))
      const city = String(en.address ?? '').match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d{5}/)
      return drop({
        name: d.title ?? en.title,
        lifecycle: upcoming ? 'upcoming' : 'past',
        registration: upcoming ? 'open' : 'closed',
        featured: facts.featured ?? false,
        event_type: 'fundraiser',
        start: en.start_date,
        summary: d.description ?? en.description,
        description: d.long_description ?? toPortableText(d.hero_body ?? d.description ?? en.description, `${base.id}-d`),
        program: programRows(d.program ?? en.program),
        whats_included: d.includes ?? en.includes,
        hero_photo: en.hero_image ?? en.image,
        hero_photo_phone: en.hero_image_mobile,
        card_photo: en.card_image,
        share_image: en.social_image,
        venue_name: d.venue ?? en.venue,
        venue_address: en.address ?? en.location,
        city: city?.[1] ?? en.location,
        state: city?.[2] ?? (en.location ? 'FL' : undefined),
        contact_email: en.contact_email,
        contact_phone: en.contact_phone,
        registration_url: en.donorbox_event_id ? `https://donorbox.org/events/${en.donorbox_event_id}/steps/choose_tickets` : undefined,
        tickets_from: ticketPrices.length ? Math.min(...ticketPrices) : undefined,
        offers: offers.length ? offers : undefined,
        benefit_rows: (en.benefit_rows ?? []).map((_, i) => `benefit-${base.slug}-${i + 1}`),
        auction_items: en.auction_items ?? undefined,
        sponsors: (en.sponsors ?? []).map((r) => partnerId(unref(r))),
        faqs: upcoming ? tournamentFaqs : undefined,
        meta_description: d.seo_description ?? undefined,
        recap_headline: upcoming ? undefined : (d.hero_heading ?? undefined),
        recap_summary: upcoming ? undefined : (d.hero_body ?? undefined),
        amount_raised: upcoming ? undefined : raised?.number,
        stats: upcoming ? undefined : stats.filter((s) => s !== raised).slice(0, 3).map((s) => drop({ value: s.number, label: s.heading, caption: s.label })),
        gallery: en.gallery,
        previous_editions: facts.previous_editions,
        next_edition: facts.next_edition,
        appeal_heading: d.appeal_heading,
        appeal_text: d.appeal_text,
        appeal_image: en.appeal_image,
        appeal_image_alt: d.appeal_image_alt,
        appeal_caption: d.appeal_caption,
        appeal_cards_label: d.appeal_cards_label,
        appeal_cards: d.appeal_cards,
        appeal_cta_label: d.appeal_cta_label,
        appeal_cta_url: en.appeal_cta_url,
      })
    },
    'events'
  )
  // References are stored as seed $refs so EmDash resolves them to entry ids.
  for (const r of out.events) {
    for (const k of ['offers', 'benefit_rows', 'sponsors', 'faqs', 'previous_editions']) if (r.data[k]) r.data[k] = r.data[k].map(ref)
    if (r.data.next_edition) r.data.next_edition = ref(r.data.next_edition)
  }

  // --- Children ---
  out.children = mapRows(
    content.children,
    (e) => e.id,
    (d, en, es, base) =>
      drop({
        name: en.display_name,
        age: en.age,
        birth_date: en.birthday,
        gender: en.gender ? String(en.gender).toLowerCase() : undefined,
        photo: en.photo,
        summary: undefined,
        story: toPortableText(d.about, `${base.id}-s`),
        dream: d.dream,
        sponsorship_status: en.published === false ? 'sponsored' : 'available',
        featured: false,
        donorbox_sponsorship_ref: en.donorbox_sponsorship_ref,
      }),
    'children'
  )

  // --- Team members: one record per person (spec 4.4, content check 3) ---
  const team = content.team_members ?? []
  const personId = (e) => `team-${e.data.profile_slug ?? e.slug ?? e.id.replace(/^team-/, '')}`
  const people = new Map()
  for (const e of team.filter((e) => !isEs(e))) {
    const id = personId(e)
    const p = people.get(id) ?? { id, records: [] }
    p.records.push(e)
    people.set(id, p)
  }
  const esByEn = new Map(team.filter(isEs).map((e) => [e.translationOf, e]))
  const GROUP = { board: 'board', leader: 'leadership', staff: 'staff' }
  out.team_members = []
  for (const { id, records } of people.values()) {
    const groups = [...new Set(records.map((r) => GROUP[r.data.tier] ?? 'staff'))]
    const main = records.find((r) => r.data.tier === 'staff') ?? records[0]
    const board = records.find((r) => r.data.tier === 'board')
    const leader = records.find((r) => r.data.tier === 'leader')
    const openSeat = !main.data.profile_slug && /join/i.test(main.slug ?? main.id)
    const build = (pick) => {
      const d = (r) => (r ? pick(r).data : {})
      // A field from the first of the person's records that has it (the
      // board and staff records each carry part of the profile).
      const any = (k) => [main, ...records].map((r) => d(r)[k]).find((v) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
      const linkedin = records.flatMap((r) => r.data.social_links ?? []).find((s) => s.platform === 'linkedin')?.url
      return drop({
        name: main.data.name,
        groups,
        board_position: board ? d(board).role : undefined,
        leadership_role: leader ? d(leader).role : undefined,
        title: records.some((r) => r.data.tier === 'staff') ? d(main).role : undefined,
        display_order: Math.min(...records.map((r) => r.data.order ?? 0)),
        featured: false,
        open_seat: openSeat || undefined,
        photo: any('photo'),
        bio_summary: any('bio'),
        bio: toPortableText(any('long_bio'), `${id}-b`),
        quote: any('quote'),
        since: any('since'),
        from: any('from'),
        based_in: any('based_in'),
        background: (any('background') ?? []).slice(0, 3).map((b) => drop({ label: b.label, detail: b.value })),
        linkedin,
      })
    }
    const slug = main.data.profile_slug ?? main.slug
    out.team_members.push({ id, ...(slug ? { slug } : {}), status: 'published', data: build((r) => r) })
    if (records.some((r) => esByEn.has(r.id))) {
      out.team_members.push({ id: `${id}--es`, ...(slug ? { slug } : {}), status: 'published', locale: 'es', translationOf: id, data: build((r) => esByEn.get(r.id) ?? r) })
    }
  }
  // The open board seat: one record, one tile on Our Team, no bio page. The
  // live page draws it by hand ("Join our board"); the spec (7.9) states
  // today's seats as "3 open seats: Director".
  if (!out.team_members.some((m) => m.data.open_seat)) {
    const seat = { groups: ['board'], display_order: 1000, featured: false, open_seat: true, photo: OPEN_SEAT_PHOTO }
    out.team_members.push(
      { id: 'team-open-board-seat', slug: 'open-board-seat', status: 'published', data: { name: 'Board seats open', board_position: '3 open seats: Director', ...seat } },
      { id: 'team-open-board-seat--es', slug: 'open-board-seat', status: 'published', locale: 'es', translationOf: 'team-open-board-seat', data: { name: 'Puestos abiertos en la junta', board_position: '3 puestos vacantes: Director', ...seat } }
    )
  }
  fillShared(out.team_members, 'team_members')

  // --- Categories, authors, articles (resources) ---
  out.categories = CATEGORIES.flatMap((c, i) => [
    { id: `category-${c.slug}`, slug: c.slug, status: 'published', data: { name: c.en[0], description: c.en[1], display_order: i + 1 } },
    { id: `category-${c.slug}--es`, slug: c.slug, status: 'published', locale: 'es', translationOf: `category-${c.slug}`, data: { name: c.es[0], description: c.es[1], display_order: i + 1 } },
  ])
  const resources = content.resources ?? []
  const enResources = byId(resources.filter((e) => !isEs(e)))
  const authorKey = (name) => `author-${String(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  const authors = new Map()
  const teamBySlugName = new Map(out.team_members.filter((m) => !m.locale).map((m) => [m.data.name, m.id]))
  for (const e of resources) {
    for (const a of e.data.authors ?? []) {
      const id = authorKey(a.name)
      const row = authors.get(id) ?? { en: undefined, es: undefined }
      if (isEs(e)) row.es ??= a
      else row.en ??= a
      authors.set(id, row)
    }
  }
  out.authors = [...authors.entries()].flatMap(([id, { en, es }]) => {
    const name = (en ?? es).name
    const member = teamBySlugName.get(name)
    const base = drop({ name, role: (en ?? es).role, team_member: member ? ref(member) : undefined })
    // Every author has a Spanish row; without a Spanish byline on the live
    // site, its role stays as written (a gap for the migration report).
    return [{ id, status: 'published', data: base }, { id: `${id}--es`, status: 'published', locale: 'es', translationOf: id, data: drop({ ...base, role: es?.role ?? base.role }) }]
  })
  out.articles = mapRows(
    resources,
    (e) => e.id.replace(/^resource-/, 'article-'),
    (d, en) => {
      const cats = en.categories ?? []
      return drop({
        title: d.title ?? en.title,
        publish_date: en.published_on,
        category: ref(cats.includes('financials-transparency') ? 'category-financials' : cats.includes('news') ? 'category-news' : 'category-stories'),
        authors: (en.authors ?? []).slice(0, 2).map((a) => ref(authorKey(a.name))),
        featured_image: en.image,
        excerpt: d.excerpt,
        body: d.body,
        featured: Boolean(en.featured),
        report_pdf: en.file,
        report_type: en.report_kind ?? undefined,
        last_updated: en.updated_on,
        seo_title: d.seo_title,
        meta_description: d.seo_description,
        social_image: en.social_image,
        external: en.external ? true : undefined,
        external_url: en.external_url,
        outlet: en.outlet,
        // Per language: the English card says "In Spanish"; the Spanish one
        // shows no tag (the article is already in Spanish).
        language_tag: d.language_tag || undefined,
      })
    },
    'articles'
  )
  void enResources

  // --- Testimonials, auction items (none on the live site yet) ---
  out.testimonials = mapRows(
    content.testimonials,
    (e) => e.id,
    (d, en, es, base) => drop({ name: en.name, quote: toPortableText(d.quote, `${base.id}-q`), role: d.role, photo: en.photo }),
    'testimonials'
  )
  out.auction_items = mapRows(
    content.auction_items,
    (e) => e.id,
    (d, en) => drop({ name: d.name, photo: en.image, value: en.estimated_value, sort_order: en.order }),
    'auction_items'
  )

  // --- Site facts ---
  out.site_facts = SITE_FACTS.flatMap((f) => {
    const id = `fact-${f.key.replace(/_/g, '-')}`
    const base = { key: f.key, value: f.value, approved: true }
    return [
      { id, status: 'published', data: drop({ ...base, label: f.en[0], detail: f.en[1], period: PERIOD_PENDING.en }) },
      { id: `${id}--es`, status: 'published', locale: 'es', translationOf: id, data: drop({ ...base, label: f.es[0], detail: f.es[1], period: PERIOD_PENDING.es }) },
    ]
  })

  return out
}

// Per-collection, per-locale counts (migration report, spec 4.4).
export function modelCounts(content) {
  return Object.fromEntries(
    Object.entries(content).map(([k, rows]) => [k, { en: rows.filter((r) => !r.locale).length, es: rows.filter((r) => r.locale === 'es').length }])
  )
}
