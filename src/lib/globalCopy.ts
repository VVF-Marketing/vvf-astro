// Site-wide interface text for the current request, fetched once per request
// however many components ask for it.
import globalCopy from '../copy/_copy'
import { getPageCopy } from './content'
import { localeFromPath } from './i18n'

type GlobalCopy = Awaited<ReturnType<typeof getPageCopy<typeof globalCopy.slots>>>['copy']

// Keyed by `locals`, which is one object for the whole request. Not by the
// Request: on /es pages the middleware's rewrite gives the page a new Request,
// so the middleware and the page would each load the copy.
const perRequest = new WeakMap<object, Promise<GlobalCopy>>()

export function getGlobalCopy(astro: { locals: object; originPathname: string }): Promise<GlobalCopy> {
  let copy = perRequest.get(astro.locals)
  if (!copy) {
    copy = getPageCopy(globalCopy, localeFromPath(astro.originPathname)).then((r) => r.copy)
    perRequest.set(astro.locals, copy)
  }
  return copy
}

// Fills `{name}` placeholders in a slot value, e.g. fill(t['child.ageValue'], { age: 7 }).
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match))
}

// Splits a multi-line plain slot into lines (rendered with <br />).
export function lines(text: string): string[] {
  return text.split('\n')
}
