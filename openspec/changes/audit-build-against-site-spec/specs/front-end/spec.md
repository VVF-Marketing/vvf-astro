## ADDED Requirements

### Requirement: Site URL map
The site SHALL serve each page at the path in the VVF website spec's URL map (section 2.2), in English at the root and in Spanish under `/es` with the same slug.

| Page | Path |
| --- | --- |
| Meet the Children | `/children` |
| Child profile | `/children/<slug>` |
| Events & Campaigns | `/events-and-campaigns` |
| Event page | `/events/<slug>` |
| Venezuela Earthquake Relief | `/venezuela-earthquake-relief` |
| Resources | `/resources` |
| Resources category | `/resources/<category>`, where the category is `stories`, `financials` or `news` |
| Article | `/resources/<slug>` |
| Thank-you pages | `/thank-you-sponsorship`, `/thank-you-donation`, `/thank-you-earthquake-relief` |

Pages not listed keep their current paths. The paths outside systems depend on (spec 2.5) SHALL answer 200 directly, never through a redirect: the three thank-you pages, `/venezuela-earthquake-relief`, `/events/<slug>` and `/children/<slug>`.

#### Scenario: Child list path
- **WHEN** a visitor opens `/children` or `/es/children`
- **THEN** the list of children answers 200 in that language

#### Scenario: Shared path never redirects
- **WHEN** Donorbox sends a donor to `/thank-you-donation`
- **THEN** the page answers 200 with no redirect in front of it

### Requirement: Thank-you pages
The site SHALL serve three thank-you pages, one per Donorbox campaign, in both languages. Each page SHALL share one layout and differ only in copy: hero, checklist card, what happens next, and image. Each page SHALL carry `noindex`, SHALL be left out of the sitemap, and SHALL have no inbound link from any page of the site.

#### Scenario: Thank-you page is not indexed
- **WHEN** `/thank-you-sponsorship` is rendered
- **THEN** its head has `<meta name="robots" content="noindex">`, and `/sitemap.xml` doesn't list it

### Requirement: Crawler files
The site SHALL serve `/robots.txt` with one `User-agent: *` group, `Allow: /`, a `Disallow: /_emdash/` line for the CMS admin (Q2 on the spec card), and one `Sitemap:` line for the site's own address. `/sitemap.xml` SHALL list every indexable page in both languages, every child profile included (Q1), and none of the thank-you pages. It SHALL serve `/llms.txt`, a short plain-text guide that links to the key pages at their current paths.

#### Scenario: One sitemap line
- **WHEN** `/robots.txt` is requested
- **THEN** it has exactly one `Sitemap:` line, pointing at `https://www.victoriavenezuelafoundation.org/sitemap.xml`

#### Scenario: Child profiles in the sitemap
- **WHEN** `/sitemap.xml` is requested
- **THEN** it lists each child profile in English and Spanish

### Requirement: News appears only with News articles
The Resources News page, its menu item and its filter button SHALL appear only while at least one News article is published. Without one, `/resources/news` SHALL answer 404 and no page SHALL link to it.

#### Scenario: No News articles
- **WHEN** no article in the News category is published
- **THEN** no menu, footer or filter shows News, and `/resources/news` answers 404

