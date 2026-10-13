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
  'footer.link.ourTeam': { label: 'Footer link: Our Team', default: 'Our Team', maxLength: 40 },
  'footer.link.sponsorChild': { label: 'Footer link: Sponsor a Child', default: 'Sponsor a Child', maxLength: 40 },
  'footer.link.waysToGive': { label: 'Footer link: Ways to Give', default: 'Ways to Give', maxLength: 40 },
  'footer.link.corporate': { label: 'Footer link: Corporate Sponsorships', default: 'Corporate Sponsorships', maxLength: 40 },
  'footer.link.events': { label: 'Footer link: Events', default: 'Events', maxLength: 40 },
  'footer.link.earthquake': { label: 'Footer link: Earthquake relief', default: 'Earthquake relief', maxLength: 40 },
  'footer.link.news': { label: 'Footer link: News', default: 'News', maxLength: 40 },
  'footer.link.financials': { label: 'Footer link: Financials', default: 'Financials', maxLength: 40 },
  'footer.link.donate': { label: 'Footer link: Donate now', default: 'Donate now', maxLength: 40 },
  'footer.link.contact': { label: 'Footer link: Contact us', default: 'Contact us', maxLength: 40 },
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
  'contactForm.submit': { label: 'Contact form: send button', default: 'Send Message', maxLength: 30 },

  // Newsletter
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
  'card.bidNow': { label: 'Auction item: bid button', default: 'Bid Now', maxLength: 30 },
  'card.eventDetails': { label: 'Event card: details link', default: 'See the details', maxLength: 30 },
  'card.buyTickets': { label: 'Tickets: buy button (when the offer sets none)', default: 'Buy Tickets', maxLength: 30 },
  'card.soldOut': { label: 'Tickets: sold out', default: 'Sold out', maxLength: 30 },
  'card.becomeSponsor': { label: 'Sponsorship: button (when the package sets none)', default: 'Become a Sponsor', maxLength: 30 },

  // Resources
  'resources.heading': { label: 'Resources: page heading', default: 'Resources', maxLength: 60 },
  'resources.viewAll': { label: 'Resources: "all" filter', default: 'View All', maxLength: 30 },
  'resources.filtersLabel': { label: 'Resources: filter list name (screen readers)', default: 'Resource categories' },
  'resources.empty': { label: 'Resources: empty category message', default: 'No resources in this category yet.', maxLength: 120 },
  'resources.related': { label: 'Resource page: related heading', default: 'Related', maxLength: 40 },
  'resources.category.stories': { label: 'Resource category: Stories (tags, filters)', default: 'Stories', maxLength: 30 },
  'resources.category.financials': { label: 'Resource category: Financials (tags, filters)', default: 'Financials', maxLength: 30 },

  // Financial report cards
  'report.download': { label: 'Report card: download button', default: 'Download', maxLength: 20 },
  'report.read': { label: 'Report card: read button', default: 'Read', maxLength: 20 },

  // Team
  'team.eyebrow': { label: 'Team profile: label above name', default: 'Our Team', maxLength: 30 },
  'team.since': { label: 'Team profile: "Since" label', default: 'Since', maxLength: 20 },
  'team.from': { label: 'Team profile: "From" label', default: 'From', maxLength: 20 },
  'team.basedIn': { label: 'Team profile: "Based in" label', default: 'Based in', maxLength: 20 },
  'team.background': { label: 'Team profile: background heading', default: 'Background', maxLength: 30 },

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

  // Events
  'event.whatWhenWhere': { label: 'Event page: details heading', default: 'What, When and Where', maxLength: 60 },
  'event.specialHeading': { label: 'Event page: special opportunities heading (default)', default: 'Special Event Opportunities', maxLength: 60 },
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

  // Carousels and navigation (screen readers)
  'a11y.breadcrumb': { label: 'Breadcrumb name (screen readers)', default: 'Breadcrumb' },
  'a11y.prevPhotos': { label: 'Gallery: previous button (screen readers)', default: 'Previous photos' },
  'a11y.nextPhotos': { label: 'Gallery: next button (screen readers)', default: 'Next photos' },
  'a11y.prevLogos': { label: 'Logo carousel: previous button (screen readers)', default: 'Previous logos' },
  'a11y.nextLogos': { label: 'Logo carousel: next button (screen readers)', default: 'Next logos' },
  'a11y.prevStory': { label: 'Stories carousel: previous button (screen readers)', default: 'Previous story' },
  'a11y.nextStory': { label: 'Stories carousel: next button (screen readers)', default: 'Next story' },
  'a11y.newTab': { label: 'Added to every link to another website (screen readers)', default: '(opens in a new tab)', maxLength: 40 },
})
