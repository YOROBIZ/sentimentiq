/**
 * MetaConnector - insight-ai-pro
 * Handles integration with Meta Graph API for Instagram and Facebook.
 */

const db = require('../database');

class MetaConnector {
    constructor() {
        this.graphBaseUrl = 'https://graph.facebook.com/v21.0';
    }

    /**
     * Normalizes Meta JSON and saves to raw_feedbacks (Phase 9 Aligned)
     * @param {string} source - 'instagram' | 'facebook'
     * @param {object} item - Raw Graph API object
     */
    async saveRawFeedback(source, item) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO raw_feedbacks (source, external_id, customer_name, content, permalink, raw_json, status, ingested_at)
                VALUES (?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)
                ON CONFLICT(external_id) DO UPDATE SET
                    ingested_at = CURRENT_TIMESTAMP
            `;

            const content = item.text || item.message || '';
            const customer_name = item.from?.name || 'Social User';
            const permalink = item.permalink_url || '';

            const params = [
                source,
                item.id,
                customer_name,
                content,
                permalink,
                JSON.stringify(item)
            ];

            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve(this.lastID);
            });
        });
    }

    /**
     * Fetches comments from a specific Media Object (IG) or Post (FB)
     * @param {string} accessToken 
     * @param {string} objectId 
     * @param {string} source 
     */
    async fetchComments(accessToken, objectId, source) {
        console.log(`[MetaConnector] Syncing comments for ${source} object: ${objectId}`);

        try {
            const url = `${this.graphBaseUrl}/${objectId}/comments?access_token=${accessToken}&fields=id,text,from,timestamp,permalink_url`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const comments = data.data || [];
            let savedCount = 0;

            for (const comment of comments) {
                const id = await this.saveRawFeedback(source, comment);
                if (id) savedCount++;
            }

            return { total: comments.length, saved: savedCount };
        } catch (error) {
            console.error(`[MetaConnector] Error fetching comments:`, error.message);
            throw error;
        }
    }

    /**
     * Exchange short-lived token for long-lived (60 days)
     */
    async getLongLivedToken(shortToken, appId, appSecret) {
        const url = `${this.graphBaseUrl}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
        const response = await fetch(url);
        return await response.json();
    }
}

module.exports = new MetaConnector();
