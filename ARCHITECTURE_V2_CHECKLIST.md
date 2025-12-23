# ✅ Architecture V2 Stability Checklist

Cette checklist valide les critères imposés pour la transition en "Stability Pack V2".

## 🔌 1. API Contract (Node <-> FastAPI)

- [x] **Strict Response Format**
    - `score` (float -1:1), `label` (enum), `confidence` (float 0:1), `keywords` (array)
- [x] **Metadata Injection**
    - `api_version`: "v2.0.0"
    - `model_version`: "textblob-lite-v1"
    - `request_id`: Tracing ID
    - `latency_ms`: Performance monitoring
- [x] **Error Handling**
    - Format Standard: `{ error_code, message, details? }`
    - Codes HTTP propres (400 vs 500)

## 🗄️ 2. Database Hardening (PostgreSQL)

- [x] **Indexes Performance**
    - `idx_feedbacks_hotel_created` (Partitionnement logique)
    - `idx_analysis_feedback_id` (Jointure 1:N)
    - `idx_analysis_model_version` (A/B Testing lookup)
    - `idx_analysis_processed_at` (Audit timeline)
- [x] **Integrity Constraints**
    - `NOT NULL` sur les champs critiques
    - `CHECK` constraints sur scores (-1..1) et confidence (0..1)
    - `UNIQUE(feedback_id, model_version)` anti-doublons

## 🛡️ 3. Security & Abus

- [x] **Rate Limiting (Node Layer)**
    - Implémenté: Token Bucket simplifié (Map memory)
    - Limite: 10 requêtes / minute / IP
    - Réponse: 429 Too Many Requests
- [x] **Input Validation**
    - Longueur min (10 chars) et max (2000 chars)
    - Checks `isEmpty` / `isString`
- [x] **Sanitation**
    - Regex "Strip HTML Tags" pour éviter XSS basique stocké

## 🚀 Status
**READY FOR PUBLIC DEMO**
