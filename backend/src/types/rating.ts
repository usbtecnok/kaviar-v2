export enum RaterType {
  DRIVER = 'DRIVER',
  PASSENGER = 'PASSENGER'
}

export enum UserType {
  DRIVER = 'DRIVER',
  PASSENGER = 'PASSENGER'
}

export interface RatingData {
  rideId: string;
  raterId: string;
  ratedId: string;
  raterType: RaterType;
  score: number; // 1-5
  comment?: string;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: { [key: number]: number };
}

export interface RatingResponse {
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface RatingSummary {
  entityId: string;
  entityType: UserType;
  stats: RatingStats;
  recentRatings: RatingResponse[];
}
