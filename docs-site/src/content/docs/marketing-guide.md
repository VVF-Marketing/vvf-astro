---
title: Editing the Site (Marketing Guide)
description: How the marketing team changes text, SEO and content in English and Spanish, safely, with an AI assistant or the admin.
---

You can change the site's text, its search-engine titles and descriptions, and its content (events, team, resources, FAQs…) in **English and Spanish**, without a developer and without waiting for a deploy. You can't break the layout, the design or how the site works: the system only lets you change words, and some images.

## Getting access

1. A site administrator invites you as an **Editor**. Accept the email and set up your sign-in (passkey or magic link).
2. **Admin:** sign in at `https://<site>/_emdash/admin`.
3. **AI assistant (optional):** in your assistant's settings, add a custom connector with the address `https://<site>/_emdash/api/mcp` and sign in when asked. From then on you can ask it things like *"In the Home copy collection, change the hero heading to …"*. Naming the page's collection (*Home*, *Ways to Give*, *Site-wide text*…) helps it find the right entry.

## Finding your way around the admin

The sidebar has three folders:

| Folder | What's in it |
| --- | --- |
| **Pages & SEO** | One entry per page: *Home*, *Ways to Give*, *Our Programs*… Each holds that page's text and its search/sharing details. Text shared by every event, resource or blog post page is under *Event pages (shared text)* and similar; the header, footer, buttons and forms are under *Site-wide text*, at the bottom. |
| **CMS collections** | Events, Blog posts, Resources, FAQs, Testimonials, Team members, Sponsors / partners, Sponsorship packages, Silent auction items, Earthquake relief updates and Children. |
| **Banner** | *Site banner*: the message at the top of every page, and the switch that shows or hides it. |

**Inside a page**, click the **Title** column to sort: the page's search and sharing details come first (*01 · SEO · …*), then its text from the top of the page down (*04 · Content · Hero heading*, *05 · Content · …*). To find an entry by the words you see on the site, type them into the list's **search** box.

## What you can change

- **Page text** — every heading, paragraph, button label and image description, under **Pages & SEO › *the page***. Each entry's title says where it appears.
- **Search and sharing** — each page's *SEO title* (up to 60 characters), *meta description* (up to 160) and *social share image*: the *SEO* entries at the top of the page.
- **Site-wide text** — header, footer, forms and buttons: **Pages & SEO › Site-wide text**.
- **Content** — under **CMS collections**: events (including an event's appeal section and contact details), team members, resources, FAQs, sponsors, sponsorship packages. Mark a financial report's *report kind* (annual or quarterly) and it appears on Financials & Transparency. Menus are under *Menus*.
- **The banner** — **Banner › Site banner**: change the text, or turn *Show the banner* off (the text is kept for next time).
- **Testimonials** — the Our Programs page shows a testimonials section only when the **Testimonials** collection has published entries. Add only real quotes from people who agreed to be quoted.

Text has a maximum length so it fits the design; if a change is too long, you'll be told the limit.

## Linking to other pages of the site

Write links to the site as a **path**, starting with `/` — for example `/ways-to-give` or `/events/2026-golf-tournament` — not as the full address (`https://www.victoriavenezuelafoundation.org/...`). You don't need to add `/es` in Spanish text: the site always sends readers to the page in the language they're reading. If you paste a full address of the site, you'll be asked to use the path instead. Links to other websites are written in full, as usual. They open in a new tab automatically, and screen readers announce that; you don't need to set anything.

## Drafts, publishing and undo

- Saving creates a **draft**. Nothing changes on the public site until you **publish**.
- Drafts aren't in a separate place: they stay on the same entry, marked as having unpublished changes. To see everything still waiting, open a page or collection and set the **status filter** at the top of the list to *Draft*.
- Before publishing, use **compare** (or ask your assistant to compare) to see exactly what changed.
- Changed your mind after publishing? Open the item's **revisions** and restore an earlier one, then publish.
- Deleting moves items to the **trash**, where they can be restored.

## Spanish

- Every page also exists under `/es` (for example `/es/ways-to-give`). The language switch (EN | ES) is in the header.
- Each page text entry and content item has an English and a Spanish version. If the Spanish one is empty, the site shows the English text there.
- To translate, edit the Spanish version — or ask your assistant to draft it. **Translations are always saved as drafts**: read them, fix the tone, then publish. Please don't publish machine translations without reading them.
- A page shows up in Spanish for search engines once its **Spanish SEO title** is filled in, so translate that first. Texts you haven't translated yet show in English.
- Unpublishing something in English takes it down in Spanish too.

## What you'll be stopped from doing (and why)

- **Child profiles** can only be changed by the safeguarding team. You can see published profiles but not change, publish, translate or delete them — these are children, and every change needs safeguarding sign-off.
- **Page structure, links and design** live in the site's code. You can change a button's text, not where it goes; you can't add sections, styles or CSS classes. Ask a developer for those.
- **Menus** must link to real pages (in Spanish menus, Spanish pages).
- **Collections, fields, settings and users** are for administrators.

If something is refused, the message says why. If you think it should be allowed, ask a site administrator.
