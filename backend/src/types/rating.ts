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
  userId: string;
  userType: UserType;
  averageRating: number;
  totalRatings: number;
  updatedAt: Date;
}

export interface RatingResponse {
  id: string;
  score: number;
  comment?: string;
  createdAt: Date;
}

export interface RatingSummary {
  stats: RatingStats | null;
  recentRatings: RatingResponse[];
}
