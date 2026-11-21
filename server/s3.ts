import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface PresignResult {
  mode: 's3' | 'demo';
  uploadUrl: string | null;
  publicUrl: string | null;
  key: string;
}

function getConfiguredBucket(): string | undefined {
  return process.env.AWS_S3_BUCKET?.trim() || process.env.AWS_S3_BUCKET_NAME?.trim() || undefined;
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim() &&
      getConfiguredBucket(),
  );
}

export async function createProductImagePresign(
  filename: string,
  contentType: 'image/webp' | 'image/jpeg' | 'image/png',
): Promise<PresignResult> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const key = `products/${Date.now()}-${safeName}`;

  if (!isS3Configured()) {
    return {
      mode: 'demo',
      uploadUrl: null,
      publicUrl: null,
      key,
    };
  }

  const region = process.env.AWS_REGION?.trim() || 'eu-central-1';
  const bucket = getConfiguredBucket()!;
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
    },
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 120 });
  const baseUrl =
    process.env.AWS_S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') ||
    `https://${bucket}.s3.${region}.amazonaws.com`;

  return {
    mode: 's3',
    uploadUrl,
    publicUrl: `${baseUrl}/${key}`,
    key,
  };
}
