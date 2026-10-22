#!/usr/bin/env node
// Create the media bucket (S3_BUCKET) if it doesn't exist yet. Used by
// docker-compose and CI for the local S3-compatible store; safe to re-run.
// Nothing to do under STORAGE=blob: Blob stores are created in Vercel
// (store-media-in-vercel-blob, D5).
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'

if (process.env.STORAGE === 'blob') {
  console.log('STORAGE=blob: no bucket to create (Blob stores are created in Vercel).')
  process.exit(0)
}

const bucket = process.env.S3_BUCKET
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
})

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }))
  console.log(`Bucket ${bucket} exists.`)
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }))
  console.log(`Bucket ${bucket} created.`)
}
