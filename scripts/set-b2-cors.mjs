import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const accessKeyId = process.env.B2_APPLICATION_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.B2_APPLICATION_KEY || process.env.S3_SECRET_ACCESS_KEY;
const endpoint = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
const region = process.env.B2_REGION || 'us-east-005';
const bucket = process.env.B2_BUCKET_NAME || 'nuaborges-media';

console.log('Connecting to S3/B2 with:', { endpoint, region, bucket, keyId: accessKeyId ? accessKeyId.substring(0, 6) + '...' : 'none' });

const s3 = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

async function main() {
  try {
    console.log('Fetching current CORS config...');
    const getCors = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log('Current CORS:', JSON.stringify(getCors.CORSRules, null, 2));
  } catch (err) {
    console.log('No current CORS or error:', err.message);
  }

  if (!process.argv.includes('--apply')) {
    console.log('Read-only mode: current CORS was inspected; no bucket configuration was changed.');
    await s3.destroy();
    return;
  }

  console.warn('Explicit --apply supplied: this replaces the entire bucket CORS policy.');
  console.log('Applying new CORS configuration...');
  const corsParams = {
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['Content-Type', 'Content-Length', 'x-amz-meta-sha256', 'Authorization'],
          AllowedMethods: ['GET', 'HEAD', 'PUT'],
          AllowedOrigins: [
            'https://admin.nuaborges.com.br',
            'https://nuaborges.com.br',
          ],
          ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'x-amz-request-id', 'x-amz-id-2'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    await s3.send(new PutBucketCorsCommand(corsParams));
    console.log('SUCCESS: Bucket CORS updated successfully!');

    const verify = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
    console.log('Verified CORS:', JSON.stringify(verify.CORSRules, null, 2));
  } catch (err) {
    console.error('Error applying CORS:', err);
  }
}

main();
