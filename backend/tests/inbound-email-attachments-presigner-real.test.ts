import { describe, expect, it } from 'vitest';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const fakeCredentials = {
  accessKeyId: 'FAKEACCESSKEY123',
  secretAccessKey: 'FAKESECRETKEY1234567890',
};

function parsePresigned(urlStr: string) {
  const url = new URL(urlStr);
  return {
    signedHeaders: url.searchParams.get('X-Amz-SignedHeaders') || '',
    contentTypeQuery: url.searchParams.get('content-type'),
    checksumAlgorithm: url.searchParams.get('x-amz-sdk-checksum-algorithm'),
    checksumCrc32: url.searchParams.get('x-amz-checksum-crc32'),
    hasMetaSha: url.searchParams.has('x-amz-meta-sha256'),
  };
}

async function signWith(client: S3Client) {
  const command = new PutObjectCommand({
    Bucket: 'fake-bucket-kaviar',
    Key: 'inbound-email-attachments/fake/file.pdf',
    ContentType: 'application/pdf',
    Metadata: { sha256: 'a'.repeat(64) },
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

describe('AWS SDK presigner checksum behavior (real SDK, no network)', () => {
  it('default client includes sdk checksum params when presigning PutObject sem Body', async () => {
    const client = new S3Client({
      region: 'us-east-2',
      credentials: fakeCredentials,
    });

    const url = await signWith(client);
    const parsed = parsePresigned(url);

    expect(parsed.signedHeaders).toBe('host');
    expect(parsed.contentTypeQuery).toBeNull();
    expect(parsed.checksumAlgorithm).toBe('CRC32');
    expect(parsed.checksumCrc32).toBeTypeOf('string');
    expect(parsed.hasMetaSha).toBe(true);
  });

  it('WHEN_REQUIRED remove checksum params when presigning PutObject sem Body', async () => {
    const client = new S3Client({
      region: 'us-east-2',
      credentials: fakeCredentials,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });

    const url = await signWith(client);
    const parsed = parsePresigned(url);

    expect(parsed.signedHeaders).toBe('host');
    expect(parsed.contentTypeQuery).toBeNull();
    expect(parsed.checksumAlgorithm).toBeNull();
    expect(parsed.checksumCrc32).toBeNull();
    expect(parsed.hasMetaSha).toBe(true);
  });
});
