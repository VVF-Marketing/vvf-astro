// The settings each deployed mode requires (openspec/changes/make-app-portable
// D1, run-on-vercel-functions D2). Shared by the container's launcher
// (scripts/start.mjs), the Vercel-target guard in src/middleware.ts, and the
// pre-deploy check, so all three agree on what "missing" means.
export function missingSettings(env = process.env) {
  const required = []
  if (env.DB_ADAPTER === 'postgres') required.push('DATABASE_URL')
  if (env.STORAGE === 's3') required.push('S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY')
  return required.filter((name) => !env[name])
}
