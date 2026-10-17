## Purpose

Organizes the CMS admin so marketing can find any page's text, SEO, content item or the site banner without knowing how the site is built, within the admin's one level of sidebar folders.

## ADDED Requirements

### Requirement: Sidebar folders
The admin sidebar SHALL show the site's collections in three folders, in this order:
- **Pages & SEO**: one entry per page copy collection.
- **CMS collections**: Events, Blog posts, Resources, FAQs, Testimonials, Team members, Sponsors / partners, Sponsorship packages, Silent auction items, Earthquake relief updates, Children.
- **Banner**: Site banner.

Every collection of the site SHALL be in exactly one of these folders or hidden. EmDash's own entries (media, menus, settings, …) are unaffected.

#### Scenario: Marketing opens the admin
- **WHEN** an editor opens the admin
- **THEN** the sidebar shows the folders "Pages & SEO", "CMS collections" and "Banner", and no site collection outside them

#### Scenario: New collection added
- **WHEN** a developer adds a content collection
- **THEN** a check fails until the collection is assigned to a folder or hidden

### Requirement: Page entries in Pages & SEO
Pages & SEO SHALL contain one entry per page copy collection, named after the page as editors know it (e.g. "Home", "Ways to Give", "Financials & Transparency"). Shared text SHALL be named for where it appears: "Event pages (shared text)", "Resource pages (shared text)" and "Blog post pages (shared text)" for detail templates, and "Site-wide text" for the header, footer, buttons and forms. Entries SHALL appear in the order of the site's main menu, followed by the remaining pages, then the shared-text entries, with "Site-wide text" last.

#### Scenario: Finding a page's text
- **WHEN** an editor wants to change the Ways to Give hero heading
- **THEN** they open Pages & SEO › Ways to Give and find it there, without seeing any other page's text

#### Scenario: Finding footer text
- **WHEN** an editor wants to change the footer newsletter heading
- **THEN** they find it under Pages & SEO › Site-wide text

### Requirement: SEO and Content sections inside a page
Inside a page entry, each slot's title SHALL be its number on the page, its section ("SEO" for the page's title, description and share image, "Content" for everything else) and its label, e.g. "01 · SEO · Title" or "04 · Content · Hero heading". Numbers SHALL put every SEO slot first, then the content slots in the order they appear on the page, and SHALL be zero-padded so sorting the list by title gives that order.

#### Scenario: Opening a page
- **WHEN** an editor opens Pages & SEO › Home and sorts by Title
- **THEN** the first rows are "01 · SEO · Title", "02 · SEO · Description" and "03 · SEO · Share image", followed by "Content" rows from the top of the page down

#### Scenario: Found by its text
- **WHEN** an editor types words they see on the Home page into the search box of Pages & SEO › Home
- **THEN** the slots whose text contains those words are listed

### Requirement: Drafts found by status, not by folder
Unpublished edits SHALL stay on the same entry as the live version, not in a separate folder or collection. In every collection, an editor SHALL be able to list only entries with unpublished changes by using the list's status filter. The marketing guide SHALL explain the filter and the "unpublished changes" marker.

#### Scenario: Reviewing pending edits on a page
- **WHEN** an editor has saved, but not published, changes to two Home slots and filters Pages & SEO › Home by Draft
- **THEN** exactly those two slots are listed

#### Scenario: No duplicate draft area
- **WHEN** the sidebar is inspected
- **THEN** there is no separate "Draft" folder or collection mirroring the live pages

### Requirement: Site banner
The site-wide banner SHALL be edited in one entry, "Site banner", holding the banner text and a switch that shows or hides it, so both are always changed and published together. Field labels SHALL say what each field does on the site.

#### Scenario: Turning the banner off
- **WHEN** an editor turns off "Show the banner" in Site banner and publishes
- **THEN** no page shows the banner, and its text is kept for next time

### Requirement: System collections hidden
Collections maintained only by the system (the static page inventory) SHALL NOT appear in the sidebar. They SHALL remain readable through the API, MCP and their direct admin URL.

#### Scenario: Inventory out of the way
- **WHEN** an editor opens the admin
- **THEN** "Static pages" is not in the sidebar, and an administrator can still open it by URL

### Requirement: Collections describe themselves
Every collection in the sidebar SHALL have a one-sentence, plain-language description of what it controls on the site. Page copy collections SHALL name the page's address.

#### Scenario: Unfamiliar collection
- **WHEN** an editor opens "Sponsorship packages"
- **THEN** a description explains which pages show those packages

### Requirement: Existing sites updated without losing edits
Applying the new organization to an existing CMS SHALL change only collection definitions and sidebar settings, and SHALL move existing page copy (published values, unpublished drafts, Spanish translations) into the page copy collections. It SHALL NOT change menus, site settings or any content value. Running it again SHALL change nothing.

#### Scenario: Upgrade keeps marketing's edits
- **WHEN** the organization is applied to a CMS where marketing has edited the home hero heading, has an unpublished draft on the contact page, and has edited the primary menu
- **THEN** the hero heading, the draft and the menu are all unchanged, and the copy now appears under Pages & SEO

#### Scenario: Applied twice
- **WHEN** the organization is applied a second time
- **THEN** nothing is created, moved or changed
