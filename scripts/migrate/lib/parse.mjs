// Pure HTML → data parsers for the live Webflow site's published pages.
// Each parser keys off the site's stable Webflow class names (e.g.
// `bio_fact-label`, `offer-card_title`) and returns plain JSON in the
// snapshot shape. Image/file URLs are returned absolute and untouched;
// harvest.mjs rewrites them later.
import * as cheerio from 'cheerio'

export function load(html) {
  return cheerio.load(html)
}

function clean(text) {
  return (text ?? '').replace(/\s+/g, ' ').trim() || undefined
}

function img($, el) {
  const $el = $(el)
  const src = $el.attr('src')
  if (!src) return undefined
  return { src, alt: clean($el.attr('alt')) }
}

// Strips Webflow-only wrappers so rich text can be sanitized downstream.
function richHtml($, el) {
  const $el = $(el)
  if (!$el.length || $el.hasClass('w-dyn-bind-empty')) return undefined
  const html = $el.html()?.trim()
  return html || undefined
}

function listItems($, el) {
  const items = $(el)
    .find('li')
    .map((_, li) => clean($(li).text()))
    .get()
    .filter(Boolean)
  return items.length ? items : undefined
}

// --- SEO ---------------------------------------------------------------

export function parseSeo(html) {
  const $ = load(html)
  const meta = (sel) => clean($(sel).attr('content'))
  return {
    title: clean($('head > title').text()),
    description: meta('meta[name="description"]'),
    ogTitle: meta('meta[property="og:title"]'),
    ogDescription: meta('meta[property="og:description"]'),
    ogImage: meta('meta[property="og:image"]'),
  }
}

// --- Team --------------------------------------------------------------

const TIER_BY_TAGLINE = {
  BOARD: 'board',
  LEADERSHIP: 'leader',
  LEADERS: 'leader',
  STAFF: 'staff',
  // Spanish (/es) section taglines.
  'JUNTA DIRECTIVA': 'board',
  LIDERAZGO: 'leader',
  LÍDERES: 'leader',
  PERSONAL: 'staff',
}

// Our Team index: every tier section with its members' per-tier role.
// A person can appear in several tiers with a different title in each.
export function parseTeamIndex(html) {
  const $ = load(html)
  const sections = []
  $('.member-grid_inner').each((_, section) => {
    const $s = $(section)
    const tagline = clean($s.find('.title_tagline').first().text())?.toUpperCase()
    const tier = TIER_BY_TAGLINE[tagline]
    if (!tier) return
    const members = []
    $s.find('.team-grid_item').each((order, item) => {
      const $i = $(item)
      const href = $i.find('a.team-card_link').attr('href')
      const openSeat = $i.find('.team-card_open-seat')
      members.push({
        slug: href ? href.split('/').filter(Boolean).pop() : undefined,
        name: clean($i.find('.team-card_name').text()),
        role: clean($i.find('.team-card_title').text()),
        photo: img($, $i.find('img.team-member-img')),
        hasDetailPage: Boolean(href),
        openSeat: openSeat.length
          ? {
              kicker: clean(openSeat.find('.team-card_open-kicker').text()),
              heading: clean(openSeat.find('.team-card_open-heading').text()),
              cta: clean(openSeat.find('.team-card_open-button').text()),
              href: openSeat.attr('href'),
            }
          : undefined,
        order,
      })
    })
    sections.push({
      tier,
      tagline,
      heading: clean($s.find('.section-title_heading').first().text()),
      text: clean($s.find('.section-title_text').first().text()),
      members,
    })
  })
  return sections
}

