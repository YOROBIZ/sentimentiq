const express = require('express');
const path = require('path');
const db = require('../src/database');
const processor = require('../src/processor');
const analysisWorker = require('../src/workers/analysisWorker');
const sourceManager = require('../src/connectors/sourceManager');
const metaConnector = require('../src/connectors/metaConnector');

// Only start worker loop if NOT in a serverless environment (Vercel)
// On Vercel, we will trigger processing manually or via cron if needed
if (!process.env.VERCEL) {
    analysisWorker.start();
}

const app = express();
app.use(express.json());

// --- API ROUTES ---

// 1. GET ALL INSIGHTS
app.get('/api/insights', (req, res) => {
    const { sentiment } = req.query;
    let sql = 'SELECT * FROM feedbacks';
    const params = [];
    if (sentiment) {
        sql += ' WHERE sentiment = ?';
        params.push(sentiment);
    }
    sql += ' ORDER BY created_at DESC';
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. TRENDS
app.get('/api/trends', (req, res) => {
    db.all('SELECT content FROM feedbacks', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const wordCounts = {};
        const stopWords = ['le', 'la', 'les', 'un', 'une', 'de', 'du', 'des', 'et', 'est', 'c\'est', 'je', 'nous', 'pour', 'mais', 'pas', 'très', 'était', 'a', 'à', 'en', 'ce', 'que', 'qui', 'dans', 'sur', 'avec', 'tout'];
        rows.forEach(row => {
            if (!row.content) return;
            const words = row.content.toLowerCase().match(/\w+/g) || [];
            words.forEach(word => {
                if (word.length > 3 && !stopWords.includes(word)) {
                    wordCounts[word] = (wordCounts[word] || 0) + 1;
                }
            });
        });
        const sortedTrends = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word, count]) => ({ word, count }));
        res.json(sortedTrends);
    });
});

app.get('/api/trends/history', (req, res) => {
    const range = req.query.range || '7d';
    const limit = range === '30d' ? 30 : 7;
    const sql = `
        SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count,
        AVG(CASE WHEN sentiment='POSITIVE' THEN 100 WHEN sentiment='NEUTRAL' THEN 50 ELSE 0 END) as avg_score,
        SUM(CASE WHEN sentiment='POSITIVE' THEN 1 ELSE 0 END) as pos_count,
        SUM(CASE WHEN sentiment='NEUTRAL' THEN 1 ELSE 0 END) as neu_count,
        SUM(CASE WHEN sentiment='NEGATIVE' THEN 1 ELSE 0 END) as neg_count
        FROM feedbacks GROUP BY date ORDER BY date DESC LIMIT ?
    `;
    db.all(sql, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.reverse());
    });
});

app.get('/api/insights/keywords', (req, res) => {
    const sentiment = req.query.sentiment || 'NEGATIVE';
    db.all('SELECT key_phrases FROM feedbacks WHERE sentiment = ?', [sentiment], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const phraseCounts = {};
        rows.forEach(row => {
            if (!row.key_phrases) return;
            const phrases = row.key_phrases.split(',');
            phrases.forEach(p => {
                const phrase = p.trim().toLowerCase();
                if (phrase && phrase.length > 2) phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
            });
        });
        const sorted = Object.entries(phraseCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));
        res.json(sorted);
    });
});

app.get('/api/alerts', (req, res) => {
    const threshold = parseInt(req.query.threshold) || 40;
    const sql = `SELECT * FROM (SELECT *, (CASE WHEN sentiment='POSITIVE' THEN 100 WHEN sentiment='NEUTRAL' THEN 50 ELSE 0 END) as score FROM feedbacks) WHERE score < ? ORDER BY created_at DESC`;
    db.all(sql, [threshold], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/export', (req, res) => {
    db.all('SELECT * FROM feedbacks', (err, rows) => {
        if (err) return res.status(500).send("Erreur Base de données");
        let csv = '\uFEFFID,Client,Avis,Sentiment,Confiance,Themes,Date\n';
        rows.forEach(row => {
            const cleanContent = row.content ? row.content.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""') : "";
            csv += `${row.id},"${row.customer_name}","${cleanContent}",${row.sentiment},${row.confidence},"${row.key_phrases}",${row.created_at}\n`;
        });
        res.header('Content-Type', 'text/csv');
        res.attachment(`rapport_insights_${Date.now()}.csv`);
        res.send(csv);
    });
});

app.post('/api/analyze', async (req, res) => {
    let { customer_name, content } = req.body;
    if (!customer_name || !content) return res.status(400).json({ error: 'INVALID_INPUT', message: 'Nom et Avis requis.' });
    customer_name = customer_name.replace(/<[^>]*>?/gm, "").trim();
    content = content.replace(/<[^>]*>?/gm, "").trim();
    try {
        const insights = await processor.analyzeFeedback(content);
        const sql = `INSERT INTO feedbacks (customer_name, content, sentiment, confidence, key_phrases) VALUES (?, ?, ?, ?, ?)`;
        const params = [customer_name, content, insights.sentiment, insights.confidence, insights.keyPhrases];
        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, customer_name, content, ...insights });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de l\'analyse' });
    }
});

// --- SOURCE API ---
const META_MODE = process.env.META_MODE || 'mock';

app.get('/api/sources', async (req, res) => {
    try {
        const sources = await sourceManager.getSources();
        res.json({ mode: META_MODE, sources });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/sources/meta/sync', async (req, res) => {
    const { source } = req.body;
    if (META_MODE === 'mock') {
        const demoItem = {
            id: `mock_${Date.now()}`,
            text: `[MOCK] Test feedback from ${source || 'instagram'} - ${new Date().toLocaleTimeString()}`,
            from: { name: "Mock User" },
            permalink_url: "https://mock.link"
        };
        await metaConnector.saveRawFeedback(source || 'instagram', demoItem);

        // Trigger ONE processing pass on Vercel to show results immediately
        if (process.env.VERCEL) {
            setTimeout(() => analysisWorker.analyzePending(), 100);
        }

        return res.json({ status: 'OK', message: "Mock data injected into buffer." });
    }
    res.status(501).json({ error: 'NOT_IMPLEMENTED', message: "Live mode requires App Review/Valid Tokens." });
});

app.get('/api/sources/meta/status', (req, res) => {
    const sql = `SELECT status, COUNT(*) as count, AVG(attempts) as avg_attempts, MAX(last_sync_at) as last_sync FROM raw_feedbacks GROUP BY status`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ stats: rows, mode: META_MODE });
    });
});

// RESET ALL FEEDBACKS
app.delete('/api/reset', (req, res) => {
    db.run('DELETE FROM feedbacks', (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.run('DELETE FROM sqlite_sequence WHERE name="feedbacks"', (err2) => {
            if (err2) console.error('Reset sequence error:', err2);
            res.json({ status: 'OK', message: 'Tous les feedbacks ont été supprimés.' });
        });
    });
});

app.get('/api/auth/meta', (req, res) => {
    res.json({ auth_url: "https://www.facebook.com/v18.0/dialog/oauth?client_id=STUB&redirect_uri=STUB", state: "INITIATED" });
});

module.exports = app;