### Requirement: Structured data
Home SHALL carry one schema.org `NGO` block (name "Victoria Venezuela Foundation" with no "Inc." and no `legalName`, url, logo, the page's description in its language, 501(c)(3) status, tax ID, email, telephone, P.O. Box address, and `sameAs` links to Facebook, Instagram, LinkedIn, YouTube and Candid). Each event page SHALL carry one `Event` block from the event's fields, with `offers` (lowest ticket price and registration link) only while registration is open and `eventStatus` cancelled when the event is. Each article page SHALL carry one `Article` block (headline, image, published and modified dates, authors, publisher).

#### Scenario: Offers follow registration
- **WHEN** an event's registration is closed
- **THEN** its Event block has no `offers`

### Requirement: Not Found page
Any unknown path, and any CMS item that doesn't exist, SHALL answer 404 with the navbar, the footer and a "Page Not Found" heading in the visitor's language; a path under `/es/` SHALL get the Spanish page.

#### Scenario: Spanish unknown path
- **WHEN** a visitor requests `/es/no-such-page`
- **THEN** the site answers 404 with the heading "Página no encontrada"

### Requirement: Contact topics
The contact form's topic SHALL be required and SHALL store the topic's English name (General inquiry, Donation support, Child sponsorship, Media and press, Corporate partnership, Events, Volunteering, Other) whatever the page language. `/contact?topic=<value>` SHALL open the page with that topic chosen, server-side, and scroll to the form. Sponsor a Child's "Still have questions?" SHALL set Child sponsorship, Ways to Give's donor-advised fund card Donation support, Our Team's Volunteer buttons Volunteering, and the open board seat Other.

#### Scenario: Topic from a link
- **WHEN** a visitor opens `/es/contact?topic=Volunteering`
- **THEN** the form shows "Volunteering" chosen, with its Spanish label

### Requirement: Children list
Meet the Children SHALL list only available children, newest first, 20 a page with Previous, "Page N of M" and Next. The name search and the age ranges 1-5, 6-10, 11-15 and 16+ (ticks combine as "or") SHALL narrow the list as the visitor types or ticks, with the state in the URL (`?name=…&age=…&page=…`) so a filtered list can be shared; the list SHALL work without scripts. No match SHALL show a line and "Clear filters"; no available children at all SHALL show a line and a button to Ways to Give.

#### Scenario: Shared filtered list
- **WHEN** a visitor opens `/children?name=an`
- **THEN** only available children whose name contains "an" are listed

### Requirement: Child profile
A child profile SHALL be titled "{name} | Sponsor a Child | Victoria Venezuela Foundation" (Spanish "{name} | Apadrina a un niño | Fundación Victoria Venezuela"), use the site share image rather than the child's photo, show the breadcrumb Sponsor a Child › Meet the Children › {name}, use the child's name as the photo's alt text, and on phones place the sponsorship form right after the name and photo.

#### Scenario: Generic share image
- **WHEN** a child profile is shared
- **THEN** its `og:image` is the site share image

### Requirement: Events and campaigns page
Events & Campaigns SHALL show active campaigns, upcoming events (soonest first) and an archive mixing past events and completed campaigns (newest first, six a page, tagged EVENT or CAMPAIGN with a "Concluded" band). Campaigns SHALL be cards edited on the page (title, date range, summary, link, photo, status active or completed). A list SHALL show up to four cards and a "See all N" button; an odd number of cards SHALL make the first wide. Below 768 px the sections SHALL sit under Events and Campaigns tabs, opening on Campaigns while one is active, and `#campaigns`, `#upcoming-events` and `#past-events` SHALL open their tab. The hero SHALL have no button.

#### Scenario: Archive anchor on a phone
- **WHEN** a phone opens `/events-and-campaigns#past-events`
- **THEN** the Events tab is selected and the archive is in view

### Requirement: Shared earthquake appeal
Ways to Give and Venezuela Earthquake Relief SHALL show the same earthquake appeal block (site-wide copy): the render of the planned centre with a caption saying the images are AI renders, "What your gift will pay for", and "Give to the appeal" opening the Donorbox earthquake campaign; on Ways to Give the link SHALL carry the page's tracking tags.

#### Scenario: Appeal opens the earthquake campaign
- **WHEN** a visitor presses "Give to the appeal" on Ways to Give
- **THEN** it opens `donorbox.org/venezuela-earthquake-relief` with `utm_source=website`, `utm_medium=ways-to-give` and `utm_campaign=give-block`

### Requirement: Open board seat
Our Team SHALL show the Board and Our Team sections only, and one navy invitation tile under the Board for every open seat, drawn from the team member marked as an open seat (its board position states the seats). The tile SHALL link to `/contact?topic=Other` and have no bio page.

#### Scenario: Open seat tile
- **WHEN** a visitor opens `/our-team`
- **THEN** one tile under the Board links to Contact with the topic Other, and none appears under Our Team

### Requirement: Tag Manager
When a Google Tag Manager container is configured (`GTM_CONTAINER_ID`, set in production), every page in both languages SHALL load it once, with the standard snippet in the head, and no other tag loader SHALL be in the page code. With no container configured no tags SHALL load. Whether staging loads it waits on the spec card's Q10.

#### Scenario: Production page
- **WHEN** the site runs with `GTM_CONTAINER_ID=GTM-W33SN672`
- **THEN** each page's head loads `googletagmanager.com/gtm.js?id=GTM-W33SN672` once and no other analytics script

### Requirement: Donorbox campaigns stored once
The general donation, earthquake relief and child sponsorship Donorbox campaign IDs SHALL be stored once, in a CMS settings entry, and read by every page that links to, pops up or embeds them; an event's campaign SHALL be its `registration_url`. Every link to a Donorbox page SHALL open in a new tab. Ways to Give's "Give to the appeal" SHALL open the earthquake campaign's Donorbox popup, in the spec's `blue`, and Donorbox's script SHALL load once, and only where a Donorbox popup or embedded form appears. Every Ways to Give link to Donorbox SHALL carry `utm_source=website`, `utm_medium=ways-to-give` and `utm_campaign=give-block`.

#### Scenario: Changed campaign ID
- **WHEN** an editor changes the earthquake relief campaign ID in the settings
- **THEN** every earthquake donate button and the popup use the new ID

### Requirement: Forms post as HTML forms
The Contact and Newsletter forms SHALL post as normal HTML forms to the site, carrying the path of the page they were sent from; Contact SHALL post the topic's stored English value. Required fields and the consent box SHALL be checked before sending, with messages in the page's language, and again on the server. After sending, the page SHALL show the result in its language. Each submission SHALL be emailed through a transactional mail service (Resend; Q9) to info@victoriavenezuelafoundation.org and enrique@paulainc.ca, from "Victoria Venezuela Foundation website", with the subject "New {form name} submission", the visitor's address as reply-to, the fields and the page. While no mail service is configured, a valid submission SHALL tell the visitor the form can't send yet and give the email address to write to, so no message is silently lost.

#### Scenario: Spanish validation message
- **WHEN** a visitor sends the Spanish Contact form with the email empty
- **THEN** the form doesn't send and shows the required-field message in Spanish

#### Scenario: A sent message
- **WHEN** a visitor sends a valid Contact form from `/es/contact` with the topic Volunteering
- **THEN** both addresses receive "New Contact submission" with the topic "Volunteering" and the page `/es/contact`

### Requirement: Earthquake Relief as the live page
Venezuela Earthquake Relief SHALL keep the sections of the live page (Q11): hero, proceeds statement, what happened, support centres, the shared appeal, an image, how to help, the newsletter, Point of Contact and Our Response, with the last two titled as styled text rather than headings, as live. It SHALL show no campaign updates.

#### Scenario: No campaign updates
- **WHEN** a visitor opens `/venezuela-earthquake-relief`
- **THEN** the page ends with Our Response and shows no campaign updates

### Requirement: No blog
The site SHALL have no blog (Q4): `/blog` SHALL redirect to `/resources`, and each former post to its counterpart (the matching article or event page), or to `/resources`.

#### Scenario: Old post
- **WHEN** a visitor requests `/blog/golf-tournament-2025-recap`
- **THEN** they receive one 301 to `/events/2025-golf-tournament`

## MODIFIED Requirements

### Requirement: Resources pages
The site SHALL provide `/resources` (all resources), `/resources/<category>` for each Resources category (`stories`, `financials`, `news`), and `/resources/<slug>` (detail with breadcrumbs, last-updated date, authors, body, and optional download). No article SHALL use the slug `stories`, `financials` or `news`, because those paths belong to the category pages. The list pages SHALL show the newest featured article (within the category on a category page) as a large card and leave it out of the grid, six articles a page with `?page=N` carrying its own canonical, filter buttons All, Stories, Financial Reports (and News when it has an article), and a Related sidebar of three articles that never lists press articles. A category page SHALL take its heading, title and description from its category. A press article (on another website) SHALL link to the outlet, reading "Read on {outlet} ↗", and SHALL have no page of its own.

#### Scenario: Stories category page
- **WHEN** a visitor opens `/resources/stories`
- **THEN** only resources in the stories category are listed as article cards

#### Scenario: Page 2
- **WHEN** a visitor opens `/resources?page=2`
- **THEN** the grid shows the next six articles and the canonical URL ends in `?page=2`

#### Scenario: Unknown resource
- **WHEN** a visitor requests `/resources/does-not-exist`
- **THEN** the site responds 404

### Requirement: Legacy route mapping
Each of these paths SHALL answer a single permanent (301) redirect straight to its target, in English and under `/es`. No redirect SHALL chain into another.

| From | To |
| --- | --- |
| `/all-events` | `/events-and-campaigns` |
| `/sponsor-a-child-list-page` | `/children` |
| `/resources-categories/all` | `/resources` |
| `/resources-categories/stories` | `/resources/stories` |
| `/resources-categories/financials-transparency` | `/resources/financials` |
| `/resources-categories/news` | `/resources/news` |
| `/team-members/<slug>` | `/our-team/<slug>` |

The old project paths SHALL also redirect: `/events` → `/events-and-campaigns`, `/sponsor-a-child/children[/<slug>]` → `/children[/<slug>]`, `/earthquake-relief` → `/venezuela-earthquake-relief`, and `/resources/category/<category>` → `/resources/<category>`, where the category `financials-transparency` maps to `financials`.

The old WordPress news paths (`/noticias`, `/category/noticias`, `/en/noticias`, `/en/category/noticias`) SHALL redirect to `/es/resources/news`. The paths listed under "Site URL map" as never redirected SHALL NOT be the source of any redirect.

Every redirect in Webflow's own 301 list (exported 2026-10-14) SHALL answer one 301 straight to today's page for its target, including `/en/<path>` → `/<path>`. Redirects whose old address names a child SHALL be kept in the CMS's redirects table, filled from the local seed and moved by the data import, and never committed to the repository.

#### Scenario: Old WordPress donate page
- **WHEN** a visitor requests `/donate`
- **THEN** they receive one 301 to `/ways-to-give`, which answers 200

#### Scenario: Old events list
- **WHEN** a visitor requests `/es/all-events`
- **THEN** they receive one 301 to `/es/events-and-campaigns`

#### Scenario: Earthquake relief redirect
- **WHEN** a visitor requests the old project path `/earthquake-relief`
- **THEN** they receive one 301 to `/venezuela-earthquake-relief`, which answers 200
