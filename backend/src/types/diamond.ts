export enum DiamondState {
  ELIGIBLE = 'ELIGIBLE',
  LOST_BY_DRIVER_CANCEL = 'LOST_BY_DRIVER_CANCEL',
  EARNED = 'EARNED'
}

export interface DiamondInfo {
  isEligible: boolean;
  state: DiamondState | null;
  message: string;
  bonusAmount: number | null;
  candidateDriverId?: string | null;
  lostAt?: Date | null;
  lostReason?: string | null;
  dailyCapReached?: boolean;
  dailyEarned?: number;
  dailyLimit?: number;
}

export interface DiamondAuditEntry {
  rideId: string;
  driverId?: string;
  diamondStateFrom: DiamondState | null;
  diamondStateTo: DiamondState;
  reason?: string;
  bonusAmount?: number;
}
