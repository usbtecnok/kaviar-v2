-- Migration: Add Ride Feedback System with Sentiment Analysis
-- Date: 2026-02-08
-- Author: Kaviar Engineering
-- ADR: docs/ADR-002-ride-feedback-sentiment.md

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Table: ride_feedbacks
-- Purpose: Store passenger feedback about completed rides
CREATE TABLE ride_feedbacks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id       UUID NOT NULL UNIQUE,
  passenger_id  UUID NOT NULL,
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  tags          TEXT, -- JSON array: ["pontualidade", "limpeza"]
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_ride_feedbacks_ride 
    FOREIGN KEY (ride_id) 
    REFERENCES rides(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_ride_feedbacks_passenger 
    FOREIGN KEY (passenger_id) 
    REFERENCES passengers(id) 
    ON DELETE CASCADE
);

-- Indexes for ride_feedbacks
CREATE INDEX idx_ride_feedbacks_passenger_id ON ride_feedbacks(passenger_id);
CREATE INDEX idx_ride_feedbacks_rating ON ride_feedbacks(rating);
CREATE INDEX idx_ride_feedbacks_created_at ON ride_feedbacks(created_at);

-- Comment on table
COMMENT ON TABLE ride_feedbacks IS 'Passenger feedback about completed rides (rating, comment, tags)';
COMMENT ON COLUMN ride_feedbacks.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN ride_feedbacks.comment IS 'Optional free-text feedback (max 1000 chars validated in app)';
COMMENT ON COLUMN ride_feedbacks.tags IS 'JSON array of tags (e.g., ["pontualidade", "limpeza"])';
COMMENT ON COLUMN ride_feedbacks.is_anonymous IS 'If true, passenger identity hidden in reports (LGPD compliance)';

-- ============================================================================

-- Table: ride_feedback_sentiment_analysis
-- Purpose: Store sentiment analysis results (computed externally)
CREATE TABLE ride_feedback_sentiment_analysis (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_feedback_id  UUID NOT NULL UNIQUE,
  sentiment_score   DECIMAL(5, 4), -- Range: -1.0000 to +1.0000
  sentiment_label   VARCHAR(50),   -- "positive", "neutral", "negative"
  confidence_score  DECIMAL(5, 4), -- Range: 0.0000 to 1.0000
  model_version     VARCHAR(100),  -- e.g., "openai-gpt4-2024", "aws-comprehend-v2"
  analyzed_at       TIMESTAMP,
  analysis_metadata TEXT,          -- JSON with extra data (keywords, emotions, etc)
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_sentiment_analysis_feedback 
    FOREIGN KEY (ride_feedback_id) 
    REFERENCES ride_feedbacks(id) 
    ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT chk_sentiment_score_range 
    CHECK (sentiment_score IS NULL OR (sentiment_score >= -1.0000 AND sentiment_score <= 1.0000)),
  
  CONSTRAINT chk_confidence_score_range 
    CHECK (confidence_score IS NULL OR (confidence_score >= 0.0000 AND confidence_score <= 1.0000))
);

-- Indexes for ride_feedback_sentiment_analysis
CREATE INDEX idx_sentiment_analysis_label ON ride_feedback_sentiment_analysis(sentiment_label);
CREATE INDEX idx_sentiment_analysis_analyzed_at ON ride_feedback_sentiment_analysis(analyzed_at);

-- Comment on table
COMMENT ON TABLE ride_feedback_sentiment_analysis IS 'Sentiment analysis results for ride feedbacks (computed externally via AI)';
COMMENT ON COLUMN ride_feedback_sentiment_analysis.sentiment_score IS 'Sentiment score from -1.0 (very negative) to +1.0 (very positive)';
COMMENT ON COLUMN ride_feedback_sentiment_analysis.sentiment_label IS 'Human-readable label: positive, neutral, negative';
COMMENT ON COLUMN ride_feedback_sentiment_analysis.confidence_score IS 'Model confidence from 0.0 (low) to 1.0 (high)';
COMMENT ON COLUMN ride_feedback_sentiment_analysis.model_version IS 'AI model/API version used for analysis (for audit/comparison)';
COMMENT ON COLUMN ride_feedback_sentiment_analysis.analysis_metadata IS 'JSON with extra analysis data (keywords, emotions, topics)';

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================

-- To rollback this migration, run:
-- DROP TABLE IF EXISTS ride_feedback_sentiment_analysis CASCADE;
-- DROP TABLE IF EXISTS ride_feedbacks CASCADE;
