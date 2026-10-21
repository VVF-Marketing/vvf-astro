// The site's content model: one EmDash collection per type in the VVF
// website spec's content model (section 4, Appendix B). The migration
// transform (scripts/migrate/model.mjs) writes these collections into the
// seed, and the content adapter (src/lib/content) reads them. Plain ESM so
// Node scripts share it.
//
// Field rules: `translatable: false` marks a field shared by both languages
// (the spec's "Per language" column is empty). Enums store language-neutral
// keys; ordered references are JSON arrays of entry ids; single references
// are EmDash `reference` fields.

const shared = { translatable: false }
const select = (options) => ({ type: 'select', validation: { options } })
const multi = (options) => ({ type: 'multiSelect', validation: { options } })
const repeater = (subFields) => ({ type: 'repeater', validation: { subFields } })
const sub = (slug, label, type = 'string') => ({ slug, label, type })

/** @type {{ slug: string, label: string, labelSingular: string, titleField: string, dateField?: string, description: string, fields: Record<string, unknown>[] }[]} */
export const MODEL_COLLECTIONS = [
  {
    slug: 'events',
    label: 'Events',
    labelSingular: 'Event',
    titleField: 'name',
    dateField: 'start',
    description: 'One item per event edition. Builds its page at /events/<slug> in both languages: the selling page before, the recap after.',
    fields: [
      { slug: 'name', label: 'Name (H1 and page title)', type: 'string', required: true },
      { slug: 'lifecycle', label: 'Lifecycle (switched by hand)', ...select(['upcoming', 'past', 'cancelled']), required: true, ...shared },
      { slug: 'registration', label: 'Registration (ticket buttons)', ...select(['open', 'sold_out', 'closed', 'not_needed']), required: true, ...shared },
      { slug: 'featured', label: 'Featured (shows on Home)', type: 'boolean', ...shared },
      { slug: 'event_type', label: 'Event type', ...select(['fundraiser', 'community', 'awareness', 'volunteer']), required: true, ...shared },
      { slug: 'start', label: 'Start (America/New_York)', type: 'datetime', required: true, ...shared },
      { slug: 'end', label: 'End', type: 'datetime', ...shared },
      { slug: 'summary', label: 'Summary (cards and listings)', type: 'text', required: true },
      { slug: 'description', label: 'Description', type: 'portableText', required: true },
      { slug: 'program', label: 'Program (one row per item)', ...repeater([sub('time', 'Time'), sub('text', 'What happens')]) },
      { slug: 'whats_included', label: "What's included", type: 'portableText' },
      { slug: 'hero_photo', label: 'Hero photo (subject on the left)', type: 'image', required: true, ...shared },
      { slug: 'hero_photo_phone', label: 'Hero photo for phones', type: 'image', ...shared },
      { slug: 'share_image', label: 'Share image (1200 × 630; empty uses the hero photo)', type: 'image', ...shared },
      { slug: 'venue_name', label: 'Venue name', type: 'string' },
      { slug: 'venue_address', label: 'Venue address', type: 'string', required: true, ...shared },
      { slug: 'city', label: 'City', type: 'string', ...shared },
      { slug: 'state', label: 'State (two letters)', type: 'string', ...shared },
      { slug: 'contact_email', label: 'Contact email', type: 'string', ...shared },
      { slug: 'contact_phone', label: 'Contact phone', type: 'string', ...shared },
      { slug: 'registration_url', label: 'Registration URL (Donorbox Events)', type: 'url', ...shared },
      { slug: 'tickets_from', label: 'Tickets from (lowest price, structured data only)', type: 'integer', ...shared },
      { slug: 'offers', label: 'Offers (tickets, packages, special opportunities)', type: 'json', ...shared },
      { slug: 'benefit_rows', label: 'Benefit rows', type: 'json', ...shared },
      { slug: 'auction_items', label: 'Auction items', type: 'json', ...shared },
      { slug: 'sponsors', label: 'Sponsors (in order)', type: 'json', ...shared },
      { slug: 'faqs', label: 'FAQs (in order)', type: 'json', ...shared },
      { slug: 'meta_description', label: 'Meta description', type: 'text' },
      { slug: 'recap_headline', label: 'Recap: headline', type: 'string' },
      { slug: 'recap_summary', label: 'Recap: summary', type: 'text' },
      { slug: 'amount_raised', label: 'Recap: amount raised (as displayed)', type: 'string', ...shared },
      { slug: 'stats', label: 'Recap: stats (up to three)', ...repeater([sub('value', 'Value'), sub('label', 'Label'), sub('caption', 'Line under the label')]) },
      { slug: 'gallery', label: 'Gallery', type: 'json', ...shared },
      { slug: 'recap_video', label: 'Recap: video (YouTube or Vimeo)', type: 'url', ...shared },
      { slug: 'contest_winners', label: 'Recap: contest winners', type: 'portableText' },
      { slug: 'winners_photo', label: 'Recap: winners photo', type: 'image', ...shared },
      { slug: 'testimonials', label: 'Recap: testimonials (up to three)', type: 'json', ...shared },
      { slug: 'previous_editions', label: 'Previous editions', type: 'json', ...shared },
      { slug: 'next_edition', label: 'Next edition', type: 'reference', ...shared },
      // The earthquake appeal shown on the 2026 event page. It moves to the
      // shared appeal block with the event page rebuild (spec 7.8, row 10).
      { slug: 'appeal_heading', label: 'Appeal: heading', type: 'string' },
      { slug: 'appeal_text', label: 'Appeal: text', type: 'text' },
      { slug: 'appeal_image', label: 'Appeal: image', type: 'image', ...shared },
      { slug: 'appeal_image_alt', label: 'Appeal: image description', type: 'string' },
      { slug: 'appeal_caption', label: 'Appeal: caption', type: 'string' },
      { slug: 'appeal_cards_label', label: 'Appeal: cards label', type: 'string' },
      { slug: 'appeal_cards', label: 'Appeal: cards', type: 'json' },
      { slug: 'appeal_cta_label', label: 'Appeal: button label', type: 'string' },
      { slug: 'appeal_cta_url', label: 'Appeal: button link', type: 'string', ...shared },
    ],
  },
  {
    slug: 'event_offers',
    label: 'Event offers',
    labelSingular: 'Event offer',
    titleField: 'name',
    description: 'Tickets, sponsorship packages and special opportunities. Created once and picked again on each event.',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true },
      { slug: 'short_name', label: 'Short name (tabs)', type: 'string' },
      { slug: 'kind', label: 'Kind', ...select(['ticket', 'package', 'special_opportunity']), required: true, ...shared },
      { slug: 'price', label: 'Price (as displayed)', type: 'string', ...shared },
      { slug: 'includes', label: 'Includes', type: 'portableText' },
      { slug: 'button_label', label: 'Button label', type: 'string' },
      { slug: 'button_link', label: 'Button link (empty uses the event registration URL)', type: 'url', ...shared },
      { slug: 'sold_out', label: 'Sold out', type: 'boolean', ...shared },
      { slug: 'sort_order', label: 'Sort order', type: 'integer', ...shared },
    ],
  },
  {
    slug: 'benefit_rows',
    label: 'Benefit rows',
    labelSingular: 'Benefit row',
    titleField: 'name',
    description: "Rows of an event's sponsorship benefits grid; its columns are the event's package offers.",
    fields: [
      { slug: 'name', label: 'Benefit', type: 'string', required: true },
      { slug: 'section', label: 'Section', ...select(['players', 'pre_event', 'event', 'post_event']), required: true, ...shared },
      { slug: 'values', label: 'Values by package offer', type: 'json' },
      { slug: 'sort_order', label: 'Sort order', type: 'integer', ...shared },
    ],
  },
  {
    slug: 'auction_items',
    label: 'Auction items',
    labelSingular: 'Auction item',
    titleField: 'name',
    description: 'Items donated to an event auction. Never winners or bids.',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true },
      { slug: 'photo', label: 'Photo', type: 'image', ...shared },
      { slug: 'value', label: 'Value (as displayed)', type: 'string', ...shared },
      { slug: 'whats_included', label: "What's included", type: 'text' },
      { slug: 'donor_name', label: 'Donor name', type: 'string', ...shared },
      { slug: 'donor', label: 'Donor (partner)', type: 'reference', ...shared },
      { slug: 'sort_order', label: 'Sort order', type: 'integer', ...shared },
    ],
  },
  {
    slug: 'testimonials',
    label: 'Testimonials',
    labelSingular: 'Testimonial',
    titleField: 'name',
    description: 'Quotes shown on event recaps.',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true, ...shared },
      { slug: 'quote', label: 'Quote', type: 'portableText', required: true },
      { slug: 'role', label: 'Role', type: 'string' },
      { slug: 'photo', label: 'Photo', type: 'image', ...shared },
    ],
  },
  {
    slug: 'faqs',
    label: 'FAQs',
    labelSingular: 'FAQ',
    titleField: 'question',
    description: 'Questions and answers. Static pages list every question ticked for them; each event picks its own.',
    fields: [
      { slug: 'question', label: 'Question', type: 'string', required: true },
      { slug: 'answer', label: 'Answer', type: 'portableText', required: true },
      { slug: 'shows_on', label: 'Shows on', ...multi(['ways_to_give', 'sponsor_a_child', 'contact']), ...shared },
      { slug: 'sort_order', label: 'Sort order', type: 'integer', ...shared },
    ],
  },
  {
    slug: 'children',
    label: 'Children',
    labelSingular: 'Child',
    titleField: 'name',
    description: 'Sponsorship profiles at /children/<slug>. Data about minors: show only these fields. Restricted to the safeguarding team.',
    fields: [
      { slug: 'name', label: 'Name (first name and last initial)', type: 'string', required: true, ...shared },
      { slug: 'age', label: 'Age', type: 'integer', required: true, ...shared },
      { slug: 'birth_date', label: 'Birth date', type: 'datetime', ...shared },
      { slug: 'gender', label: 'Gender', ...select(['male', 'female']), ...shared },
      { slug: 'photo', label: 'Photo', type: 'image', required: true, ...shared },
      { slug: 'gallery', label: 'Gallery', type: 'json', ...shared },
      { slug: 'summary', label: 'Summary (card text)', type: 'text' },
      { slug: 'story', label: 'Story', type: 'portableText' },
      { slug: 'dream', label: 'Dream', type: 'string' },
      { slug: 'sponsorship_status', label: 'Sponsorship status', ...select(['available', 'sponsored', 'graduated']), required: true, ...shared },
      { slug: 'featured', label: 'Featured', type: 'boolean', ...shared },
      // No full name is kept: the site shows first name and last initial
      // only, and minors' data stays out of the CMS (Q5 on the spec card).
      // The Donorbox reference is internal, never shown.
      { slug: 'donorbox_sponsorship_ref', label: 'Donorbox sponsorship reference', type: 'string', ...shared },
    ],
  },
  {
    slug: 'team_members',
    label: 'Team members',
    labelSingular: 'Team member',
    titleField: 'name',
    description: 'One record per person, with one bio page at /our-team/<slug>, even when they belong to several groups.',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true, ...shared },
      { slug: 'groups', label: 'Groups', ...multi(['board', 'leadership', 'staff']), required: true, ...shared },
      { slug: 'board_position', label: 'Board position', type: 'string' },
      { slug: 'leadership_role', label: 'Leadership role', type: 'string' },
      { slug: 'title', label: 'Title', type: 'string' },
      { slug: 'display_order', label: 'Display order', type: 'integer', ...shared },
      { slug: 'featured', label: 'Featured', type: 'boolean', ...shared },
      { slug: 'open_seat', label: 'Open seat (invitation tile, no bio page)', type: 'boolean', ...shared },
      { slug: 'photo', label: 'Photo (square, black and white)', type: 'image', required: true, ...shared },
      { slug: 'bio_summary', label: 'Bio summary (card text)', type: 'text' },
      { slug: 'bio', label: 'Bio', type: 'portableText' },
      { slug: 'quote', label: 'Quote', type: 'text' },
      { slug: 'since', label: 'Since (year)', type: 'string', ...shared },
      { slug: 'from', label: 'From', type: 'string' },
      { slug: 'based_in', label: 'Based in', type: 'string' },
      { slug: 'background', label: 'Background (up to three)', ...repeater([sub('label', 'Label'), sub('detail', 'Detail')]) },
      { slug: 'email', label: 'Email', type: 'string', ...shared },
      { slug: 'linkedin', label: 'LinkedIn', type: 'url', ...shared },
    ],
  },
  {
    slug: 'articles',
    label: 'Articles',
    labelSingular: 'Article',
    titleField: 'title',
    dateField: 'publish_date',
    description: 'Stories, news, financial reports and press coverage, at /resources/<slug> (external articles link out and have no page).',
    fields: [
      { slug: 'title', label: 'Title', type: 'string', required: true },
      { slug: 'publish_date', label: 'Publish date', type: 'datetime', required: true, ...shared },
      { slug: 'category', label: 'Category', type: 'reference', required: true, ...shared },
      { slug: 'authors', label: 'Authors (one or two, in order)', type: 'json', ...shared },
      { slug: 'featured_image', label: 'Featured image', type: 'image', required: true, ...shared },
      { slug: 'excerpt', label: 'Excerpt', type: 'text' },
      { slug: 'body', label: 'Body', type: 'portableText' },
      { slug: 'featured', label: 'Featured (pinned to the top of its listing)', type: 'boolean', ...shared },
      { slug: 'report_pdf', label: 'Report PDF', type: 'file', ...shared },
      { slug: 'report_type', label: 'Report type', ...select(['annual', 'quarterly']), ...shared },
      { slug: 'last_updated', label: 'Last updated', type: 'datetime', ...shared },
      { slug: 'seo_title', label: 'SEO title (up to 60 characters)', type: 'string' },
      { slug: 'meta_description', label: 'Meta description (120 to 155 characters)', type: 'text' },
      { slug: 'social_image', label: 'Social image (1200 × 630)', type: 'image', ...shared },
      { slug: 'external', label: 'External (press coverage on another site)', type: 'boolean', ...shared },
      { slug: 'external_url', label: 'External URL', type: 'url', ...shared },
      { slug: 'outlet', label: 'Outlet', type: 'string', ...shared },
      { slug: 'language_tag', label: 'Language tag (e.g. "In Spanish")', type: 'string' },
    ],
  },
  {
    slug: 'categories',
    label: 'Article categories',
    labelSingular: 'Article category',
    titleField: 'name',
    description: 'Resources categories, each listed at /resources/<slug> (stories, financials, news).',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true },
      { slug: 'description', label: 'Description', type: 'text' },
      { slug: 'display_order', label: 'Display order', type: 'integer', ...shared },
    ],
  },
  {
    slug: 'authors',
    label: 'Authors',
    labelSingular: 'Author',
    titleField: 'name',
    description: 'Article bylines; links to the team bio when the author is a team member.',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true, ...shared },
      { slug: 'role', label: 'Role', type: 'string' },
      { slug: 'photo', label: 'Photo', type: 'image', ...shared },
      { slug: 'linkedin', label: 'LinkedIn', type: 'url', ...shared },
      { slug: 'team_member', label: 'Team member', type: 'reference', ...shared },
    ],
  },
  {
    slug: 'partners',
    label: 'Partners',
    labelSingular: 'Partner',
    titleField: 'name',
    description: 'Sponsor and partner organizations. Every logo strip draws from here.',
    fields: [
      { slug: 'name', label: 'Name', type: 'string', required: true, ...shared },
      { slug: 'logo', label: 'Logo', type: 'image', required: true, ...shared },
      { slug: 'logo_light', label: 'Logo for dark backgrounds', type: 'image', ...shared },
      { slug: 'website_url', label: 'Website', type: 'url', ...shared },
      { slug: 'partner_type', label: 'Partner type', ...select(['corporate_sponsor', 'foundation_partner', 'media_partner', 'in_kind_donor']), required: true, ...shared },
      { slug: 'tier', label: 'Tier', ...select(['platinum', 'gold', 'silver', 'bronze']), ...shared },
      { slug: 'display_order', label: 'Display order', type: 'integer', ...shared },
      { slug: 'active', label: 'Active (shown on the general logo strips)', type: 'boolean', required: true, ...shared },
    ],
  },
  {
    slug: 'site_facts',
    label: 'Site facts',
    labelSingular: 'Site fact',
    titleField: 'label',
    description: 'Impact figures, edited once and shown everywhere they appear, each with its period and source.',
    fields: [
      {
        slug: 'key',
        label: 'Figure',
        ...select(['meals_served', 'medical_visits', 'children_in_programs', 'children_in_education', 'corporate_sponsors', 'program_share']),
        required: true,
        ...shared,
      },
      { slug: 'value', label: 'Value (as displayed)', type: 'string', required: true, ...shared },
      { slug: 'label', label: 'Label', type: 'string', required: true },
      { slug: 'detail', label: 'Detail line', type: 'string' },
      { slug: 'period', label: 'Period (what the figure covers)', type: 'string', required: true },
      { slug: 'source', label: 'Source (report)', type: 'reference', ...shared },
      { slug: 'approved', label: 'Approved (off hides it everywhere)', type: 'boolean', required: true, ...shared },
    ],
  },
]

