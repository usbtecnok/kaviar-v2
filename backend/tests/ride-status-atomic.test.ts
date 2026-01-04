import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { RideAdminService } from '../src/modules/admin/ride-service';

const prisma = new PrismaClient();
const rideService = new RideAdminService();

describe('Atomic Ride Status Transitions', () => {
  let testRideId: string;
  let testAdminId: string;
  let testDriverId: string;
  let testPassengerId: string;

  beforeAll(async () => {
    // Create test admin
    const admin = await prisma.admin.create({
      data: {
        name: 'Test Admin',
        email: 'test-admin@test.com',
        passwordHash: 'hashed',
        roleId: 'test-role-id',
        isActive: true
      }
    });
    testAdminId = admin.id;

    // Create test driver
    const driver = await prisma.driver.create({
      data: {
        name: 'Test Driver',
        email: 'test-driver@test.com',
        status: 'approved'
      }
    });
    testDriverId = driver.id;

    // Create test passenger
    const passenger = await prisma.passenger.create({
      data: {
        name: 'Test Passenger',
        email: 'test-passenger@test.com',
        status: 'approved'
      }
    });
    testPassengerId = passenger.id;
  });

  beforeEach(async () => {
    // Create fresh test ride for each test
    const ride = await prisma.ride.create({
      data: {
        driverId: testDriverId,
        passengerId: testPassengerId,
        origin: 'Test Origin',
        destination: 'Test Destination',
        status: 'accepted',
        price: 25.00,
        type: 'normal'
      }
    });
    testRideId = ride.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.ride.deleteMany({ where: { passengerId: testPassengerId } });
    await prisma.driver.delete({ where: { id: testDriverId } });
    await prisma.passenger.delete({ where: { id: testPassengerId } });
    await prisma.admin.delete({ where: { id: testAdminId } });
    await prisma.$disconnect();
  });

  it('should handle concurrent status updates with 409 conflict', async () => {
    // Simulate concurrent requests
    const updatePromise1 = rideService.updateRideStatus(
      testRideId,
      { status: 'started', reason: 'Admin action 1' },
      testAdminId
    );

    const updatePromise2 = rideService.updateRideStatus(
      testRideId,
      { status: 'cancelled_by_admin', reason: 'Admin action 2' },
      testAdminId
    );

    // One should succeed, one should fail with concurrent modification
    const results = await Promise.allSettled([updatePromise1, updatePromise2]);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Check that the failed one has the correct error
    const failedResult = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(failedResult.reason.message).toBe('CONCURRENT_MODIFICATION');
  });

  it('should handle concurrent cancel operations with 409 conflict', async () => {
    // Simulate concurrent cancel requests
    const cancelPromise1 = rideService.cancelRide(
      testRideId,
      { reason: 'Cancel reason 1' },
      testAdminId
    );

    const cancelPromise2 = rideService.cancelRide(
      testRideId,
      { reason: 'Cancel reason 2' },
      testAdminId
    );

    const results = await Promise.allSettled([cancelPromise1, cancelPromise2]);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    // Check that the failed one has the correct error
    const failedResult = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(failedResult.reason.message).toBe('CONCURRENT_MODIFICATION');
  });

  it('should maintain consistent status history during concurrent operations', async () => {
    // Perform concurrent operations
    const operations = [
      rideService.updateRideStatus(testRideId, { status: 'started' }, testAdminId),
      rideService.updateRideStatus(testRideId, { status: 'arrived' }, testAdminId),
      rideService.cancelRide(testRideId, { reason: 'Test cancel' }, testAdminId)
    ];

    await Promise.allSettled(operations);

    // Check status history consistency
    const statusHistory = await prisma.rideStatusHistory.findMany({
      where: { rideId: testRideId },
      orderBy: { createdAt: 'asc' }
    });

    // Should have exactly one status change (the successful one)
    expect(statusHistory.length).toBe(1);

    // Final ride status should match the history
    const finalRide = await prisma.ride.findUnique({
      where: { id: testRideId },
      select: { status: true }
    });

    expect(finalRide?.status).toBe(statusHistory[0].status);
  });

  it('should prevent invalid status transitions', async () => {
    // Try invalid transition
    await expect(
      rideService.updateRideStatus(
        testRideId,
        { status: 'paid' }, // Invalid: accepted -> paid (should go through completed first)
        testAdminId
      )
    ).rejects.toThrow('Transição inválida: accepted → paid');
  });

  it('should validate status transitions correctly', async () => {
    // Valid transition: accepted -> started
    const result = await rideService.updateRideStatus(
      testRideId,
      { status: 'started', reason: 'Driver started trip' },
      testAdminId
    );

    expect(result.status).toBe('started');

    // Check status history was created
    const statusHistory = await prisma.rideStatusHistory.findMany({
      where: { rideId: testRideId, status: 'started' }
    });

    expect(statusHistory.length).toBe(1);
  });
});
