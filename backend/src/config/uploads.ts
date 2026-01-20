import path from 'path';
import fs from 'fs';

/**
 * Canonical uploads path resolver
 * Ensures multer destination and express.static serve the SAME directory
 */
export function getUploadsPaths() {
  const cwd = process.cwd();
  
  // Check if we're in backend/ subdirectory (dev) or root (production)
  const backendUploads = path.join(cwd, 'backend', 'uploads');
  const rootUploads = path.join(cwd, 'uploads');
  
  // Use backend/uploads if it exists, otherwise use root/uploads
  const uploadsBaseDir = fs.existsSync(path.join(cwd, 'backend')) 
    ? backendUploads 
    : rootUploads;
  
  const certidoesDir = path.join(uploadsBaseDir, 'certidoes');
  
  // Ensure directories exist
  fs.mkdirSync(certidoesDir, { recursive: true });
  
  console.log('📁 Uploads paths resolved:');
  console.log(`   cwd: ${cwd}`);
  console.log(`   uploadsBaseDir: ${uploadsBaseDir}`);
  console.log(`   certidoesDir: ${certidoesDir}`);
  
  return {
    uploadsBaseDir,
    certidoesDir
  };
}
