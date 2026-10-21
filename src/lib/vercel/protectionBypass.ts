// Vercel Deployment Protection bypass (openspec/changes/run-on-vercel-functions,
// design D5): the static-page sync calls its own deployment's CMS API, which on
// a protected preview needs this header. Vercel sets the secret when
// "Protection Bypass for Automation" is on; elsewhere no header is sent.
export function protectionBypassHeaders(secret: string | undefined): Record<string, string> | undefined {
  return secret ? { 'x-vercel-protection-bypass': secret } : undefined
}
