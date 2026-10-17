// Every numbered check in the VVF website spec (Paula Inc., Google Drive),
// keyed "<section>-<check>". The spec is confidential and this repo is public:
// labels here are our own short wording, never the spec's. The spec copy,
// coverage map and reports live in the gitignored /.spec-audit/ folder.
// See openspec/changes/audit-build-against-site-spec/design.md (D1, D2).

export const SPEC_VERSION = '0.27'

export type Verify = 'auto' | 'manual' | 'blocked'
export type Triage = 'straightforward' | 'decision'
export type Batch = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export interface Check {
  id: string
  label: string
  verify: Verify
  // Test file (relative to e2e/spec-audit) for auto checks.
  file?: string
  // Why a check is manual or blocked, and how to run it by hand.
  reason?: string
  steps?: string
  // Step 1 question (Q1…) on the Basecamp card this check waits on.
  question?: string
  triage?: Triage
  batch?: Batch
  // Passes in both languages; runs in the CI e2e job from then on (D15).
  conformant?: boolean
}

const URLS = '02-urls.spec.ts'
const NAV = '03-navigation.spec.ts'
const MODEL = '04-content-model.audit.ts'
const DESIGN = '05-design.spec.ts'
const SHARED = '06-shared.spec.ts'
const PAGES_A = '07a-pages.spec.ts'
const PAGES_B = '07b-pages.spec.ts'
const PAGES_C = '07c-pages.spec.ts'
const INTEGRATIONS = '08-integrations.spec.ts'

const NO_HOST = 'Needs a deployed site (no production host chosen yet).'

