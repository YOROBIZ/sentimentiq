const db = require('../database');
const processor = require('../processor');
const crypto = require('crypto');

class AnalysisWorker {
    constructor() {
        this.isProcessing = false;
        this.pollInterval = 10000; // 10 seconds
        this.batchSize = 5;
        this.workerId = crypto.randomUUID();

        // Resilience Config
        this.RETRY_BASE_MS = 30000; // 30s
        this.RETRY_MAX_MS = 3600000; // 1 hour cap
    }

    start() {
        console.log(`[worker][meta] Started (ID: ${this.workerId.slice(0, 8)}). Polling every 10s...`);
        setInterval(() => this.processBatch(), this.pollInterval);
        this.processBatch();
    }

    async processBatch() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const items = await this.getPendingItems();
            if (items.length > 0) {
                console.log(`[worker][meta] Found ${items.length} items to process/retry.`);
                for (const item of items) {
                    await this.analyzeItem(item);
                }
            }
        } catch (error) {
            console.error('[worker][meta] Batch Error:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Fetch items that are PENDING or FAILED (and ready for retry)
     */
    getPendingItems() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM raw_feedbacks 
                WHERE status = 'PENDING' 
                OR (status = 'FAILED' AND next_retry_at <= CURRENT_TIMESTAMP)
                LIMIT ?
            `;
            db.all(sql, [this.batchSize], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }

    async analyzeItem(item) {
        // 1. Atomic Lock
        const locked = await this.acquireLock(item.id);
        if (!locked) return; // Already taken by another worker/process

        console.log(`[worker][meta] Processing ${item.source} ID: ${item.id} (Attempt ${item.attempts + 1})`);

        try {
            // 2. AI Analysis
            const insights = await processor.analyzeFeedback(item.content);

            // 3. Push to dashboard
            await this.insertToMainFeedbacks({
                customer_name: item.customer_name,
                content: item.content,
                ...insights
            });

            // 4. Final Success Update
            await this.markSuccess(item.id);
            console.log(`[worker][meta] Item ${item.id} PROCESSED.`);

        } catch (error) {
            await this.handleFailure(item, error);
        }
    }

    acquireLock(id) {
        return new Promise((resolve) => {
            db.run(
                'UPDATE raw_feedbacks SET status = "PROCESSING", lock_id = ?, attempts = attempts + 1 WHERE id = ? AND status != "PROCESSING"',
                [this.workerId, id],
                function (err) {
                    resolve(!err && this.changes > 0);
                }
            );
        });
    }

    markSuccess(id) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE raw_feedbacks SET status = "PROCESSED", analyzed_at = CURRENT_TIMESTAMP, lock_id = NULL WHERE id = ?',
                [id],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    async handleFailure(item, error) {
        console.error(`[worker][meta] Failed ${item.id}: ${error.message}`);

        const attempts = item.attempts + 1;
        // Exponential Backoff: base * 2^attempts
        let delay = Math.min(this.RETRY_BASE_MS * Math.pow(2, attempts), this.RETRY_MAX_MS);

        // Add Jitter (+/- 10%)
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);
        delay = Math.round(delay + jitter);

        const nextRetry = new Date(Date.now() + delay).toISOString().replace('T', ' ').replace('Z', '');

        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE raw_feedbacks SET status = "FAILED", last_error = ?, next_retry_at = ?, lock_id = NULL WHERE id = ?',
                [error.message, nextRetry, item.id],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    insertToMainFeedbacks(data) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO feedbacks (customer_name, content, sentiment, confidence, key_phrases) VALUES (?, ?, ?, ?, ?)`;
            db.run(sql, [data.customer_name, data.content, data.sentiment, data.confidence, data.keyPhrases], function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }
}

module.exports = new AnalysisWorker();
