// The banner on preview deployments (openspec/changes/add-vercel-deploy-pipeline,
// D8): previews hold only public content and stand-in children, and testers
// are asked not to upload real photos. Vercel sets VERCEL_ENV on every
// deployment; it's read at runtime, so production never shows the banner.
export const PREVIEW_BANNER_TEXT = "Preview — test data only; don't upload real photos."

export function showPreviewBanner(env: string | undefined): boolean {
  return env === 'preview'
}
