// Site-wide interface text (src/lib/copy.ts): header, footer, forms, buttons
// and the labels shared components render on every page. Read through
// getGlobalCopy (src/lib/globalCopy.ts). Link targets stay in code.
import { defineCopy, GLOBAL_ROUTE } from '../lib/copy'

export default defineCopy(GLOBAL_ROUTE, {
  // Header
  'header.homeLink': { label: 'Header: logo link (screen readers)', default: 'Victoria Venezuela Foundation home' },
  'header.logoAlt': { label: 'Header and footer: logo description', default: 'Victoria Venezuela Foundation' },
  'header.navLabel': { label: 'Header: navigation name (screen readers)', default: 'Primary' },
  'header.menuButton': { label: 'Header: mobile menu button (screen readers)', default: 'Menu' },
  'header.languageLabel': { label: 'Header: language switch name (screen readers)', default: 'Language' },
  'header.donate': { label: 'Header: Donate button', default: 'Donate', maxLength: 20 },
  'header.contact': { label: 'Header: Contact button', default: 'Contact Us', maxLength: 20 },

  // Announcement banner
  'banner.text': { label: 'Announcement banner: message (when the campaign sets none)', default: 'Earthquake relief: Venezuelan families need help now.', maxLength: 120 },
  'banner.cta': { label: 'Announcement banner: link text', default: 'See how you can give →', maxLength: 40 },

  // Footer
  'footer.legal': {
    label: 'Footer: legal note',
    default: 'Victoria Venezuela Foundation is a 501(c)(3) non-profit organization.\nContributions are tax-deductible under Internal Revenue Code Section 501(c)(3).',
  },
  'footer.address': { label: 'Footer: tax ID and mailing address', default: 'Tax ID: 88-3282100\nP.O. Box 327222\nWeston, FL 33332' },
  'footer.candidAlt': { label: 'Footer: Candid seal description', default: 'Candid Platinum Transparency seal, 2023 to 2026' },
  'footer.candidText': { label: 'Footer: Candid seal caption', default: "Candid's Platinum Transparency Recipients 2023-2026" },
  // Footer links use the menu's words: title case in English, sentence case in Spanish (spec 6.3).
  'footer.link.ourPrograms': { label: 'Footer link: Our Programs', default: 'Our Programs', maxLength: 40 },
  'footer.link.ourTeam': { label: 'Footer link: Our Team', default: 'Our Team', maxLength: 40 },
  'footer.link.sponsorChild': { label: 'Footer link: Sponsor a Child', default: 'Sponsor a Child', maxLength: 40 },
  'footer.link.waysToGive': { label: 'Footer link: Ways to Give', default: 'Ways to Give', maxLength: 40 },
  'footer.link.corporate': { label: 'Footer link: Corporate Sponsorships', default: 'Corporate Sponsorships', maxLength: 40 },
  'footer.link.events': { label: 'Footer link: Events & Campaigns', default: 'Events & Campaigns', maxLength: 40 },
  'footer.link.earthquake': { label: 'Footer link: Earthquake Relief', default: 'Earthquake Relief', maxLength: 40 },
  'footer.link.news': { label: 'Footer link: News', default: 'News', maxLength: 40 },
  'footer.link.financials': { label: 'Footer link: Financials & Transparency', default: 'Financials & Transparency', maxLength: 40 },
  'footer.link.donate': { label: 'Footer link: Donate Now', default: 'Donate Now', maxLength: 40 },
  'footer.link.contact': { label: 'Footer link: Contact Us', default: 'Contact Us', maxLength: 40 },
  'footer.contactHeading': { label: 'Footer: contact heading', default: 'Contact', maxLength: 30 },
  'footer.creditPrefix': { label: 'Footer: design credit text', default: 'Designed and Developed by' },
  'footer.creditName': { label: 'Footer: design credit name', default: 'Paula Inc.' },
  'footer.copyright': { label: 'Footer: copyright ({year} is replaced with the current year)', default: '© {year} Victoria Venezuela Foundation. All rights reserved.' },
  'footer.privacy': { label: 'Footer link: Privacy policy', default: 'Privacy policy', maxLength: 40 },

  // Contact form
  'contactForm.firstName': { label: 'Contact form: first name field', default: 'First Name', maxLength: 30 },
  'contactForm.lastName': { label: 'Contact form: last name field', default: 'Last Name', maxLength: 30 },
  'contactForm.email': { label: 'Contact form: email field', default: 'Email', maxLength: 30 },
  'contactForm.phone': { label: 'Contact form: phone field', default: 'Phone Number', maxLength: 30 },
  'contactForm.topic': { label: 'Contact form: topic question', default: 'What is this about?', maxLength: 60 },
  'contactForm.topicPlaceholder': { label: 'Contact form: topic prompt (no topic chosen yet)', default: 'Choose a topic', maxLength: 40 },
  'contactForm.topic.general': { label: 'Contact form topic: general', default: 'General inquiry', maxLength: 40 },
  'contactForm.topic.donation': { label: 'Contact form topic: donation support', default: 'Donation support', maxLength: 40 },
  'contactForm.topic.sponsorship': { label: 'Contact form topic: child sponsorship', default: 'Child sponsorship', maxLength: 40 },
  'contactForm.topic.media': { label: 'Contact form topic: media and press', default: 'Media and press', maxLength: 40 },
  'contactForm.topic.corporate': { label: 'Contact form topic: corporate partnership', default: 'Corporate partnership', maxLength: 40 },
  'contactForm.topic.events': { label: 'Contact form topic: events', default: 'Events', maxLength: 40 },
  'contactForm.topic.volunteering': { label: 'Contact form topic: volunteering', default: 'Volunteering', maxLength: 40 },
  'contactForm.topic.other': { label: 'Contact form topic: other', default: 'Other', maxLength: 40 },
  'contactForm.message': { label: 'Contact form: message field', default: 'Message', maxLength: 30 },
  'contactForm.consent': { label: 'Contact form: consent text before the privacy link', default: 'I agree to the', maxLength: 60 },
  'contactForm.consentLink': { label: 'Contact form: privacy policy link text', default: 'Privacy Policy', maxLength: 40 },
  'contactForm.sent': { label: 'Contact form: after sending', default: 'We’ve received your message. A member of our team will be in touch soon.', maxLength: 200 },
  'form.required': { label: 'Forms: a required field is empty', default: 'Please fill in this field.', maxLength: 80 },
  'form.email': { label: 'Forms: the email address is not valid', default: 'Please enter a valid email address.', maxLength: 80 },
  'form.topic': { label: 'Forms: no topic chosen', default: 'Please choose a topic.', maxLength: 80 },
  'form.consent': { label: 'Forms: privacy consent not ticked', default: 'Please accept the Privacy Policy to send your message.', maxLength: 100 },
  'form.invalid': { label: 'Forms: sent with missing or invalid fields', default: 'Oops! Something went wrong while submitting the form.', maxLength: 120 },
  'form.unavailable': { label: 'Forms: sending not set up yet', default: "We can't send this form yet. Please email us at info@victoriavenezuelafoundation.org.", maxLength: 160 },
  'contactForm.submit': { label: 'Contact form: send button', default: 'Send Message', maxLength: 30 },

  // Newsletter
  'newsletter.sent': { label: 'Newsletter box: after subscribing', default: "Thank you for your interest! Going forward, we'll keep you up to date regarding our events and campaigns.", maxLength: 200 },
  'newsletter.heading': { label: 'Newsletter box: heading', default: 'Stay connected', maxLength: 60 },
  'newsletter.text': { label: 'Newsletter box: intro', default: 'Keep up with our news and events', maxLength: 160 },
  'newsletter.emailLabel': { label: 'Newsletter box: email field name (screen readers)', default: 'Email' },
  'newsletter.placeholder': { label: 'Newsletter box: email placeholder', default: 'Enter your email', maxLength: 40 },
  'newsletter.submit': { label: 'Newsletter box: subscribe button', default: 'Subscribe', maxLength: 30 },
  'newsletter.privacy': { label: 'Newsletter box: privacy note', default: 'We respect your privacy. Unsubscribe at any time.', maxLength: 160 },

  // Contact call-to-action box
  'contactCta.heading': { label: 'Contact box: heading', default: 'Get in Touch', maxLength: 60 },
  'contactCta.call': { label: 'Contact box: phone label', default: 'Call:', maxLength: 20 },
  'contactCta.email': { label: 'Contact box: email label', default: 'Email:', maxLength: 20 },
  'contactCta.address': { label: 'Contact box: address label', default: 'Address:', maxLength: 20 },

  // Cards and lists
  'card.readOn': { label: 'Article card: read link', default: 'Read on', maxLength: 30 },
  'card.readOnOutlet': { label: 'Press card: link to the outlet ({outlet} is replaced)', default: 'Read on {outlet} ↗', maxLength: 40 },
  'card.bidNow': { label: 'Auction item: bid button', default: 'Bid Now', maxLength: 30 },
  'card.eventDetails': { label: 'Event card: details link', default: 'See the details', maxLength: 30 },
  'card.buyTickets': { label: 'Tickets: buy button (when the offer sets none)', default: 'Buy Tickets', maxLength: 30 },
  'card.soldOut': { label: 'Tickets: sold out', default: 'Sold out', maxLength: 30 },
  'card.becomeSponsor': { label: 'Sponsorship: button (when the package sets none)', default: 'Become a Sponsor', maxLength: 30 },

  // Resources
  'resources.heading': { label: 'Resources: page heading', default: 'Resources', maxLength: 60 },
  'resources.viewAll': { label: 'Resources: "all" filter', default: 'All', maxLength: 30 },
  'resources.breadcrumb': { label: 'Resources category page: breadcrumb back link', default: 'Resources', maxLength: 30 },
  'resources.filtersLabel': { label: 'Resources: filter list name (screen readers)', default: 'Resource categories' },
  'resources.empty': { label: 'Resources: empty category message', default: 'No resources in this category yet.', maxLength: 120 },
  'resources.related': { label: 'Resource page: related heading', default: 'Related', maxLength: 40 },
  'resources.category.stories': { label: 'Resource category: Stories (tags, filters)', default: 'Stories', maxLength: 30 },
  'resources.category.financials': { label: 'Resource category: Financials (tags, filters)', default: 'Financial Reports', maxLength: 30 },
  'resources.category.news': { label: 'Resource category: News (tags, filters)', default: 'News', maxLength: 30 },

  // Financial report cards
  'report.download': { label: 'Report card: download button', default: 'Download', maxLength: 20 },
  'report.read': { label: 'Report card: read button', default: 'Read', maxLength: 20 },

  // Team
  'team.eyebrow': { label: 'Team profile: label above name', default: 'Our Team', maxLength: 30 },
  'team.since': { label: 'Team profile: "Since" label', default: 'Since', maxLength: 20 },
  'team.from': { label: 'Team profile: "From" label', default: 'From', maxLength: 20 },
  'team.basedIn': { label: 'Team profile: "Based in" label', default: 'Based in', maxLength: 20 },
  'team.background': { label: 'Team profile: background heading', default: 'Background', maxLength: 30 },
  'team.linkedin': { label: 'Team profile: LinkedIn link, read by screen readers ({name} is replaced with the name)', default: '{name} on LinkedIn', maxLength: 60 },

  // Children
  'child.age': { label: 'Child profile: age label', default: 'Age', maxLength: 20 },
  'child.ageValue': { label: 'Child profile: age ({age} is replaced with the number)', default: '{age} years old', maxLength: 30 },
  'child.birthday': { label: 'Child profile: birthday label', default: 'Birthday', maxLength: 20 },
  'child.gender': { label: 'Child profile: gender label', default: 'Gender', maxLength: 20 },
  'child.dream': { label: 'Child profile: dream label', default: 'Dream', maxLength: 20 },
  'child.gender.Male': { label: 'Child profile: gender value "Male"', default: 'Male', maxLength: 20 },
  'child.gender.Female': { label: 'Child profile: gender value "Female"', default: 'Female', maxLength: 20 },
  'child.breadcrumb': { label: 'Child profile: breadcrumb back link', default: 'Sponsor a Child', maxLength: 40 },
  'child.carouselLabel': { label: 'Children carousel name (screen readers)', default: 'More children' },
  'child.carouselPrev': { label: 'Children carousel: previous button (screen readers)', default: 'Previous children' },

  // Events
  'event.whatWhenWhere': { label: 'Event page: details heading', default: 'What, When and Where', maxLength: 60 },
  'event.specialHeading': { label: 'Event page: special opportunities heading (default)', default: 'Special Event Opportunities', maxLength: 60 },
  'event.soldTab': { label: 'Event page: added to a sold-out special opportunity tab', default: '(SOLD)', maxLength: 20 },
  'event.packagesLabel': { label: 'Event page: sponsor package tabs (screen readers)', default: 'Sponsor packages' },
  'event.recognition': { label: 'Sponsor package: Recognition group', default: 'Recognition', maxLength: 30 },
  'event.promotional': { label: 'Sponsor package: Promotional Items group', default: 'Promotional Items', maxLength: 30 },
  'event.activities': { label: 'Sponsor package: Activities group', default: 'Activities', maxLength: 30 },
  'event.benefitsTable': { label: 'Benefits table name (screen readers)', default: 'Sponsorship benefits by package' },
  'event.benefitsHeader': { label: 'Benefits table: first column heading', default: 'Sponsorship\nBenefits', maxLength: 40 },
  'event.included': { label: 'Benefits table: included mark (screen readers)', default: 'Included' },

  // Giving
  'gift.amountLabel': { label: 'Gift amounts name (screen readers)', default: 'Gift amount' },
  'gift.other': { label: 'Gift amounts: other amount', default: 'Other', maxLength: 20 },
  'gift.continue': { label: 'Gift amounts: continue button (default)', default: 'Continue to payment', maxLength: 30 },

  // Earthquake appeal block (Ways to Give, Earthquake Relief)
  'appeal.text': { label: 'Earthquake appeal: text', default: "Funds raised from this campaign will go towards the construction of VVF's permanent support centre in La Guaira. When it opens it will provide shelter, nutrition and medical care to 500 displaced children and their families.", maxLength: 340 },
  'appeal.imageAlt': { label: 'Earthquake appeal: render description', default: 'Render of the planned VVF support centre in La Guaira, seen from the street.', maxLength: 120 },
  'appeal.caption': { label: 'Earthquake appeal: render caption (must say the images are AI renders)', default: 'How the centre in La Guaira will look. The centre is not built yet. These images are AI-generated renders.', maxLength: 140 },
  'appeal.cardsLabel': { label: 'Earthquake appeal: cards heading', default: 'What your gift will pay for', maxLength: 50 },
  'appeal.title.1': { label: 'Earthquake appeal: card 1 title', default: 'Shelter', maxLength: 20 },
  'appeal.text.1': { label: 'Earthquake appeal: card 1 text', default: 'A safe place to stay for families whose homes were destroyed in the June 2026 earthquakes.', maxLength: 140 },
  'appeal.imageAlt.1': { label: 'Earthquake appeal: card 1 image description', default: 'Families arriving at the courtyard of the planned VVF support centre.', maxLength: 110 },
  'appeal.title.2': { label: 'Earthquake appeal: card 2 title', default: 'Medical care', maxLength: 20 },
  'appeal.text.2': { label: 'Earthquake appeal: card 2 text', default: 'Check-ups, medicine and treatment for children and their families at the center.', maxLength: 120 },
  'appeal.imageAlt.2': { label: 'Earthquake appeal: card 2 image description', default: 'A nurse examining a young girl while her mother sits beside her.', maxLength: 100 },
  'appeal.title.3': { label: 'Earthquake appeal: card 3 title', default: 'Nutrition', maxLength: 20 },
  'appeal.text.3': { label: 'Earthquake appeal: card 3 text', default: 'Daily meals for the children staying at the support center in La Guaira.', maxLength: 110 },
  'appeal.imageAlt.3': { label: 'Earthquake appeal: card 3 image description', default: "Children eating a hot meal together in the centre's dining room.", maxLength: 100 },
  'appeal.give': { label: 'Earthquake appeal: give button', default: 'Give to the appeal', maxLength: 30 },
  'appeal.learnMore': { label: 'Earthquake appeal: learn more button', default: 'Learn More', maxLength: 20 },

  // Not Found page
  'notFound.heading': { label: 'Not Found page: heading and title', default: 'Page Not Found', maxLength: 40 },

  // Lists split into pages (children, articles, event archive)
  'pagination.previous': { label: 'Pagination: previous page', default: 'Previous', maxLength: 20 },
  'pagination.next': { label: 'Pagination: next page', default: 'Next', maxLength: 20 },
  'pagination.status': { label: 'Pagination: where you are ({page} and {pages} are replaced)', default: 'Page {page} of {pages}', maxLength: 30 },
  'pagination.label': { label: 'Pagination name (screen readers)', default: 'Pages' },

  // Carousels and navigation (screen readers)
  'a11y.breadcrumb': { label: 'Breadcrumb name (screen readers)', default: 'Breadcrumb' },
  'a11y.prevPhotos': { label: 'Gallery: previous button (screen readers)', default: 'Previous photos' },
  'a11y.nextPhotos': { label: 'Gallery: next button (screen readers)', default: 'Next photos' },
  'a11y.prevLogos': { label: 'Logo carousel: previous button (screen readers)', default: 'Previous logos' },
  'a11y.nextLogos': { label: 'Logo carousel: next button (screen readers)', default: 'Next logos' },
  'a11y.prevStory': { label: 'Stories carousel: previous button (screen readers)', default: 'Previous story' },
  'a11y.nextStory': { label: 'Stories carousel: next button (screen readers)', default: 'Next story' },
  'a11y.slide': { label: 'Swipe row: dot for one slide (screen readers; {n} is the number)', default: 'Show item {n}' },
  'a11y.photoDot': { label: 'Program photos: dot for one photo (screen readers; {n} is the number)', default: 'Show photo {n}' },
  'a11y.newTab': { label: 'Added to every link to another website (screen readers)', default: '(opens in a new tab)', maxLength: 40 },
})
