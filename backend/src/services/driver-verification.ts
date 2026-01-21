import { prisma } from '../lib/prisma';

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
  async evaluateEligibility(driver_id: string): Promise<EligibilityResult> {
    // Get or create driver verification record
    let verification = await prisma.driver_verifications.findUnique({
      where: { driver_id }
    });

    if (!verification) {
      verification = await this.createVerificationRecord(driver_id);
    }

    // Get driver data for vehicle validation
    const driver = await prisma.drivers.findUnique({
      where: { id: driver_id },
      select: { vehicle_color: true }
    });

    // Check LGPD consent
    const lgpdConsent = await prisma.consents.findUnique({
      where: {
        subject_type_subject_id_type: {
          subject_type: 'DRIVER',
          subject_id: driver_id,
          type: 'lgpd'
        }
      }
    });

    // Get all documents
    const documents = await prisma.driver_documents.findMany({
      where: { driver_id }
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
    if (!verification.community_id) {
      missingRequirements.push('COMMUNITY_ASSIGNMENT');
      checklist.communityAssigned.status = 'MISSING';
    } else {
      checklist.communityAssigned.status = 'ASSIGNED';
    }

    // Check vehicle color (required for approval)
    if (!driver?.vehicle_color) {
      missingRequirements.push('VEHICLE_COLOR');
    }

    // Check required documents
    for (const docType of requiredDocs) {
      const doc = documents.find(d => d.type === docType);
      
      // MVP: accept SUBMITTED or VERIFIED as sufficient for approval
      const isDocValid = doc && (doc.status === 'VERIFIED' || doc.status === 'SUBMITTED');
      
      if (!doc || !isDocValid) {
        missingRequirements.push(docType);
        checklist.documents[docType] = {
          status: doc?.status || 'MISSING',
          required: true
        };
      } else {
        checklist.documents[docType] = {
          status: doc.status,
          required: true,
          verifiedAt: doc.verified_at?.toISOString()
        };
      }
    }

    const isEligible = missingRequirements.length === 0;

    // 🔍 DEBUG LOG (development only)
    if (process.env.ENABLE_DRIVER_APPROVAL_DEBUG === '1') {
      console.log('[driver-approval] eligibility check', {
        driverId: driver_id,
        requiredDocTypes: requiredDocs,
        foundDocs: documents.map(d => ({ type: d.type, status: d.status })),
        missingRequirements,
        isEligible,
        vehicleColor: driver?.vehicle_color || 'MISSING'
      });
    }

    // Update verification status
    await prisma.driver_verifications.update({
      where: { driver_id },
      data: {
        status: isEligible ? 'ELIGIBLE' : 'PENDING',
        eligibility_checked_at: new Date()
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
  async createVerificationRecord(driver_id: string) {
    const driver = await prisma.drivers.findUnique({
      where: { id: driver_id },
      select: { community_id: true }
    });

    const verification = await prisma.driver_verifications.create({
      data: {
        id: `verification_${driver_id}`,
        driver_id,
        community_id: driver?.community_id,
        status: 'PENDING',
        updated_at: new Date()
      }
    });

    // Create missing document records
    const requiredDocs = ['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK'];
    
    for (const docType of requiredDocs) {
      await prisma.driver_documents.create({
        data: {
          id: `doc_${driver_id}_${docType}_${Date.now()}`,
          driver_id,
          type: docType,
          status: 'MISSING',
          updated_at: new Date()
        }
      });
    }

    return verification;
  }

  /**
   * Submit driver documents
   */
  async submitDocuments(driver_id: string, documents: Array<{ type: string; file_url: string }>, community_id?: string) {
    return prisma.$transaction(async (tx) => {
      // Update community if provided
      if (community_id) {
        await tx.driver_verifications.upsert({
          where: { driver_id },
          update: { community_id, updated_at: new Date() },
          create: {
            id: `verification_${driver_id}`,
            driver_id,
            community_id,
            status: 'PENDING',
            updated_at: new Date()
          }
        });
      }

      // Update documents
      for (const doc of documents) {
        const existingDoc = await tx.driver_documents.findFirst({
          where: {
            driver_id,
            type: doc.type
          }
        });

        if (existingDoc) {
          await tx.driver_documents.update({
            where: { id: existingDoc.id },
            data: {
              file_url: doc.file_url,
              status: 'SUBMITTED',
              submitted_at: new Date()
            }
          });
        } else {
          await tx.driver_documents.create({
            data: {
              id: `doc_${driver_id}_${doc.type}_${Date.now()}`,
              driver_id,
              type: doc.type,
              file_url: doc.file_url,
              status: 'SUBMITTED',
              submitted_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }
    });
  }

  /**
   * Verify a document (admin action)
   */
  async verifyDocument(driver_id: string, documentId: string, admin_id: string) {
    return prisma.driver_documents.update({
      where: { id: documentId, driver_id },
      data: {
        status: 'VERIFIED',
        verified_at: new Date(),
        verified_by_admin_id: admin_id
      }
    });
  }

  /**
   * Reject a document (admin action)
   */
  async rejectDocument(driver_id: string, documentId: string, admin_id: string, reason: string) {
    return prisma.driver_documents.update({
      where: { id: documentId, driver_id },
      data: {
        status: 'REJECTED',
        rejected_at: new Date(),
        rejected_by_admin_id: admin_id,
        reject_reason: reason
      }
    });
  }

  /**
   * Record LGPD consent for driver
   */
  async recordConsent(driver_id: string, consentType: string, accepted: boolean, ipAddress?: string, userAgent?: string) {
    return prisma.consents.upsert({
      where: {
        subject_type_subject_id_type: {
          subject_type: 'DRIVER',
          subject_id: driver_id,
          type: consentType
        }
      },
      update: {
        accepted,
        accepted_at: accepted ? new Date() : null,
        ip_address: ipAddress,
        user_agent: userAgent
      },
      create: {
        id: `consent_${driver_id}_${consentType}_${Date.now()}`,
        user_id: driver_id,
        subject_type: 'DRIVER',
        subject_id: driver_id,
        type: consentType,
        accepted,
        accepted_at: accepted ? new Date() : null,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });
  }
}