export const MODEL_SLUGS = MODEL_COLLECTIONS.map((c) => c.slug)

// Corporate Sponsorships tiers: page content in the spec (7.6), kept as a
// collection until that page is rebuilt.
export const CORPORATE_TIERS = {
  slug: 'corporate_tiers',
  label: 'Corporate sponsorship tiers',
  labelSingular: 'Corporate sponsorship tier',
  titleField: 'tier_name',
  description: 'The four tiers on Corporate Sponsorships, with their benefits.',
  fields: [
    { slug: 'scope', label: 'Scope', type: 'select', validation: { options: ['general'] }, translatable: false },
    { slug: 'tier_name', label: 'Tier name', type: 'string' },
    { slug: 'price', label: 'Price', type: 'string' },
    { slug: 'recognition_benefits', label: 'Recognition benefits', type: 'json' },
    { slug: 'activity_benefits', label: 'Activity benefits', type: 'json' },
    { slug: 'promotional_benefits', label: 'Promotional item benefits', type: 'json' },
    { slug: 'order', label: 'Order', type: 'integer', translatable: false },
  ],
}

// Donorbox campaigns stored once (spec 8.1, rule 1): pages read them, nobody
// types them into copy. One entry, the same in both languages. An event's
// campaign is its own `registration_url`.
export const DONORBOX_CAMPAIGNS = { general: 'general-donation-vvf', earthquake: 'venezuela-earthquake-relief', sponsorship: 'make-a-difference-55' }
export const DONORBOX_SETTINGS = {
  slug: 'donorbox_settings',
  label: 'Donorbox campaigns',
  labelSingular: 'Donorbox campaigns',
  titleField: 'general_donation',
  description: 'The Donorbox campaign IDs the site links to. Change them here only.',
  fields: [
    { slug: 'general_donation', label: 'General donation campaign ID (Ways to Give)', type: 'string', required: true, translatable: false },
    { slug: 'earthquake_relief', label: 'Earthquake relief campaign ID', type: 'string', required: true, translatable: false },
    { slug: 'child_sponsorship', label: 'Child sponsorship campaign ID (child profiles)', type: 'string', required: true, translatable: false },
  ],
}

// Collections of the earlier model, replaced by the types above, and
// collections the site no longer has: the blog (stories live under
// /resources; Q4 on the spec card) and the earthquake campaign updates (not
// on the live page; Q11).
export const RETIRED_COLLECTIONS = ['resources', 'sponsors', 'sponsorship_packages', 'posts', 'campaign_updates']

// EmDash collection definition (as in seed.json) for a model type.
export function collectionDefinition(c) {
  return {
    slug: c.slug,
    label: c.label,
    labelSingular: c.labelSingular,
    routable: false,
    titleField: c.titleField,
    ...(c.dateField ? { dateField: c.dateField } : {}),
    supports: ['drafts', 'revisions'],
    fields: c.fields,
    description: c.description,
  }
}
