-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE sentiment_type AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- TABLE: FEEDBACKS (Raw Data)
-- Immutable source of truth.
CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id VARCHAR(50) NOT NULL, -- Logical Partition Key
    customer_name VARCHAR(100),
    raw_content TEXT NOT NULL CHECK (length(raw_content) > 0),
    source VARCHAR(50) DEFAULT 'web_form', -- web_form, email, api
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for Feedbacks
CREATE INDEX idx_feedbacks_hotel_created ON feedbacks(hotel_id, created_at DESC);


-- TABLE: ANALYSIS_RESULTS (Derived Data)
-- 1 Feedback -> N Analyses (Supports Model A/B Testing & Re-runs)
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
    
    -- Model Metadata
    model_provider VARCHAR(50) NOT NULL, -- e.g. 'insight-ai-engine', 'gpt-4'
    model_version VARCHAR(20) NOT NULL, -- e.g. 'v1.0.2', '2025-12-23'
    
    -- Analysis Payload
    sentiment sentiment_type NOT NULL,
    score DECIMAL(4, 3) NOT NULL CHECK (score >= -1.0 AND score <= 1.0),
    confidence DECIMAL(4, 3) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    keywords TEXT[], -- PostgreSQL Array type
    
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: One analysis per model version per feedback
    UNIQUE(feedback_id, model_provider, model_version)
);

-- INDEXES for Analysis
-- Fast retrieval of latest insights by sentiment, feedback, or model version
CREATE INDEX idx_analysis_sentiment ON analysis_results(sentiment);
CREATE INDEX idx_analysis_feedback_id ON analysis_results(feedback_id);
CREATE INDEX idx_analysis_model_version ON analysis_results(model_version);
CREATE INDEX idx_analysis_processed_at ON analysis_results(processed_at DESC);