export function parseTeamMember(html) {
  const $ = load(html)
  const facts = {}
  $('.bio_fact').each((_, f) => {
    const label = clean($(f).find('.bio_fact-label').text())
    const value = clean($(f).find('.bio_fact-value').text())
    if (label && value) facts[label.toLowerCase()] = value
  })
  const linkedin = $('.bio_linkedin a').attr('href')
  return {
    name: clean($('.bio_name').text()),
    role: clean($('.bio_role').text()),
    photo: img($, $('img.bio_photo')),
    quote: clean($('.bio_quote').text()),
    since: facts['since'],
    from: facts['from'],
    basedIn: facts['based in'],
    lead: clean($('.bio_lead').text()),
    bodyHtml: richHtml($, $('.bio_body')),
    background: $('.bio_item')
      .map((_, i) => ({
        label: clean($(i).find('.bio_item-label').text()),
        value: clean($(i).find('.bio_item-detail').text()),
      }))
      .get()
      .filter((b) => b.label || b.value),
    socialLinks: linkedin && linkedin !== '#' ? [{ platform: 'linkedin', url: linkedin }] : [],
    seo: parseSeo(html),
  }
}

// --- Children ----------------------------------------------------------

// Field labels on child pages, by locale (Spanish pages use their own labels).
const CHILD_FIELD_ALIASES = {
  edad: 'age',
  'fecha de nacimiento': 'birthday',
  cumpleaños: 'birthday',
  género: 'gender',
  genero: 'gender',
  sueño: 'dream',
}

export function parseChild(html) {
  const $ = load(html)
  const root = $('.section_child-detail')
  const fields = {}
  root.find('h2').each((_, h) => {
    const label = clean($(h).text())
    if (!label?.endsWith(':')) return
    const value = clean($(h).next().text())
    const key = label.slice(0, -1).toLowerCase()
    if (value) fields[CHILD_FIELD_ALIASES[key] ?? key] = value
  })
  const name = clean(root.find('h1').first().text())
  const aboutHeading = root.find('*').filter((_, e) => clean($(e).text())?.startsWith('About ') && !$(e).children().length).first()
  const about = aboutHeading.length ? aboutHeading.nextAll('.w-richtext').first() : root.find('.w-richtext').first()
  const ageMatch = fields['age']?.match(/\d+/)
  return {
    displayName: name,
    age: ageMatch ? Number(ageMatch[0]) : undefined,
    birthday: fields['birthday'],
    gender: fields['gender'],
    dream: fields['dream'],
    aboutHtml: richHtml($, about),
    photo: img($, root.find('img').filter((_, i) => !/\.svg(\?|$)/.test($(i).attr('src') ?? '')).first()),
    donorboxRef: root.find('a[href*="donorbox.org"]').attr('href'),
  }
}

// Children listing: display names in live display order (cards link to `#`,
// so order is matched to detail pages by display name).
export function parseChildList(html) {
  const $ = load(html)
  return $('.children-list_item')
    .map((_, i) => clean($(i).find('h2').first().text()))
    .get()
    .filter(Boolean)
}

// --- Resources ---------------------------------------------------------

// Resource listing / category pages: one card per resource.
export function parseResourceList(html) {
  const $ = load(html)
  return $('a.resources_card-link')
    .map((_, a) => {
      const $a = $(a)
      return {
        slug: $a.attr('href')?.split('/').filter(Boolean).pop(),
        title: clean($a.find('.article-card_heading').text()),
        date: clean($a.find('.article-card_date').text()),
        excerpt: clean($a.find('.article-card_excerpt').text()),
        image: img($, $a.find('img.article-card_image')),
      }
    })
    .get()
}

export function parseNextPageHref(html) {
  return load(html)('a.w-pagination-next').attr('href')
}

export function parseResource(html) {
  const $ = load(html)
  const dateBlock = $('.article_date').children()
  const authors = []
  $('.article_byline-text').each((_, b) => {
    const parts = $(b)
      .find('.article_inline')
      .map((_, p) => clean($(p).text()))
      .get()
      .filter((p) => p && p !== 'By' && p !== ',')
    if (parts.length) authors.push({ name: parts[0], role: parts[1] })
  })
  const fileHref = $('a[href$=".pdf"], a[href*=".pdf?"]').first().attr('href')
  return {
    title: clean($('h1.resources_page-title').text()),
    updated: clean(dateBlock.eq(1).text()),
    authors,
    image: img($, $('img.article_featured-image')),
    bodyHtml: richHtml($, $('.article_body')),
    file: fileHref ? { src: fileHref } : undefined,
    seo: parseSeo(html),
  }
}

