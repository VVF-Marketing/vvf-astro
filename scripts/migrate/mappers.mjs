// Snapshot → EmDash seed entries, one mapper per collection. Mappers are
// pure: media lookups and reporting go through the `ctx` they receive.
//
// ctx.media(src)      → EmDash media value for a harvested source URL, or undefined
// ctx.mediaUrl(src)   → served URL for that media (for rich-text images)
// ctx.note(msg)       → add a line to the transform report
import { sanitizeRichText, toPlainText, toPortableText } from './lib/richtext.mjs'

export function slugify(text) {
  return (text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

// "Monday, November 9, 2026" / "November 9, 2026" → "2026-11-09T00:00:00.000Z"
export function parseLiveDate(text) {
  const m = (text ?? '').toLowerCase().match(/([a-z]+)\s+(\d{1,2}),\s*(\d{4})/)
  if (!m) return undefined
  const month = MONTHS.indexOf(m[1])
  if (month < 0) return undefined
  return new Date(Date.UTC(Number(m[3]), month, Number(m[2]))).toISOString()
}

function compact(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
  )
}

function entry(id, slug, data) {
  return compact({ id, slug, status: 'published', data: compact(data) })
}

function richText(html, ctx, label) {
  const { html: clean, dropped } = sanitizeRichText(html, { rewriteSrc: (src) => ctx.mediaUrl(src) })
  if (dropped.length) ctx.note(`${label}: dropped <${dropped.join('>, <')}>`)
  return clean
}

// --- Team --------------------------------------------------------------

// One entry per (person, tier) as the live Our Team page lists people per
// tier with a tier-specific title. The first entry for a person carries
// the slug and full profile; later tiers get `<slug>-<tier>` and share the
// profile slug. Open-seat cards ("Join our board") are page content, not
// people, and are skipped.
export function mapTeam(snapshot, ctx) {
  const { sections, members } = snapshot
  const bySlugOrName = (m) =>
    m.slug && members[m.slug] ? m.slug : Object.keys(members).find((s) => members[s].name === m.name)
  const entries = []
  const seen = new Set()
  for (const section of sections) {
    section.members.forEach((m, order) => {
      if (m.openSeat) {
        ctx.note(`Team: "${m.name}" (${section.tier}) is an open-seat call to action; rendered by the Our Team page, not seeded. Its live profile URL redirects to /contact.`)
        return
      }
      const slug = bySlugOrName(m) ?? slugify(m.name)
      const profile = members[slug]
      const first = !seen.has(slug)
      seen.add(slug)
      entries.push(
        entry(`team-${slug}-${section.tier}`, first ? slug : `${slug}-${section.tier}`, {
          name: m.name,
          role: m.role,
          tier: section.tier,
          photo: ctx.media(m.photo?.src ?? profile?.photo?.src),
          profile_slug: profile ? slug : undefined,
          order,
          ...(first && profile
            ? {
                bio: profile.lead,
                long_bio: toPlainText(richText(profile.bodyHtml, ctx, `Team ${slug}`)),
                quote: profile.quote,
                since: profile.since,
                from: profile.from,
                based_in: profile.basedIn,
                background: profile.background,
                social_links: profile.socialLinks,
              }
            : {}),
        })
      )
    })
  }
  for (const slug of Object.keys(members)) {
    if (!seen.has(slug) && slug !== 'join-our-board') ctx.note(`Team: profile ${slug} is not listed in any tier on the live Our Team page; not seeded.`)
  }
  return entries
}

// --- Children ----------------------------------------------------------

export function mapChildren(snapshot, ctx) {
  return snapshot.items.map((c) => {
    const order = snapshot.order.indexOf(c.displayName)
    return entry(`child-${c.slug}`, c.slug, {
      display_name: c.displayName,
      // Never populated by migration (public repo, minors' data).
      private_full_name: undefined,
      age: c.age,
      birthday: parseLiveDate(c.birthday),
      gender: c.gender,
      dream: c.dream,
      about: toPlainText(richText(c.aboutHtml, ctx, `Child ${c.slug}`)),
      photo: ctx.media(c.photo?.src),
      published: true,
      order: order >= 0 ? order : undefined,
      donorbox_sponsorship_ref: c.donorboxRef,
    })
  })
}

// --- Events, packages, sponsors, FAQs -----------------------------------

// [src, alt] of a parsed image: events keep each page's own descriptions.
const imageOf = (img) => [img?.src, img?.alt]

export function mapEvents(events, ctx) {
  const out = { events: [], sponsorship_packages: [], sponsors: new Map(), faqs: [] }
  for (const e of events) {
    const packageIds = e.offers.map((o) => {
      const id = `sp-${e.slug}-${o.id ?? slugify(o.tierName)}`
      out.sponsorship_packages.push(
        entry(id, undefined, {
          scope: 'event',
          kind: o.kind,
          tier_name: o.tierName,
          short_name: o.shortName,
          price: o.price,
          benefits: o.benefits,
          cta_label: o.ctaLabel,
          cta_url: o.ctaUrl,
          sold_out: o.soldOut,
          order: o.order,
        })
      )
      return `$ref:${id}`
    })

    const sponsorIds = e.sponsors.map((s) => {
      const id = `sponsor-${slugify(s.name)}`
      if (!out.sponsors.has(id)) {
        out.sponsors.set(id, entry(id, undefined, { name: s.name, logo: ctx.media(s.logo?.src), website: s.website }))
      }
      return `$ref:${id}`
    })

    e.faqs.forEach((f, i) =>
      out.faqs.push(entry(`faq-event-${e.slug}-${i + 1}`, undefined, { question: f.question, answer: f.answer, category: 'tournament', order: i + 1 }))
    )

    const title = e.title ?? e.card?.title
    out.events.push(
      entry(`event-${e.slug}`, e.slug, {
        title,
        start_date: parseLiveDate(e.dateText) ?? parseLiveDate(e.card?.date),
        location: e.card?.location ?? e.address,
        description: e.card?.text ?? e.heroBody,
        image: ctx.media(...imageOf(e.card?.image?.src ? e.card.image : e.heroImage)),
        category: /golf/i.test(title ?? '') ? 'golf-tournament' : 'community',
        donorbox_event_id: e.donorboxEventId,
        sponsor_packages: packageIds,
        sponsors: sponsorIds,
        hero_heading: e.heroHeading,
        hero_body: e.heroBody,
        hero_image: ctx.media(...imageOf(e.heroImage)),
        hero_image_mobile: ctx.media(...imageOf(e.heroImageMobile)),
        venue: e.venue,
        address: e.address,
        map_url: e.mapUrl,
        program: toPortableText(richText(e.programHtml, ctx, `Event ${e.slug} program`), 'p'),
        includes: toPortableText(richText(e.includesHtml, ctx, `Event ${e.slug} includes`), 'i'),
        gallery: e.gallery.map((g) => ctx.media(...imageOf(g))).filter(Boolean),
        recap_stats: e.recapStats,
        benefit_rows: e.benefitRows,
        seo_title: e.seo?.title,
        seo_description: e.seo?.description,
        social_image: ctx.media(e.seo?.ogImage),
        ...EVENT_EXTRAS[e.slug],
      })
    )
  }
  return { ...out, sponsors: [...out.sponsors.values()] }
}

// Event content the live site writes into its event page rather than its CMS
// (so the Webflow API and the snapshot can't supply it): the 2026
// tournament's earthquake-relief appeal and its event contact details.
const EVENT_EXTRAS = {
  '2026-golf-tournament': {
    appeal_heading: "This Year's Tournament Supports Earthquake Relief",
    appeal_text:
      '100% of the net proceeds from the 2026 tournament go to our earthquake relief work in Venezuela. They will help build our permanent support center in La Guaira. When it opens, it will give displaced children and their families shelter, meals and medical care.',
    // External image values don't keep `alt`, so the description is its own field.
    appeal_image: { src: '/images/pages/5547e143-vvf-laguaira-centre-exterior-web-v1.jpg' },
    appeal_image_alt: 'Render of the planned VVF support centre in La Guaira, seen from the street.',
    appeal_caption: 'How the center in La Guaira will look. The center is not built yet. These images are AI-generated renders.',
    appeal_cards_label: 'Three steps to change',
    appeal_cards: [
      {
        title: 'Shelter',
        text: 'A safe place to stay for families whose homes were destroyed in the June 2026 earthquakes.',
        image_url: '/images/pages/467d8fd3-vvf-laguaira-card-shelter-web-v1.jpg',
        image_alt: 'Families arriving at the courtyard of the planned VVF support centre.',
      },
      {
        title: 'Medical care',
        text: 'Check-ups, medicine and treatment for children and their families at the center.',
        image_url: '/images/pages/2631b854-vvf-laguaira-card-medicalcare-web-v1.jpg',
        image_alt: 'A nurse examining a young girl while her mother sits beside her.',
      },
      {
        title: 'Nutrition',
        text: 'Daily meals for the children staying at the support center in La Guaira.',
        image_url: '/images/pages/c84863db-vvf-laguaira-card-nutrition-web-v1.jpg',
        image_alt: "Children eating a hot meal together in the centre's dining room.",
      },
    ],
    appeal_cta_label: 'Learn More',
    appeal_cta_url: '/earthquake-relief',
    contact_phone: '+1 (305) 922-5585',
    contact_email: 'charitygolf@victoriavenezuelafoundation.org',
    contact_address: 'Victoria Venezuela Foundation, 501(c)(3), Tax ID: 88-3282100',
  },
}

export function mapCorporateTiers(tiers) {
  return tiers.map((t) =>
    entry(`sp-general-${slugify(t.tierName)}`, undefined, {
      scope: 'general',
      tier_name: t.tierName,
      price: t.price,
      recognition_benefits: t.recognitionBenefits,
      activity_benefits: t.activityBenefits,
      promotional_benefits: t.promotionalBenefits,
      order: t.order,
    })
  )
}

const FAQ_CATEGORY_BY_PAGE = { 'sponsor-a-child': 'sponsorship', 'ways-to-give': 'donation' }

export function mapPageFaqs(faqsByPage, ctx) {
  return Object.entries(faqsByPage).flatMap(([page, faqs]) => {
    const category = FAQ_CATEGORY_BY_PAGE[page]
    if (!category) {
      ctx.note(`FAQs on page ${page} have no category mapping; not seeded.`)
      return []
    }
    return faqs.map((f, i) => entry(`faq-${page}-${i + 1}`, undefined, { question: f.question, answer: f.answer, category, order: i + 1 }))
  })
}

// --- Resources ---------------------------------------------------------

export function mapResources(resources, ctx) {
  return resources.map((r) =>
    entry(`resource-${r.slug}`, r.slug, {
      title: r.title ?? r.card?.title,
      categories: r.categories,
      published_on: parseLiveDate(r.card?.date),
      updated_on: parseLiveDate(r.updated),
      authors: r.authors,
      excerpt: r.card?.excerpt,
      image: ctx.media(r.image?.src ?? r.card?.image?.src),
      body: toPortableText(richText(r.bodyHtml, ctx, `Resource ${r.slug}`), 'r'),
      file: ctx.media(r.file?.src),
      seo_title: r.seo?.title,
      seo_description: r.seo?.description,
      social_image: ctx.media(r.seo?.ogImage),
    })
  )
}

// Home "Corporate Partners": merged into sponsors (flagged `partner`, with
// display order) so event sponsors and partners share one logo per company.
export function mergePartners(sponsors, partners, ctx) {
  const byId = new Map(sponsors.map((s) => [s.id, s]))
  partners.forEach((p, order) => {
    const id = `sponsor-${slugify(p.name)}`
    const existing = byId.get(id)
    if (existing) {
      existing.data = { ...existing.data, partner: true, order }
    } else {
      byId.set(id, entry(id, undefined, { name: p.name, logo: ctx.media(p.logo?.src), website: p.website, partner: true, order }))
    }
  })
  return [...byId.values()]
}