export const CHECKS: Check[] = [
  // 2. URLs and routing
  { id: '2.8-1', triage: 'straightforward', batch: 'A', conformant: true, label: 'Every mapped path answers 200 in both languages', verify: 'auto', file: URLS },
  { id: '2.8-2', triage: 'straightforward', batch: 'A', conformant: true, label: 'html lang is es-VE on Spanish pages and en-US on English ones', verify: 'auto', file: URLS },
  { id: '2.8-3', triage: 'straightforward', batch: 'A', conformant: true, label: 'hreflang en-US, es-VE and x-default on every page, all answering 200', verify: 'auto', file: URLS },
  { id: '2.8-4', triage: 'straightforward', batch: 'A', conformant: true, label: 'Spanish pages link only to Spanish paths (switch excepted)', verify: 'auto', file: URLS },
  { id: '2.8-5', triage: 'straightforward', batch: 'A', conformant: true, label: 'Each old path is one 301 to its new path, both languages', verify: 'auto', file: URLS },
  { id: '2.8-6', conformant: true, triage: 'decision', batch: 'F', label: "Every redirect from Webflow's list lands on a 200 in one step", verify: 'auto', file: URLS, question: 'Q3' },
  { id: '2.8-7', triage: 'straightforward', batch: 'A', conformant: true, label: 'Paths outside systems depend on answer 200 with no redirect', verify: 'auto', file: URLS },
  {
    id: '2.8-8',
    triage: 'straightforward',
    batch: 'A',
    label: 'The CMS refuses reserved article slugs',
    verify: 'manual',
    reason: 'Needs the CMS admin.',
    steps: 'In /_emdash/admin, create an article with each reserved slug; saving must fail with a message.',
  },
  { id: '2.8-9', triage: 'decision', batch: 'A', conformant: true, label: 'robots.txt: one Sitemap line, no existing path blocked', verify: 'auto', file: URLS, question: 'Q2' },
  { id: '2.8-10', conformant: true, triage: 'decision', batch: 'A', label: 'Sitemap lists every indexable page in both languages, no thank-you pages', verify: 'auto', file: URLS, question: 'Q1' },

  // 3. Sitemap and navigation
  { id: '3.4-1', conformant: true, triage: 'straightforward', batch: 'A', label: 'Every listed page is reachable from menu, footer or its listed page', verify: 'auto', file: NAV },
  { id: '3.4-2', triage: 'straightforward', batch: 'A', conformant: true, label: 'Menu and footer are the same on every page of a language', verify: 'auto', file: NAV },
  { id: '3.4-3', triage: 'straightforward', batch: 'A', conformant: true, label: 'Nothing on the site links to the thank-you pages', verify: 'auto', file: NAV },
  { id: '3.4-4', triage: 'straightforward', batch: 'A', conformant: true, label: 'News link and page exist only while a News article is published', verify: 'auto', file: NAV },

  // 4. Content model
  { id: '4.4-1', conformant: true, triage: 'straightforward', batch: 'C', label: 'Every migrated item has a Spanish version; empty Spanish fields are listed', verify: 'auto', file: MODEL, question: 'Q4' },
  {
    id: '4.4-2',
    triage: 'straightforward',
    batch: 'C',
    label: 'Webflow drafts were not migrated',
    verify: 'manual',
    reason: 'Needs the Webflow draft list.',
    steps: 'Compare the event list in the CMS with the published Webflow events: no test recap and no 2022–2025 placeholders.',
  },
  { id: '4.4-3', conformant: true, triage: 'straightforward', batch: 'C', label: 'One team record per person', verify: 'auto', file: MODEL },
  {
    id: '4.4-4',
    triage: 'straightforward',
    batch: 'C',
    label: 'Filtered lists filter by slug or enum, never by item id',
    verify: 'manual',
    reason: 'Code review.',
    steps: 'Grep the content layer and pages for filters on CMS ids; every list filter must use a slug or enum key.',
  },
  { id: '4.5-1', conformant: true, triage: 'straightforward', batch: 'C', label: 'Every content type and field of the target model exists with its type and required flag', verify: 'auto', file: MODEL },
  {
    id: '4.5-2',
    triage: 'decision',
    batch: 'C',
    label: "English-only items can't be published until Spanish is complete",
    verify: 'manual',
    question: 'Q6',
    reason: 'Needs the CMS admin.',
    steps: 'Create an item in English only and try to publish it; publishing must be refused until the Spanish required fields are filled.',
  },
  { id: '4.5-3', conformant: true, triage: 'straightforward', batch: 'C', label: 'Reordering an ordered reference reorders the page', verify: 'auto', file: MODEL },
  { id: '4.5-4', conformant: true, triage: 'straightforward', batch: 'C', label: 'Only available children are listed; other profiles still answer', verify: 'auto', file: MODEL },
  { id: '4.5-5', conformant: true, triage: 'straightforward', batch: 'C', label: 'A person in two groups shows in both sections with one bio URL', verify: 'auto', file: MODEL },
  { id: '4.5-6', conformant: true, triage: 'straightforward', batch: 'C', label: 'Benefit grid: one column per package offer, in order, with check marks', verify: 'auto', file: MODEL },
  { id: '4.5-7', conformant: true, triage: 'straightforward', batch: 'C', label: 'Article SEO title, description and image fall back to title, excerpt and featured image', verify: 'auto', file: MODEL },
  { id: '4.5-8', conformant: true, triage: 'straightforward', batch: 'C', label: 'Event share image falls back to the hero photo', verify: 'auto', file: MODEL },

  // 5. Design system
  { id: '5.9-1', triage: 'straightforward', batch: 'B', conformant: true, label: 'No sideways scroll or clipped text at the five widths, both languages', verify: 'auto', file: DESIGN },
  { id: '5.9-2', triage: 'straightforward', batch: 'B', conformant: true, label: 'Site CSS uses only the palette colours', verify: 'auto', file: DESIGN },
  { id: '5.9-3', triage: 'straightforward', batch: 'B', conformant: true, label: 'Only Nunito and Open Sans load', verify: 'auto', file: DESIGN },
  { id: '5.9-4', conformant: true, triage: 'straightforward', batch: 'B', label: 'One H1 per page; heading sizes match the type scale', verify: 'auto', file: DESIGN, question: 'Q11' },
  {
    id: '5.9-5',
    triage: 'straightforward',
    batch: 'B',
    label: 'Donorbox and Double the Donation widget text is readable',
    verify: 'manual',
    reason: 'Third-party widgets need network access and a visual check.',
    steps: 'Open a child profile and Corporate Sponsorships at 1440 and 375 px; widget text must be at least 14 px.',
  },
  { id: '5.9-6', triage: 'straightforward', batch: 'B', conformant: true, label: 'Section padding is one of the allowed values', verify: 'auto', file: DESIGN },
  { id: '5.9-7', triage: 'straightforward', batch: 'B', conformant: true, label: 'Content photos crop instead of stretching', verify: 'auto', file: DESIGN },
  { id: '5.9-8', triage: 'straightforward', batch: 'B', conformant: true, label: 'Carousels, tabs, accordion and phone menu work by keyboard and touch', verify: 'auto', file: DESIGN },
  { id: '5.9-9', triage: 'straightforward', batch: 'B', conformant: true, label: 'No button label wraps at the five widths, both languages', verify: 'auto', file: DESIGN },
  { id: '5.9-10', triage: 'straightforward', batch: 'B', conformant: true, label: 'No repeated id on a page', verify: 'auto', file: DESIGN },

  // 6. Shared page parts
  { id: '6.4-1', triage: 'straightforward', batch: 'B', conformant: true, label: 'Navbar and footer are the same on every page of a language', verify: 'auto', file: SHARED },
  { id: '6.4-2', triage: 'straightforward', batch: 'B', conformant: true, label: 'Language switch keeps the visitor on the same page', verify: 'auto', file: SHARED },
  { id: '6.4-3', triage: 'straightforward', batch: 'B', conformant: true, label: 'Phone menu labels open the menu without navigating', verify: 'auto', file: SHARED },
  { id: '6.4-4', triage: 'straightforward', batch: 'B', conformant: true, label: 'Footer copyright shows the current year', verify: 'auto', file: SHARED },

  // 7.1 Home
  { id: '7.1-1', conformant: true, triage: 'straightforward', batch: 'D', label: 'Home heading levels: one H1, H2 sections, H3 cards', verify: 'auto', file: PAGES_A },
  { id: '7.1-2', conformant: true, triage: 'straightforward', batch: 'D', label: 'Home main buttons go to their pages in both languages', verify: 'auto', file: PAGES_A },
  { id: '7.1-3', triage: 'straightforward', batch: 'D', conformant: true, label: 'Home events carousel: upcoming featured events, soonest first; controls only when needed', verify: 'auto', file: PAGES_A },
  { id: '7.1-4', conformant: true, triage: 'straightforward', batch: 'D', label: 'Partner strip: no link without a website; inactive partners hidden', verify: 'auto', file: PAGES_A },
  { id: '7.1-5', triage: 'straightforward', batch: 'D', conformant: true, label: 'Impact report button follows the newest annual report', verify: 'auto', file: PAGES_A },
  {
    id: '7.1-6', conformant: true,
    triage: 'straightforward',
    batch: 'D',
    label: 'NGO structured data validates',
    verify: 'auto',
    file: PAGES_A,
    steps: 'Also paste the rendered JSON-LD into validator.schema.org before launch; the suite checks structure and required properties offline.',
  },
  { id: '7.1-7', conformant: true, triage: 'straightforward', batch: 'D', label: 'Phone hero photo used on phones when set', verify: 'auto', file: PAGES_A },
  // 7.2 Sponsor a Child
  { id: '7.2-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'Sponsor a Child buttons go to the child list; anchors scroll to How it works', verify: 'auto', file: PAGES_A },
  { id: '7.2-2', conformant: true, triage: 'straightforward', batch: 'D', label: 'Carousel shows all available children, newest first, linking to profiles', verify: 'auto', file: PAGES_A },
  { id: '7.2-3', conformant: true, triage: 'straightforward', batch: 'D', label: 'A sponsored child leaves the carousel', verify: 'auto', file: PAGES_A },
  { id: '7.2-4', conformant: true, triage: 'straightforward', batch: 'D', label: '"Still have questions?" opens Contact with the sponsorship topic', verify: 'auto', file: PAGES_A },
  // 7.3 Meet the Children
  { id: '7.3-1', conformant: true, triage: 'straightforward', batch: 'D', label: 'Child list: available only, 20 per page, newest first', verify: 'auto', file: PAGES_A },
  { id: '7.3-2', conformant: true, triage: 'decision', batch: 'D', label: 'Name search and age ranges narrow the list and clear', verify: 'auto', file: PAGES_A, question: 'Q7' },
  { id: '7.3-3', conformant: true, triage: 'decision', batch: 'D', label: 'Filter state survives in the URL', verify: 'auto', file: PAGES_A, question: 'Q7' },
  { id: '7.3-4', triage: 'straightforward', batch: 'D', conformant: true, label: 'Child cards open the right profile in the page language', verify: 'auto', file: PAGES_A },
  // 7.4 Child Profile
  { id: '7.4-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'No Birthday row without a birth date', verify: 'auto', file: PAGES_A },
  { id: '7.4-2', triage: 'straightforward', batch: 'D', conformant: true, label: 'Donorbox sponsorship form on every profile', verify: 'auto', file: PAGES_A },
  { id: '7.4-3', conformant: true, triage: 'straightforward', batch: 'D', label: 'On phones the form follows name and photo', verify: 'auto', file: PAGES_A },
  { id: '7.4-4', conformant: true, triage: 'straightforward', batch: 'D', label: "Profile share image is the site image, not the child's photo", verify: 'auto', file: PAGES_A },
  // 7.5 Ways to Give
  { id: '7.5-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'Amount buttons open Donorbox with the amount and UTM tags', verify: 'auto', file: PAGES_A },
  { id: '7.5-2', triage: 'straightforward', batch: 'D', conformant: true, label: 'Golf block hidden without an upcoming featured event', verify: 'auto', file: PAGES_A },
  { id: '7.5-3', conformant: true, triage: 'straightforward', batch: 'D', label: 'Appeal button opens the earthquake campaign', verify: 'auto', file: PAGES_A },
  // 7.6 Corporate Sponsorships
  { id: '7.6-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'Hero button scrolls to the packages', verify: 'auto', file: PAGES_A },
  { id: '7.6-2', triage: 'straightforward', batch: 'D', conformant: true, label: 'Each tier shows its own benefits in both languages', verify: 'auto', file: PAGES_A },
  {
    id: '7.6-3',
    triage: 'straightforward',
    batch: 'D',
    label: 'Employer search returns results',
    verify: 'manual',
    reason: 'Third-party search (Double the Donation) needs network access.',
    steps: 'On Corporate Sponsorships, search "Microsoft" in the company matching widget; results appear.',
  },

  // 7.7 Events & Campaigns
  { id: '7.7-1', conformant: true, triage: 'straightforward', batch: 'D', label: 'Events move from Upcoming to the archive by date, with no edit', verify: 'auto', file: PAGES_B },
  { id: '7.7-2', conformant: true, triage: 'straightforward', batch: 'D', label: 'Lists show up to four plus "See all"; odd counts make the first card wide', verify: 'auto', file: PAGES_B },
  { id: '7.7-3', conformant: true, triage: 'straightforward', batch: 'D', label: 'No active campaign: no campaigns band, phone opens on Events', verify: 'auto', file: PAGES_B },
  { id: '7.7-4', conformant: true, triage: 'straightforward', batch: 'D', label: '#past-events on a phone opens the Events tab at the archive', verify: 'auto', file: PAGES_B },
  { id: '7.7-5', triage: 'straightforward', batch: 'D', label: 'Archive paginates six per page in both languages', verify: 'auto', file: PAGES_B },
  // 7.8 Event Page
  { id: '7.8-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'Lifecycle picks selling page, recap or cancelled notice', verify: 'auto', file: PAGES_B },
  { id: '7.8-2', triage: 'straightforward', batch: 'D', conformant: true, label: 'Sold-out registration hides every ticket button and shows the note', verify: 'auto', file: PAGES_B },
  { id: '7.8-3', conformant: true, triage: 'straightforward', batch: 'D', label: 'Sold-out offers show the badge; sold-out opportunity tabs are locked', verify: 'auto', file: PAGES_B },
  { id: '7.8-4', triage: 'straightforward', batch: 'D', conformant: true, label: 'Empty recap sections are not shown', verify: 'auto', file: PAGES_B },
  {
    id: '7.8-5', conformant: true,
    triage: 'straightforward',
    batch: 'D',
    label: 'Event structured data validates, offers only while registration is open',
    verify: 'auto',
    file: PAGES_B,
    steps: 'Also paste the rendered JSON-LD into validator.schema.org before launch; the suite checks structure and required properties offline.',
  },
  {
    id: '7.8-6',
    triage: 'decision',
    batch: 'D',
    label: 'Recap reminder email after the event',
    verify: 'blocked',
    question: 'Q8',
    // Q8 answered: a dashboard reminder now (src/plugins/recapReminder.ts), the email with hosting.
    reason: 'The dashboard reminder is built; the email needs a scheduler and a mail service. ' + NO_HOST,
  },
  // 7.9 Our Team
  { id: '7.9-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'A person in board and staff shows in both, same bio', verify: 'auto', file: PAGES_B },
  { id: '7.9-2', conformant: true, triage: 'straightforward', batch: 'D', label: 'Open seat tile only under Board, opens Contact with topic Other', verify: 'auto', file: PAGES_B },
  { id: '7.9-3', triage: 'straightforward', batch: 'D', conformant: true, label: 'Display order sorts the cards', verify: 'auto', file: PAGES_B },
  // 7.10 Team Bio
  { id: '7.10-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'LinkedIn icon only with a URL, opens in a new tab', verify: 'auto', file: PAGES_B },
  { id: '7.10-2', triage: 'straightforward', batch: 'D', conformant: true, label: 'No Background box without items', verify: 'auto', file: PAGES_B },
  { id: '7.10-3', triage: 'straightforward', batch: 'A', conformant: true, label: 'Old team-member paths redirect to the bio', verify: 'auto', file: PAGES_B },
  // 7.11 Financials & Transparency
  { id: '7.11-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'Quarterly reports list follows the content', verify: 'auto', file: PAGES_B },
  { id: '7.11-2', triage: 'straightforward', batch: 'D', conformant: true, label: 'Report without a PDF shows Read and no Download', verify: 'auto', file: PAGES_B },
  { id: '7.11-3', triage: 'straightforward', batch: 'D', conformant: true, label: 'Board oversight lists board members from the team records', verify: 'auto', file: PAGES_B },

  // 7.12 Resources
  { id: '7.12-1', conformant: true, triage: 'straightforward', batch: 'D', label: 'Stories articles list on Resources and Stories only, newest first', verify: 'auto', file: PAGES_C },
  { id: '7.12-2', conformant: true, triage: 'straightforward', batch: 'D', label: 'Featured article not repeated on the page', verify: 'auto', file: PAGES_C },
  { id: '7.12-3', conformant: true, triage: 'straightforward', batch: 'D', label: 'Page 2 works with its own canonical', verify: 'auto', file: PAGES_C },
  { id: '7.12-4', triage: 'straightforward', batch: 'D', label: 'Press cards open the outlet in a new tab; no page of their own', verify: 'auto', file: PAGES_C },
  // 7.13 Article
  { id: '7.13-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'No download button without a PDF', verify: 'auto', file: PAGES_C },
  { id: '7.13-2', triage: 'straightforward', batch: 'D', conformant: true, label: 'Two authors shown in order', verify: 'auto', file: PAGES_C },
  { id: '7.13-3', triage: 'straightforward', batch: 'D', conformant: true, label: 'Related never lists the article itself', verify: 'auto', file: PAGES_C },
  {
    id: '7.13-4', conformant: true,
    triage: 'straightforward',
    batch: 'D',
    label: 'Article structured data validates',
    verify: 'auto',
    file: PAGES_C,
    steps: 'Also paste the rendered JSON-LD into validator.schema.org before launch; the suite checks structure and required properties offline.',
  },
  // 7.14 Contact
  { id: '7.14-1', conformant: true, triage: 'straightforward', batch: 'D', label: 'Topic links preselect the Contact topic in both languages', verify: 'auto', file: PAGES_C },
  { id: '7.14-2', conformant: true, triage: 'straightforward', batch: 'D', label: "Form won't send without required fields and consent", verify: 'auto', file: PAGES_C },
  { id: '7.14-3', conformant: true, triage: 'straightforward', batch: 'E', label: 'Submissions store the English topic value', verify: 'auto', file: PAGES_C },
  // 7.15 Earthquake Relief
  { id: '7.15-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'Every donate button opens the earthquake campaign', verify: 'auto', file: PAGES_C },
  { id: '7.15-2', conformant: true, triage: 'straightforward', batch: 'D', label: 'AI-render caption shown with the render', verify: 'auto', file: PAGES_C },
  // 7.16 Privacy Policy
  {
    id: '7.16-1',
    triage: 'straightforward',
    batch: 'D',
    label: 'Privacy policy matches the live page word for word',
    verify: 'manual',
    reason: 'Needs the live site.',
    steps: 'Run the parity text comparison (npm run test:parity) for /privacy-policy and /es/privacy-policy; no text differences.',
  },
  // 7.17 Thank-you pages
  { id: '7.17-1', triage: 'straightforward', batch: 'A', conformant: true, label: 'Thank-you pages answer 200 with noindex and no redirect', verify: 'auto', file: PAGES_C },
  { id: '7.17-2', triage: 'straightforward', batch: 'A', conformant: true, label: 'Nothing links to the thank-you pages', verify: 'auto', file: PAGES_C },
  {
    id: '7.17-3',
    triage: 'straightforward',
    batch: 'D',
    label: 'Test gifts land on their thank-you page and GTM counts them',
    verify: 'blocked',
    reason: 'Needs Donorbox test gifts against a deployed site. ' + NO_HOST,
  },
  // 7.19 Our Programs
  { id: '7.19-1', triage: 'straightforward', batch: 'D', conformant: true, label: 'Explore scrolls to the Nutrition block', verify: 'auto', file: PAGES_C },
  { id: '7.19-2', conformant: true, triage: 'straightforward', batch: 'D', label: 'One dot per program photo, none for a single photo', verify: 'auto', file: PAGES_C },
  { id: '7.19-3', conformant: true, triage: 'straightforward', batch: 'D', label: 'Dragging program photos moves one photo, never follows a link', verify: 'auto', file: PAGES_C },
  { id: '7.19-4', triage: 'straightforward', batch: 'D', conformant: true, label: 'Our Programs buttons go to their pages in the visitor language', verify: 'auto', file: PAGES_C },

  // 8. Integrations
  { id: '8.9-1', triage: 'straightforward', batch: 'E', label: 'Test gifts count one GA4 conversion each; plain visits none', verify: 'blocked', reason: NO_HOST },
  { id: '8.9-2', triage: 'straightforward', batch: 'E', label: 'Home sends one page_view and no conversion', verify: 'blocked', reason: NO_HOST },
  { id: '8.9-3', triage: 'decision', batch: 'E', label: 'GTM container loads once on every page, no other tag loader', verify: 'auto', file: INTEGRATIONS, question: 'Q10' },
  { id: '8.9-4', triage: 'straightforward', batch: 'E', conformant: true, label: 'Ways to Give Donorbox links carry the UTM tags', verify: 'auto', file: INTEGRATIONS },
  { id: '8.9-5', triage: 'straightforward', batch: 'E', conformant: true, label: 'Donorbox links open in a new tab; script only where needed', verify: 'auto', file: INTEGRATIONS },
  { id: '8.9-6', triage: 'straightforward', batch: 'E', label: 'Sponsorship form, earthquake popup and employer search render and respond', verify: 'auto', file: INTEGRATIONS },
  {
    id: '8.9-7',
    triage: 'decision',
    batch: 'E',
    label: 'Form submissions reach both addresses with page and topic',
    verify: 'blocked',
    question: 'Q9',
    // Q9 answered: Resend (src/lib/forms.ts), then HubSpot.
    reason: 'Sending is built (Resend); a test send needs the API key and the verified domain. ' + NO_HOST,
  },
  { id: '8.9-8', conformant: true, triage: 'straightforward', batch: 'E', label: 'Spanish uses apadrinar for children and usted only on Corporate', verify: 'auto', file: INTEGRATIONS },
  { id: '8.9-9', triage: 'straightforward', batch: 'E', conformant: true, label: '"Inc." only on financial reports', verify: 'auto', file: INTEGRATIONS },
  { id: '8.9-10', conformant: true, triage: 'straightforward', batch: 'E', label: 'Children shown by first name and last initial only', verify: 'auto', file: INTEGRATIONS },
]

export function check(id: string): Check {
  const found = CHECKS.find((c) => c.id === id)
  if (!found) throw new Error(`No spec check ${id} in the registry`)
  return found
}
