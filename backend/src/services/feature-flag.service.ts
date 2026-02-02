import { prisma } from '../lib/prisma';
import crypto from 'crypto';

/**
 * Feature Flag Resolver - 3 Layer Priority System
 * 
 * Priority (highest to lowest):
 * 1. Allowlist DB (passenger_id) → Always ON
 * 2. Deterministic percentage (hash(passenger_id) % 100 < rollout_percentage)
 * 3. Master switch (FEATURE_PASSENGER_FAVORITES_MATCHING env var)
 * 
 * Master switch behavior:
 * - If env var = "false" → Forces OFF globally (allowlist ignored)
 * - If env var = "true" → Respects DB config (allowlist + percentage)
 * - If env var undefined → Respects DB config (default behavior)
 */

interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage: number;
}

// Cache for feature flag config (1 minute TTL)
let configCache: { config: FeatureFlagConfig | null; timestamp: number } = {
  config: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Get feature flag configuration from database with caching
 */
async function getFeatureFlagConfig(key: string): Promise<FeatureFlagConfig | null> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache.config && now - configCache.timestamp < CACHE_TTL_MS) {
    return configCache.config;
  }

  try {
    const flag = await prisma.feature_flags.findUnique({
      where: { key },
      select: { enabled: true, rollout_percentage: true },
    });

    const config = flag
      ? { enabled: flag.enabled, rolloutPercentage: flag.rollout_percentage }
      : null;

    // Update cache
    configCache = { config, timestamp: now };
    
    return config;
  } catch (error) {
    console.error('Error fetching feature flag config:', error);
    return null;
  }
}

/**
 * Check if passenger is in allowlist
 */
async function isInAllowlist(key: string, passengerId: string): Promise<boolean> {
  try {
    const entry = await prisma.feature_flag_allowlist.findUnique({
      where: {
        key_passenger_id: {
          key,
          passenger_id: passengerId,
        },
      },
    });
    return !!entry;
  } catch (error) {
    console.error('[feature-flag] Error checking allowlist:', error);
    return false;
  }
}

/**
 * Deterministic hash function for passenger ID
 * Returns a number between 0-99
 */
function hashPassengerId(passengerId: string): number {
  const hash = crypto.createHash('sha256').update(passengerId).digest('hex');
  // Take first 8 characters and convert to number, then mod 100
  return parseInt(hash.substring(0, 8), 16) % 100;
}

/**
 * Main resolver: Check if feature is enabled for a passenger
 * 
 * @param key - Feature flag key (e.g., 'passenger_favorites_matching')
 * @param passengerId - Passenger ID to check
 * @returns true if feature is enabled for this passenger
 */
export async function isFeatureEnabled(
  key: string,
  passengerId: string
): Promise<boolean> {
  // Layer 3: Master switch (env var)
  const masterSwitch = process.env.FEATURE_PASSENGER_FAVORITES_MATCHING;
  if (masterSwitch === 'false') {
    return false;
  }

  // Get DB config
  const config = await getFeatureFlagConfig(key);
  if (!config) {
    return false;
  }

  // If master switch is explicitly "true", or undefined, respect DB config
  if (!config.enabled) {
    return false;
  }

  // Layer 1: Allowlist (highest priority)
  const inAllowlist = await isInAllowlist(key, passengerId);
  if (inAllowlist) {
    return true;
  }

  // Layer 2: Deterministic percentage rollout
  const hash = hashPassengerId(passengerId);
  return hash < config.rolloutPercentage;
}

/**
 * Clear config cache (useful for testing or immediate updates)
 */
export function clearFeatureFlagCache(): void {
  configCache = { config: null, timestamp: 0 };
}

/**
 * Get hash value for a passenger (for testing/debugging)
 */
export function getPassengerHash(passengerId: string): number {
  return hashPassengerId(passengerId);
}
