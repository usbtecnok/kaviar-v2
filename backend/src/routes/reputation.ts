import express from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getDriverReputation,
  validateDriver,
  getDriverLedgerHistory,
} from '../services/reputation.service';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/reputation/:driverId/:communityId
 * Public endpoint to get driver reputation
 */
router.get('/:driverId/:communityId', async (req, res) => {
  try {
    const { driverId, communityId } = req.params;
    
    const reputation = await getDriverReputation(driverId, communityId);
    
    if (!reputation) {
      return res.status(404).json({ 
        error: 'Reputation not found',
        message: 'Driver has no reputation in this community yet'
      });
    }
    
    res.json(reputation);
  } catch (error: any) {
    console.error('Error fetching reputation:', error);
    res.status(500).json({ error: 'Failed to fetch reputation' });
  }
});

/**
 * GET /api/reputation/:driverId/:communityId/history
 * Get ledger history for a driver
 */
router.get('/:driverId/:communityId/history', async (req, res) => {
  try {
    const { driverId, communityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const history = await getDriverLedgerHistory(driverId, communityId, limit);
    
    res.json({ history });
  } catch (error: any) {
    console.error('Error fetching ledger history:', error);
    res.status(500).json({ error: 'Failed to fetch ledger history' });
  }
});

/**
 * POST /api/admin/leaders
 * Admin only: Create community leader
 */
router.post('/admin/leaders', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { userId, communityId, name, role, validationWeight } = req.body;
    
    if (!userId || !communityId || !name || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'communityId', 'name', 'role']
      });
    }
    
    const leader = await prisma.$queryRaw`
      INSERT INTO community_leaders (
        id, user_id, community_id, name, role, 
        validation_weight, is_active, created_at, updated_at
      )
      VALUES (
        gen_random_uuid()::text,
        ${userId},
        ${communityId},
        ${name},
        ${role},
        ${validationWeight || 10},
        true,
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    
    res.status(201).json(leader);
  } catch (error: any) {
    console.error('Error creating leader:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ 
        error: 'Leader already exists for this user and community'
      });
    }
    
    res.status(500).json({ error: 'Failed to create leader' });
  }
});

/**
 * GET /api/admin/leaders/:communityId
 * Admin only: List leaders in a community
 */
router.get('/admin/leaders/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    
    const leaders = await prisma.$queryRaw`
      SELECT 
        id, user_id, community_id, name, role,
        validation_weight, is_active, verified_by,
        verified_at, created_at, updated_at
      FROM community_leaders
      WHERE community_id = ${communityId}
      ORDER BY created_at DESC
    `;
    
    res.json({ leaders });
  } catch (error: any) {
    console.error('Error fetching leaders:', error);
    res.status(500).json({ error: 'Failed to fetch leaders' });
  }
});

/**
 * PATCH /api/admin/leaders/:leaderId/toggle
 * Admin only: Activate/deactivate leader
 */
router.patch('/admin/leaders/:leaderId/toggle', async (req, res) => {
  try {
    const { leaderId } = req.params;
    
    const result = await prisma.$queryRaw`
      UPDATE community_leaders
      SET 
        is_active = NOT is_active,
        updated_at = NOW()
      WHERE id = ${leaderId}
      RETURNING *
    `;
    
    res.json(result);
  } catch (error: any) {
    console.error('Error toggling leader status:', error);
    res.status(500).json({ error: 'Failed to toggle leader status' });
  }
});

/**
 * POST /api/leaders/validate
 * Leader only: Validate a driver
 */
router.post('/leaders/validate', async (req, res) => {
  try {
    // TODO: Add leader authentication middleware
    const { leaderId, driverId, communityId, notes } = req.body;
    
    if (!leaderId || !driverId || !communityId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['leaderId', 'driverId', 'communityId']
      });
    }
    
    const validation = await validateDriver(leaderId, driverId, communityId, notes);
    
    res.status(201).json({ 
      success: true,
      validation,
      message: 'Driver validated successfully'
    });
  } catch (error: any) {
    console.error('Error validating driver:', error);
    
    if (error.message === 'Leader not found') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message === 'Leader is not active') {
      return res.status(403).json({ error: error.message });
    }
    
    if (error.message === 'Driver already validated by this leader') {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to validate driver' });
  }
});

/**
 * GET /api/leaders/pending-validations/:communityId
 * Leader only: Get drivers pending validation
 */
router.get('/leaders/pending-validations/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    
    const pendingDrivers = await prisma.$queryRaw`
      SELECT 
        d.id, d.name, d.email, d.phone,
        drs.total_rides, drs.avg_rating, drs.reputation_level,
        drs.badge_type, drs.first_ride_at, drs.validation_score
      FROM drivers d
      INNER JOIN driver_reputation_stats drs 
        ON d.id = drs.driver_id
      WHERE drs.community_id = ${communityId}
        AND drs.reputation_level IN ('NEW', 'ACTIVE')
        AND d.status = 'active'
      ORDER BY drs.total_rides DESC
    `;
    
    res.json({ drivers: pendingDrivers });
  } catch (error: any) {
    console.error('Error fetching pending validations:', error);
    res.status(500).json({ error: 'Failed to fetch pending validations' });
  }
});

export default router;
