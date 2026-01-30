import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import { Request } from 'express';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2'
});

const bucket = process.env.AWS_S3_BUCKET || 'kaviar-uploads-1769655575';

// Multer S3 storage
export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket,
    metadata: (req: Request, file: Express.Multer.File, cb: any) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req: Request, file: Express.Multer.File, cb: any) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `certidoes/${uniqueSuffix}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas imagens (JPEG, PNG) e PDF são permitidos'));
  }
});

// Generate presigned URL for download
export async function getPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// Extract S3 key from URL
export function extractS3Key(url: string): string | null {
  if (url.startsWith('/uploads/')) {
    return url.replace('/uploads/', '');
  }
  if (url.includes('s3.amazonaws.com/')) {
    const parts = url.split('s3.amazonaws.com/')[1];
    return parts?.split('?')[0] || null;
  }
  return null;
}
