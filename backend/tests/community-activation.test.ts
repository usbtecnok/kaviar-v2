import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { CommunityActivationService } from '../src/services/community-activation';

const prisma = new PrismaClient();
const activationService = new CommunityActivationService();

describe('Community Auto-Activation', () => {
  let testCommunityId: string;
  let testDriverIds: string[] = [];

  beforeAll(async () => {
    // Create test community
    const community = await prisma.community.create({
      data: {
        name: 'Test Community',
        description: 'Community for activation tests',
        isActive: false, // Start inactive
        minActiveDrivers: 5,
        deactivationThreshold: 3,
        autoActivation: true
      }
    });
    testCommunityId = community.id;
  });

  beforeEach(async () => {
    // Clean up drivers from previous tests
    await prisma.driver.deleteMany({
      where: { communityId: testCommunityId }
    });
    testDriverIds = [];

    // Reset community to inactive
    await prisma.community.update({
      where: { id: testCommunityId },
      data: { isActive: false }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.driver.deleteMany({ where: { communityId: testCommunityId } });
    await prisma.communityStatusHistory.deleteMany({ where: { communityId: testCommunityId } });
    await prisma.community.delete({ where: { id: testCommunityId } });
    await prisma.$disconnect();
  });

  async function createDriver(status: string = 'approved'): Promise<string> {
    const driver = await prisma.driver.create({
      data: {
        name: `Test Driver ${testDriverIds.length + 1}`,
        email: `driver${testDriverIds.length + 1}@test.com`,
        communityId: testCommunityId,
        status,
        suspendedAt: null
      }
    });
    testDriverIds.push(driver.id);
    return driver.id;
  }

  it('should activate community when reaching 5 approved drivers', async () => {
    // Create 4 drivers - should remain inactive
    for (let i = 0; i < 4; i++) {
      await createDriver('approved');
    }

    await activationService.evaluateCommunityActivation(testCommunityId);
    
    let community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(false);

    // Add 5th driver - should activate
    await createDriver('approved');
    await activationService.evaluateCommunityActivation(testCommunityId);

    community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(true);

    // Check status history
    const history = await prisma.communityStatusHistory.findFirst({
      where: { communityId: testCommunityId },
      orderBy: { createdAt: 'desc' }
    });

    expect(history).toBeTruthy();
    expect(history?.fromIsActive).toBe(false);
    expect(history?.toIsActive).toBe(true);
    expect(history?.driverCount).toBe(5);
  });

  it('should deactivate community only when dropping to 3 or fewer drivers (hysteresis)', async () => {
    // Start with 5 drivers (active community)
    for (let i = 0; i < 5; i++) {
      await createDriver('approved');
    }
    await activationService.evaluateCommunityActivation(testCommunityId);

    // Suspend 1 driver (4 remaining) - should stay active due to hysteresis
    await prisma.driver.update({
      where: { id: testDriverIds[0] },
      data: { status: 'suspended', suspendedAt: new Date() }
    });
    await activationService.evaluateCommunityActivation(testCommunityId);

    let community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(true); // Still active with 4 drivers

    // Suspend another driver (3 remaining) - should deactivate
    await prisma.driver.update({
      where: { id: testDriverIds[1] },
      data: { status: 'suspended', suspendedAt: new Date() }
    });
    await activationService.evaluateCommunityActivation(testCommunityId);

    community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(false); // Deactivated with 3 drivers
  });

  it('should not flicker between 4 and 5 drivers due to hysteresis', async () => {
    // Start with 4 approved drivers (inactive)
    for (let i = 0; i < 4; i++) {
      await createDriver('approved');
    }
    await activationService.evaluateCommunityActivation(testCommunityId);

    let community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(false);

    // Add 5th driver - should activate
    await createDriver('approved');
    await activationService.evaluateCommunityActivation(testCommunityId);

    community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(true);

    // Remove 1 driver (back to 4) - should stay active (hysteresis)
    await prisma.driver.update({
      where: { id: testDriverIds[4] },
      data: { status: 'suspended', suspendedAt: new Date() }
    });
    await activationService.evaluateCommunityActivation(testCommunityId);

    community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(true); // Still active due to hysteresis

    // Add driver back (5 again) - should remain active
    await prisma.driver.update({
      where: { id: testDriverIds[4] },
      data: { status: 'approved', suspendedAt: null }
    });
    await activationService.evaluateCommunityActivation(testCommunityId);

    community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(true);
  });

  it('should count only approved and non-suspended drivers', async () => {
    // Create mix of drivers
    await createDriver('pending');    // Should not count
    await createDriver('rejected');   // Should not count
    await createDriver('approved');   // Should count
    await createDriver('approved');   // Should count
    await createDriver('approved');   // Should count

    // Suspend one approved driver
    await prisma.driver.update({
      where: { id: testDriverIds[2] },
      data: { status: 'suspended', suspendedAt: new Date() }
    });

    const count = await activationService.countActiveDrivers(testCommunityId);
    expect(count).toBe(2); // Only 2 approved and non-suspended drivers

    await activationService.evaluateCommunityActivation(testCommunityId);
    
    const community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(false); // Should remain inactive
  });

  it('should skip evaluation if auto-activation is disabled', async () => {
    // Disable auto-activation
    await prisma.community.update({
      where: { id: testCommunityId },
      data: { autoActivation: false }
    });

    // Create 5 drivers
    for (let i = 0; i < 5; i++) {
      await createDriver('approved');
    }

    await activationService.evaluateCommunityActivation(testCommunityId);

    const community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { isActive: true }
    });
    expect(community?.isActive).toBe(false); // Should remain inactive
  });

  it('should update lastEvaluatedAt timestamp', async () => {
    const beforeEvaluation = new Date();
    
    await activationService.evaluateCommunityActivation(testCommunityId);

    const community = await prisma.community.findUnique({
      where: { id: testCommunityId },
      select: { lastEvaluatedAt: true }
    });

    expect(community?.lastEvaluatedAt).toBeTruthy();
    expect(community?.lastEvaluatedAt!.getTime()).toBeGreaterThanOrEqual(beforeEvaluation.getTime());
  });

  it('should provide correct community status with metrics', async () => {
    // Create 3 drivers
    for (let i = 0; i < 3; i++) {
      await createDriver('approved');
    }

    const status = await activationService.getCommunityStatus(testCommunityId);

    expect(status.activeDriverCount).toBe(3);
    expect(status.isActive).toBe(false);
    expect(status.nextThreshold).toContain('Ativa com ≥5 motoristas');
  });
});