// --- Events ------------------------------------------------------------

export function parseEventList(html) {
  const $ = load(html)
  return $('.event-card_component')
    .map((_, c) => {
      const $c = $(c)
      const href = $c.find('a[href^="/events/"]').attr('href') ?? $c.closest('.events-past_item').find('a.events-past_link').attr('href')
      return {
        slug: href?.split('/').filter(Boolean).pop(),
        title: clean($c.find('.event-card_title').text()),
        date: clean($c.find('.tag_component').first().text()),
        location: clean($c.find('.event-card_location').first().text()),
        text: clean($c.find('.event-card_text').text()),
        image: img($, $c.find('img').first()),
        past: $c.closest('.events-past_item').length > 0,
      }
    })
    .get()
    .filter((e) => e.slug)
}

export function parseSponsorLogos($, scope) {
  const seen = new Set()
  const sponsors = []
  $(scope)
    .find('.w-dyn-item a, .w-slide a')
    .each((_, a) => {
      const $a = $(a)
      const logo = img($, $a.find('img'))
      const name = logo?.alt
      if (!name || seen.has(name)) return
      seen.add(name)
      sponsors.push({ name, website: $a.attr('href'), logo })
    })
  return sponsors
}

export function parseFaqs(html) {
  const $ = load(html)
  return $('.faq-row_component')
    .map((order, f) => ({
      question: clean($(f).find('.faq-row_question h3, .faq-row_question').first().text()),
      answer: clean($(f).find('.faq-row_answer').text()),
      order,
    }))
    .get()
    .filter((f) => f.question)
}

export function parseEvent(html) {
  const $ = load(html)
  const www = $('.www_card')
  const wwwText = www.find('.www_text').map((_, p) => clean($(p).text())).get()
  const donorbox = $('a[href*="donorbox.org/events/"]').first().attr('href')
  // Offers come from the hidden `.offer-data` CMS list the live page's
  // scripts read (kind: Ticket / Package / Special opportunity).
  const KIND = { Ticket: 'ticket', Package: 'package', 'Special opportunity': 'special' }
  const offers = $('.offer-data .w-dyn-item')
    .map((order, item) => {
      const $i = $(item)
      return {
        id: $i.attr('data-id'),
        kind: KIND[$i.attr('data-kind')] ?? 'ticket',
        tierName: clean($i.find('.od-name').text()),
        shortName: clean($i.find('.od-short').not('.w-dyn-bind-empty').text()),
        price: clean($i.find('.od-price').text()),
        benefits: listItems($, $i.find('.od-includes')),
        ctaLabel: clean($i.find('.od-label').text()),
        ctaUrl: $i.find('a.od-link').attr('href'),
        soldOut: $i.find('.od-sold').length > 0,
        order,
      }
    })
    .get()
  // Sponsorship benefits comparison rows (`.benefit-data`): one value per
  // Package offer, in order.
  const benefitRows = $('.benefit-data .w-dyn-item')
    .map((_, row) => ({
      section: $(row).attr('data-section'),
      name: clean($(row).find('.br-name').text()),
      values: $(row)
        .find('.br-col')
        .map((_, c) => clean($(c).text()) ?? '')
        .get(),
    }))
    .get()
  return {
    heroHeading: clean($('.hero_heading').first().text()),
    heroBody: clean($('.hero_body').first().text()),
    heroImage: img($, $('img.hero-background-img').first()),
    heroImageMobile: img($, $('img.hero-background-img-mobile').first()),
    title: clean(www.find('.www_title').text()),
    dateText: wwwText[0],
    venue: wwwText[1],
    address: wwwText[2],
    mapUrl: www.find('a.www_map-link').attr('href'),
    donorboxEventId: donorbox?.match(/events\/(\d+)/)?.[1],
    sponsors: parseSponsorLogos($, '.section_partners'),
    offers,
    benefitRows,
    programHtml: richHtml($, $('.event-program_list')),
    includesHtml: richHtml($, $('.event-includes_list')),
    // CMS multi-image field, rendered as the memories strip (upcoming) or
    // the recap carousel (past events).
    gallery: dedupeBySrc(
      $('.w-dyn-repeater-item img')
        .map((_, i) => img($, i))
        .get()
    ),
    recapStats: $('.recap-stats_cell .number-card_component')
      .map((_, c) => ({
        number: clean($(c).find('.number-card_number').text()),
        heading: clean($(c).find('.number-card_heading').text()),
        label: clean($(c).find('.number-card_label').text()),
      }))
      .get(),
    faqs: parseFaqs(html),
    seo: parseSeo(html),
  }
}

