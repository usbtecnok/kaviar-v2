// Sentiment Analysis Types
export type SentimentLabel = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';

export interface SentimentAnalysis {
  label: SentimentLabel;
  score: number;
  confidence: number;
  modelVersion?: string;
  analyzedAt: string;
  metadata?: {
    provider: string;
    api: string;
    language: string;
    timing_ms?: {
      db_fetch_ms?: number;
      comprehend_ms?: number;
      db_upsert_ms?: number;
      total_ms?: number;
    };
  };
}

export interface RideFeedback {
  id: string;
  rideId: string;
  rating: number;
  comment: string | null;
  tags: string[] | null;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  passenger: {
    id: string;
    name: string;
    email: string | null;
  };
  sentiment: SentimentAnalysis | null;
}

export interface RideFeedbackListResponse {
  success: boolean;
  data: RideFeedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RideFeedbackDetailResponse {
  success: boolean;
  data: RideFeedback;
}
