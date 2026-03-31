import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { r2Client } from './client'
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
  }))
}