function dedupeBySrc(images) {
  const seen = new Set()
  return images.filter((i) => i && !seen.has(i.src) && seen.add(i.src))
}

// --- Corporate sponsorship tiers ---------------------------------------

// Benefit group labels as the English and Spanish pages write them (without
// the trailing colon). Unknown labels are ignored.
const TIER_BENEFIT_GROUPS = {
  recognition: 'recognitionBenefits',
  reconocimiento: 'recognitionBenefits',
  activities: 'activityBenefits',
  actividades: 'activityBenefits',
  'promotional items': 'promotionalBenefits',
  'artículos promocionales': 'promotionalBenefits',
}

export function parseCorporateTiers(html) {
  const $ = load(html)
  const tabs = $('.w-tabs').filter((_, t) => $(t).find('.heading-28').length > 0).first()
  const names = tabs.find('.w-tab-link')
  return tabs
    .find('.w-tab-pane')
    .map((order, pane) => {
      const groups = {}
      $(pane)
        .find('p')
        .filter((_, p) => clean($(p).text())?.endsWith(':'))
        .each((_, label) => {
          const field = TIER_BENEFIT_GROUPS[clean($(label).text()).slice(0, -1).toLowerCase()]
          if (field) groups[field] = listItems($, $(label).parent())
        })
      const $tab = names.eq(order)
      return {
        tierName: clean($tab.find('h4').text()),
        price: clean($tab.find('h6').text()),
        recognitionBenefits: groups.recognitionBenefits,
        activityBenefits: groups.activityBenefits,
        promotionalBenefits: groups.promotionalBenefits,
        order: order + 1,
      }
    })
    .get()
}

// --- Generic page structure --------------------------------------------

// Section-by-section outline of a static page: headings, copy, CTAs and
// images in document order. Used for page recomposition and parity review;
// not seeded into the CMS.
export function parsePage(html) {
  const $ = load(html)
  $('script, style, noscript, .navbar, .footer_component, .lang-switch_component, .article_seo-warning').remove()
  const sections = []
  $('body section').each((_, s) => {
    const $s = $(s)
    if ($s.parents('section').length) return
    const blocks = []
    $s.find('h1, h2, h3, h4, h5, h6, p, li, a.button, img').each((_, el) => {
      const $el = $(el)
      const tag = el.tagName
      if (tag === 'img') {
        const image = img($, el)
        if (image) blocks.push({ type: /\.svg(\?|$)/i.test(image.src) ? 'icon' : 'image', ...image })
      } else if (tag === 'a') {
        blocks.push({ type: 'cta', text: clean($el.text()), href: $el.attr('href') })
      } else if (tag === 'li' || !$el.parents('li').length) {
        const text = clean($el.text())
        if (text) blocks.push({ type: tag, text })
      }
    })
    sections.push({ classes: ($s.attr('class') ?? '').split(/\s+/).filter(Boolean), blocks })
  })
  return { seo: parseSeo(html), sections }
}

// Every website-files.com / webflow asset URL referenced anywhere in a page.
export function findAssetUrls(html) {
  const urls = new Set()
  for (const m of html.matchAll(/https:\/\/(?:cdn\.prod\.website-files\.com|uploads-ssl\.webflow\.com)\/[^\s"'()<>]+/g)) {
    urls.add(m[0].replace(/&amp;/g, '&'))
  }
  return [...urls]
}
