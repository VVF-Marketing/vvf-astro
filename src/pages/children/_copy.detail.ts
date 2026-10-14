// Copy slots shared by every child profile (/children/*, src/lib/copy.ts):
// the template's fixed text. {name} is replaced with the child's name.
import { defineCopy } from '../../lib/copy'

export default defineCopy('/children/*', {
  'seo.titleTemplate': { label: 'SEO title ({name} is replaced)', default: '{name} | Sponsor a Child | Victoria Venezuela Foundation', maxLength: 90 },
  'seo.descriptionTemplate': {
    label: 'Meta description ({name} is replaced)',
    default: 'Meet {name}, one of the children supported by Victoria Venezuela Foundation in Venezuela. Learn how sponsorship works.',
    maxLength: 200,
  },
  'breadcrumb.list': { label: 'Breadcrumb: link to the child list', default: 'Meet the Children', maxLength: 40 },
  'about.heading': { label: 'About heading ({name} is replaced)', default: 'About {name}', maxLength: 60 },
  'form.title': { label: 'Sponsorship form name (screen readers; {name} is replaced)', default: 'Sponsor {name} through Donorbox', maxLength: 80 },
})
