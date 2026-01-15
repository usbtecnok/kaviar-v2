import { prisma } from '../config/database';

export interface EligibilityResult {
  isEligible: boolean;
  missingRequirements: string[];
  checklist: {
    lgpdConsent: { status: string; required: boolean };
    communityAssigned: { status: string; required: boolean };
    documents: Record<string, { status: string; required: boolean; verifiedAt?: string }>;
  };
}

export class DriverVerificationService {
  
  /**
   * Evaluate driver eligibility for approval
   */
  async evaluateEligibility(driverId: string): Promise<EligibilityResult> {
    // Get or create driver verification record
    let verification = await prisma.driver_verifications.findUnique({
      where: { driverId }
    });

    if (!verification) {
      verification = await this.createVerificationRecord(driverId);
    }

    // Check LGPD consent
    const lgpdConsent = await prisma.consents.findUnique({
      where: {
        subjectType_subjectId_type: {
          subjectType: 'DRIVER',
          subjectId: driverId,
          type: 'lgpd'
        }
      }
    });

    // Get all documents
    const documents = await prisma.driverDocument.findMany({
      where: { driverId }
    });

    // Required document types
    const requiredDocs = ['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK'];
    
    const missingRequirements: string[] = [];
    const checklist: EligibilityResult['checklist'] = {
      lgpdConsent: { status: 'MISSING', required: true },
      communityAssigned: { status: 'MISSING', required: true },
      documents: {}
    };

    // Check LGPD consent
    if (!lgpdConsent || !lgpdConsent.accepted) {
      missingRequirements.push('LGPD_CONSENT');
      checklist.lgpdConsent.status = 'MISSING';
    } else {
      checklist.lgpdConsent.status = 'VERIFIED';
    }

    // Check community assignment
    if (!verification.communityId) {
      missingRequirements.push('COMMUNITY_ASSIGNMENT');
      checklist.communityAssigned.status = 'MISSING';
    } else {
      checklist.communityAssigned.status = 'ASSIGNED';
    }

    // Check required documents
    for (const docType of requiredDocs) {
      const doc = documents.find(d => d.type === docType);
      
      // Special rule for BACKGROUND_CHECK in MVP: accept SUBMITTED status
      const isBackgroundCheckValid = docType === 'BACKGROUND_CHECK' && 
        doc && (doc.status === 'VERIFIED' || doc.status === 'SUBMITTED');
      
      if (!doc || (doc.status !== 'VERIFIED' && !isBackgroundCheckValid)) {
        missingRequirements.push(docType);
        checklist.documents[docType] = {
          status: doc?.status || 'MISSING',
          required: true
        };
      } else {
        checklist.documents[docType] = {
          status: doc.status,
          required: true,
          verifiedAt: doc.verifiedAt?.toISOString()
        };
      }
    }

    const isEligible = missingRequirements.length === 0;

    // Update verification status
    await prisma.driver_verifications.update({
      where: { driverId },
      data: {
        status: isEligible ? 'ELIGIBLE' : 'PENDING',
        eligibilityCheckedAt: new Date()
      }
    });

    return {
      isEligible,
      missingRequirements,
      checklist
    };
  }

  /**
   * Create verification record for existing drivers (retrocompatibility)
   */
  async createVerificationRecord(driverId: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { communityId: true }
    });

    const verification = await prisma.driver_verifications.create({
      data: {
        driverId,
        communityId: driver?.communityId,
        status: 'PENDING'
      }
    });

    // Create missing document records
    const requiredDocs = ['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK'];
    
    for (const docType of requiredDocs) {
      await prisma.driverDocument.create({
        data: {
          driverId,
          type: docType,
          status: 'MISSING'
        }
      });
    }

    return verification;
  }

  /**
   * Submit driver documents
   */
  async submitDocuments(driverId: string, documents: Array<{ type: string; fileUrl: string }>, communityId?: string) {
    return prisma.$transaction(async (tx) => {
      // Update community if provided
      if (communityId) {
        await tx.driverVerification.upsert({
          where: { driverId },
          update: { communityId },
          create: {
            driverId,
            communityId,
            status: 'PENDING'
          }
        });
      }

      // Update documents
      for (const doc of documents) {
        const existingDoc = await tx.driverDocument.findFirst({
          where: {
            driverId,
            type: doc.type
          }
        });

        if (existingDoc) {
          await tx.driverDocument.update({
            where: { id: existingDoc.id },
            data: {
              fileUrl: doc.fileUrl,
              status: 'SUBMITTED',
              submittedAt: new Date()
            }
          });
        } else {
          await tx.driverDocument.create({
            data: {
              driverId,
              type: doc.type,
              fileUrl: doc.fileUrl,
              status: 'SUBMITTED',
              submittedAt: new Date()
            }
          });
        }
      }
    });
  }

  /**
   * Verify a document (admin action)
   */
  async verifyDocument(driverId: string, documentId: string, adminId: string) {
    return prisma.driverDocument.update({
      where: { id: documentId, driverId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedByAdminId: adminId
      }
    });
  }

  /**
   * Reject a document (admin action)
   */
  async rejectDocument(driverId: string, documentId: string, adminId: string, reason: string) {
    return prisma.driverDocument.update({
      where: { id: documentId, driverId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedByAdminId: adminId,
        rejectReason: reason
      }
    });
  }

  /**
   * Record LGPD consent for driver
   */
  async recordConsent(driverId: string, consentType: string, accepted: boolean, ipAddress?: string, userAgent?: string) {
    return prisma.consents.upsert({
      where: {
        subjectType_subjectId_type: {
          subjectType: 'DRIVER',
          subjectId: driverId,
          type: consentType
        }
      },
      update: {
        accepted,
        acceptedAt: accepted ? new Date() : null,
        ipAddress,
        userAgent
      },
      create: {
        userId: driverId,
        subjectType: 'DRIVER',
        subjectId: driverId,
        type: consentType,
        accepted,
        acceptedAt: accepted ? new Date() : null,
        ipAddress,
        userAgent
      }
    });
  }
}
