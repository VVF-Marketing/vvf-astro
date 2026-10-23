// Third-party hosts the e2e suite never reaches (openspec/changes/
// add-vercel-deploy-pipeline, design D9). Their scripts add elements, ids,
// links and requests of their own and change without notice, so tests that
// check this site's pages would fail on someone else's markup. Tag hosts
// (GTM, GA, Ads, LinkedIn) are also cut so test runs never reach VVF's
// analytics, and font and video CDNs fail fast instead of holding the
// page's load event.
const ALWAYS = ['fonts.gstatic.com', 'www.gstatic.com', '*.youtube.com', '*.ytimg.com', '*.googletagmanager.com', '*.google-analytics.com', '*.doubleclick.net', '*.licdn.com']

// The widgets' own hosts: reachable only for the checks that test the
// widgets themselves (8.9-6, playwright.spec-audit.config.ts).
const WIDGETS = ['donorbox.org', '*.donorbox.org', 'doublethedonation.com', '*.doublethedonation.com']

const rules = (hosts: string[]) => `--host-resolver-rules=${hosts.map((h) => `MAP ${h} 127.0.0.1`).join(', ')}`

// Chromium launch options: every third-party host cut, or all but the widgets'.
export const blockThirdParty = { args: [rules([...ALWAYS, ...WIDGETS])] }
export const blockAllButWidgets = { args: [rules(ALWAYS)] }

// The checks that need the widgets to load.
export const WIDGET_CHECKS = /\[8\.9-6\]/
