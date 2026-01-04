import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DriverVerificationService } from '../src/services/driver-verification';
import { AdminService } from '../src/modules/admin/service';

const prisma = new PrismaClient();
const verificationService = new DriverVerificationService();
const adminService = new AdminService();

describe('Driver Governance - Approval Gates', () => {
  let testDriverId: string;
  let testCommunityId: string;

  beforeAll(async () => {
    // Create test community
    const community = await prisma.community.create({
      data: {
        name: 'Test Community',
        description: 'Community for driver governance tests'
      }
    });
    testCommunityId = community.id;
  });

  beforeEach(async () => {
    // Create fresh test driver
    const driver = await prisma.driver.create({
      data: {
        name: 'Test Driver',
        email: `driver-${Date.now()}@test.com`,
        status: 'pending'
      }
    });
    testDriverId = driver.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.driverDocument.deleteMany({});
    await prisma.driverVerification.deleteMany({});
    await prisma.consent.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.community.delete({ where: { id: testCommunityId } });
    await prisma.$disconnect();
  });

  it('should block approval when LGPD consent is missing', async () => {
    // Setup all documents except LGPD consent
    await setupAllDocumentsExcept(['LGPD_CONSENT']);

    await expect(adminService.approveDriver(testDriverId)).rejects.toMatchObject({
      code: 'DRIVER_NOT_ELIGIBLE',
      missingRequirements: expect.arrayContaining(['LGPD_CONSENT'])
    });
  });

  it('should block approval when vehicle photos are missing', async () => {
    // Setup all requirements except vehicle photos
    await setupAllDocumentsExcept(['VEHICLE_PHOTO']);

    await expect(adminService.approveDriver(testDriverId)).rejects.toMatchObject({
      code: 'DRIVER_NOT_ELIGIBLE',
      missingRequirements: expect.arrayContaining(['VEHICLE_PHOTO'])
    });
  });

  it('should block approval when proof of address is missing', async () => {
    // Setup all requirements except proof of address
    await setupAllDocumentsExcept(['PROOF_OF_ADDRESS']);

    await expect(adminService.approveDriver(testDriverId)).rejects.toMatchObject({
      code: 'DRIVER_NOT_ELIGIBLE',
      missingRequirements: expect.arrayContaining(['PROOF_OF_ADDRESS'])
    });
  });

  it('should block approval when community is not assigned', async () => {
    // Setup all documents but no community
    await setupAllDocumentsExcept(['COMMUNITY_ASSIGNMENT']);

    await expect(adminService.approveDriver(testDriverId)).rejects.toMatchObject({
      code: 'DRIVER_NOT_ELIGIBLE',
      missingRequirements: expect.arrayContaining(['COMMUNITY_ASSIGNMENT'])
    });
  });

  it('should approve driver when all requirements are met', async () => {
    // Setup all requirements
    await setupAllDocumentsExcept([]);

    const result = await adminService.approveDriver(testDriverId);
    
    expect(result.status).toBe('approved');

    // Verify verification record was updated
    const verification = await prisma.driverVerification.findUnique({
      where: { driverId: testDriverId }
    });
    expect(verification?.status).toBe('APPROVED');
    expect(verification?.approvedAt).toBeTruthy();
  });

  it('should return structured error with missing requirements details', async () => {
    // Setup only partial requirements
    await verificationService.recordConsent(testDriverId, 'lgpd', true);
    
    try {
      await adminService.approveDriver(testDriverId);
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.code).toBe('DRIVER_NOT_ELIGIBLE');
      expect(error.missingRequirements).toContain('CPF');
      expect(error.missingRequirements).toContain('VEHICLE_PHOTO');
      expect(error.details).toHaveProperty('cpf');
      expect(error.details).toHaveProperty('vehiclePhotos');
    }
  });

  it('should evaluate eligibility correctly', async () => {
    // Test with missing requirements
    let eligibility = await verificationService.evaluateEligibility(testDriverId);
    
    expect(eligibility.isEligible).toBe(false);
    expect(eligibility.missingRequirements.length).toBeGreaterThan(0);
    expect(eligibility.checklist.lgpdConsent.status).toBe('MISSING');

    // Add LGPD consent
    await verificationService.recordConsent(testDriverId, 'lgpd', true);
    
    eligibility = await verificationService.evaluateEligibility(testDriverId);
    expect(eligibility.checklist.lgpdConsent.status).toBe('VERIFIED');
  });

  it('should handle document submission and verification flow', async () => {
    // Submit documents
    await verificationService.submitDocuments(testDriverId, [
      { type: 'CPF', fileUrl: 'https://storage.com/cpf.pdf' },
      { type: 'VEHICLE_PHOTO', fileUrl: 'https://storage.com/car.jpg' }
    ], testCommunityId);

    // Check documents are submitted
    const documents = await prisma.driverDocument.findMany({
      where: { driverId: testDriverId }
    });
    
    const cpfDoc = documents.find(d => d.type === 'CPF');
    expect(cpfDoc?.status).toBe('SUBMITTED');
    expect(cpfDoc?.fileUrl).toBe('https://storage.com/cpf.pdf');

    // Verify document
    await verificationService.verifyDocument(testDriverId, cpfDoc!.id, 'admin-123');
    
    const verifiedDoc = await prisma.driverDocument.findUnique({
      where: { id: cpfDoc!.id }
    });
    expect(verifiedDoc?.status).toBe('VERIFIED');
    expect(verifiedDoc?.verifiedByAdminId).toBe('admin-123');
  });

  it('should handle document rejection', async () => {
    // Submit document
    await verificationService.submitDocuments(testDriverId, [
      { type: 'RG', fileUrl: 'https://storage.com/rg.pdf' }
    ]);

    const doc = await prisma.driverDocument.findFirst({
      where: { driverId: testDriverId, type: 'RG' }
    });

    // Reject document
    await verificationService.rejectDocument(testDriverId, doc!.id, 'admin-123', 'Documento ilegível');
    
    const rejectedDoc = await prisma.driverDocument.findUnique({
      where: { id: doc!.id }
    });
    expect(rejectedDoc?.status).toBe('REJECTED');
    expect(rejectedDoc?.rejectReason).toBe('Documento ilegível');
  });

  // Helper function to setup documents
  async function setupAllDocumentsExcept(exclude: string[]) {
    // LGPD Consent
    if (!exclude.includes('LGPD_CONSENT')) {
      await verificationService.recordConsent(testDriverId, 'lgpd', true);
    }

    // Community assignment
    if (!exclude.includes('COMMUNITY_ASSIGNMENT')) {
      await verificationService.submitDocuments(testDriverId, [], testCommunityId);
    }

    // Documents
    const requiredDocs = ['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK'];
    
    for (const docType of requiredDocs) {
      if (!exclude.includes(docType)) {
        // Submit document
        await verificationService.submitDocuments(testDriverId, [
          { type: docType, fileUrl: `https://storage.com/${docType.toLowerCase()}.pdf` }
        ]);

        // Verify document
        const doc = await prisma.driverDocument.findFirst({
          where: { driverId: testDriverId, type: docType }
        });
        
        if (doc) {
          await verificationService.verifyDocument(testDriverId, doc.id, 'admin-test');
        }
      }
    }
  }
});
