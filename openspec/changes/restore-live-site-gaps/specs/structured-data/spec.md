## Purpose

The machine-readable layer of every page: JSON-LD, social sharing tags, `llms.txt` and sitemap freshness. Search engines, social networks and answer engines read the site through it, in both languages.

## ADDED Requirements

### Requirement: Linked organization
The home page SHALL emit one NGO node with `@id` `<site>/#organization` and a WebSite node that names it as publisher, with the page's language as `inLanguage`. The NGO node SHALL include:
- `logo` and `image`;
- a `contactPoint` with the foundation's email and phone;
- `areaServed` Venezuela;
- a `potentialAction` of type DonateAction whose target is the Ways to Give page in the page's language.

Every other node that names the foundation as organizer, publisher or employer SHALL carry that `@id`.

#### Scenario: Event links to the organization
- **WHEN** an event page is rendered
- **THEN** its Event node's `organizer` has `"@id": "https://www.victoriavenezuelafoundation.org/#organization"`, with the foundation's name and URL beside it for readers that don't join nodes across blocks

#### Scenario: Donate action in Spanish
- **WHEN** `/es` is rendered
- **THEN** the NGO node's DonateAction target is `https://www.victoriavenezuelafoundation.org/es/ways-to-give`

### Requirement: FAQ structured data
A page that shows a list of questions and answers SHALL emit one FAQPage node with exactly the questions and answers it shows, in the page's language. A page showing no questions SHALL emit none.

#### Scenario: Sponsor a Child questions
- **WHEN** `/sponsor-a-child` is rendered
- **THEN** it has a FAQPage node whose question count equals the number of questions on the page

### Requirement: Breadcrumb structured data
A page that shows a breadcrumb trail SHALL emit a BreadcrumbList node with the same items, in the same order, with absolute URLs.

#### Scenario: Article breadcrumbs
- **WHEN** a resource article is rendered
- **THEN** its BreadcrumbList matches the visible trail, ending with the article's title

### Requirement: Person structured data
A team member's profile page SHALL emit a Person node with the member's name, role as `jobTitle`, photo as `image` when there is one, and `worksFor` pointing at the organization `@id`.

#### Scenario: Board member profile
- **WHEN** `/our-team/randy-lander` is rendered
- **THEN** it has a Person node named "Randy Lander" with `worksFor` set to the organization `@id`

### Requirement: Social sharing tags
Every page SHALL output:
- `og:title`, `og:description`, `og:image` and `og:image:alt`;
- `twitter:card`, `twitter:title`, `twitter:description` and `twitter:image`;
- a `theme-color` meta tag.

`og:type` SHALL be `article` on resource articles and `website` elsewhere.

#### Scenario: Article type
- **WHEN** a resource article is rendered
- **THEN** its head has `<meta property="og:type" content="article">` and a `twitter:title` equal to its `og:title`

### Requirement: Generated llms.txt
`/llms.txt` SHALL be generated from the site's content when requested. It SHALL include:
- the organization summary;
- the key pages with one line each;
- the upcoming events;
- the latest reports;
- a short set of common questions with answers;
- a Spanish section linking the `/es` pages.

It SHALL link only to pages that exist.

#### Scenario: Upcoming event listed
- **WHEN** an event is upcoming
- **THEN** `/llms.txt` lists it with its date and page URL

### Requirement: Sitemap freshness
Each `/sitemap.xml` entry backed by CMS content (events, articles, team profiles, child profiles) SHALL carry a `lastmod` date: the newest update of its English or Spanish entry. Static pages carry no `lastmod`, since no reliable date exists for them.

#### Scenario: Event lastmod
- **WHEN** `/sitemap.xml` is requested
- **THEN** each event URL has a `<lastmod>` in `YYYY-MM-DD` form
