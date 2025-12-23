# SentimentIQ — Technical Architecture & Reviewer's Guide

This document is intended for technical reviewers and senior architects. It details the deliberate design choices that elevate SentimentIQ from a "dashboard prototype" to a "Live-Ready" industrial system.

## 🏗️ Monorepo Architecture

SentimentIQ is structured as a unified monorepo to ensure atomic deployments and consistent development:

- **`/landing`**: Angular 17 Standalone components. Optimized for LCP and SEO.
- **`/dashboard`**: Physics-driven Vanilla JS interface. High-performance analysis with a unique Aurora UX.
- **`/api`**: Node.js serverless functions (Vercel-native).
- **`/src`**: Shared business logic, database connectors, and worker logic.

## 🛡️ "Live-Ready" Resilience Patterns

Most prototypes break under real-world load. SentimentIQ implements three core patterns to ensure uptime:

### 1. The Staging Buffer (Phase 8-9)
Instead of processing Meta Graph API signals immediately, we use a `raw_feedbacks` staging table. This decouples ingestion from analysis, allowing the system to scale and handle bursts gracefully.

### 2. Atomic Status Locking
To prevent race conditions in a distributed environment (e.g., multiple Vercel function instances), the `AnalysisWorker` uses an atomic `lock_id`. Only one worker can claim an item for processing at a time.

### 3. Exponential Backoff with Jitter
Intermittent API failures (HTTP 429, 503) are handled via a robust retry mechanism:
- **Strategy**: Incremental delay capped at 24 hours.
- **Resilience**: Random jitter prevents "Thundering Herd" effects on external APIs.
- **Observability**: Every item tracks its `attempts` and `last_error`.

## 🧠 Intelligence Engine

The platform deconstructs customer signals into:
1. **Sentiment**: Qualitative emotional mapping (Positive/Neutral/Negative).
2. **Context Tags**: Intent detection (UX, Brand, Support, Growth).
3. **Severity Scoring**: Quantifiable impact for predictive friction mapping.

## 🚀 Scalability & Deployment

- **Vercel Zero Config**: Leverages `vercel.json` for advanced routing and serverless isolation.
- **Hybrid Meta Mode**: The `META_MODE` flag allows a seamless transition between a high-fidelity "Mock" demo and a full "Live" connection without code changes.

---
*SentimentIQ demonstrates a deep understanding of full-stack reliability, AI integration, and product-focused engineering.*
