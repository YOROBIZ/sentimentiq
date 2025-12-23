const express = require('express');
const path = require('path');
const db = require('./src/database');
const processor = require('./src/processor');
const analysisWorker = require('./src/workers/analysisWorker');

// Démarrer le worker de traitement en arrière-plan (Phase 8)
analysisWorker.start();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- ROUTES ORDER MATTERS ---

// 1. Dashboard (Vanilla JS) served on /app
const publicPath = path.join(__dirname, 'public');
app.use('/app', express.static(publicPath));

// Handle /app/* explicitly to serve the main dashboard file
app.get('/app/*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// 2. Landing Page (Angular Build) served on /
// Note: This folder exists after 'cmd /c npx ng build'
const landingPath = path.join(__dirname, 'landing', 'dist', 'landing', 'browser');

// Serve static assets with long cache (7 days)
app.use(express.static(landingPath, {
    maxAge: '7d',
    etag: true,
    setHeaders: (res, path) => {
        // Do NOT cache the index.html file itself
        if (path.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Fallback for Angular SPA routes
app.get('*', (req, res, next) => {
    // Exclude API routes from fallback
    if (req.url.startsWith('/api')) return next();

    console.log(`[SPA Fallback] Serving Landing for: ${req.url}`);
    res.sendFile(path.join(landingPath, 'index.html'));
});

// 1. GET ALL INSIGHTS (With Filter)
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

// 2. GET TRENDS (Global)
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

// 2a. GET TRENDS HISTORY (7d/30d)
app.get('/api/trends/history', (req, res) => {
    const range = req.query.range || '7d';
    const limit = range === '30d' ? 30 : 7;

    // SQLite Date Logic: group by day
    const sql = `
        SELECT 
            strftime('%Y-%m-%d', created_at) as date,
            COUNT(*) as count,
            AVG(CASE 
                WHEN sentiment='POSITIVE' THEN 100 
                WHEN sentiment='NEUTRAL' THEN 50 
                ELSE 0 
            END) as avg_score,
            SUM(CASE WHEN sentiment='POSITIVE' THEN 1 ELSE 0 END) as pos_count,
            SUM(CASE WHEN sentiment='NEUTRAL' THEN 1 ELSE 0 END) as neu_count,
            SUM(CASE WHEN sentiment='NEGATIVE' THEN 1 ELSE 0 END) as neg_count
        FROM feedbacks
        GROUP BY date
        ORDER BY date DESC
        LIMIT ?
    `;

    db.all(sql, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Reverse to have chronological order for charts
        res.json(rows.reverse());
    });
});

// 2b. GET DRIVERS (Keywords by Sentiment)
app.get('/api/insights/keywords', (req, res) => {
    const sentiment = req.query.sentiment || 'NEGATIVE'; // Default focus on pain points

    db.all('SELECT key_phrases FROM feedbacks WHERE sentiment = ?', [sentiment], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const phraseCounts = {};
        rows.forEach(row => {
            if (!row.key_phrases) return;
            // Split CSV string (stored by SQLite toString on array)
            const phrases = row.key_phrases.split(',');
            phrases.forEach(p => {
                const phrase = p.trim().toLowerCase();
                if (phrase && phrase.length > 2) {
                    phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
                }
            });
        });

        const sorted = Object.entries(phraseCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        res.json(sorted);
    });
});

// 2c. GET ALERTS (Low Score)
app.get('/api/alerts', (req, res) => {
    const threshold = parseInt(req.query.threshold) || 40; // Default alert < 40%

    // Subquery wrapper to filter by computed score
    const sql = `
        SELECT * FROM (
            SELECT *, 
            (CASE 
                WHEN sentiment='POSITIVE' THEN 100 
                WHEN sentiment='NEUTRAL' THEN 50 
                ELSE 0 
            END) as score
            FROM feedbacks
        ) WHERE score < ? ORDER BY created_at DESC
    `;

    db.all(sql, [threshold], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. EXPORT CSV
app.get('/api/export', (req, res) => {
    db.all('SELECT * FROM feedbacks', (err, rows) => {
        if (err) return res.status(500).send("Erreur Base de données");

        // Add BOM for Excel UTF-8 compatibility
        let csv = '\uFEFFID,Client,Avis,Sentiment,Confiance,Themes,Date\n';
        rows.forEach(row => {
            // Sanitize content (remove newlines for CSV safety)
            const cleanContent = row.content ? row.content.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""') : "";
            csv += `${row.id},"${row.customer_name}","${cleanContent}",${row.sentiment},${row.confidence},"${row.key_phrases}",${row.created_at}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment(`rapport_insights_${Date.now()}.csv`);
        res.send(csv);
    });
});

// 4. ANALYZE NEW FEEDBACK
// 4. ANALYZE NEW FEEDBACK (Protected & Validated)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const MAX_REQUESTS = 10; // Max 10 requests per minute
const requestCounts = new Map();

app.post('/api/analyze', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // --- RATE LIMITING (Memory Store) ---
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    const timestamps = requestCounts.get(ip);
    // Remove old timestamps
    const recentRequests = timestamps.filter(time => now - time < RATE_LIMIT_WINDOW);
    requestCounts.set(ip, recentRequests);

    if (recentRequests.length >= MAX_REQUESTS) {
        return res.status(429).json({
            error: "Too Many Requests",
            message: "Veuillez patienter 1 minute."
        });
    }
    recentRequests.push(now);

    // --- INPUT VALIDATION & SANITATION ---
    let { customer_name, content } = req.body;

    if (!customer_name || !content) {
        return res.status(400).json({ error: 'INVALID_INPUT', message: 'Nom et Avis requis.' });
    }

    // Sanitation (Basic HTML Tag Removal)
    customer_name = customer_name.replace(/<[^>]*>?/gm, "").trim();
    content = content.replace(/<[^>]*>?/gm, "").trim();

    // Length Check
    if (content.length < 10) return res.status(400).json({ error: 'INVALID_INPUT', message: 'Avis trop court (min 10 car).' });
    if (content.length > 2000) return res.status(400).json({ error: 'INVALID_INPUT', message: 'Avis trop long (max 2000 car).' });

    try {
        console.log(`Analyzing for ${customer_name}...`);
        const insights = await processor.analyzeFeedback(content);
        console.log("Analysis Result:", insights);

        const sql = `INSERT INTO feedbacks (customer_name, content, sentiment, confidence, key_phrases) VALUES (?, ?, ?, ?, ?)`;
        const params = [customer_name, content, insights.sentiment, insights.confidence, insights.keyPhrases];

        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, customer_name, content, ...insights });
        });
    } catch (error) {
        console.error("Server Error during analysis:", error);
        res.status(500).json({ error: 'Erreur lors de l\'analyse' });
    }
});

// --- API SOURCES (Phase 9 - Unified & Resilient) ---
const sourceManager = require('./src/connectors/sourceManager');
const metaConnector = require('./src/connectors/metaConnector');

// Feature Flag: MOCK | LIVE
const META_MODE = process.env.META_MODE || 'mock';

// 5. GET ALL SOURCES (Connected/Available)
app.get('/api/sources', async (req, res) => {
    try {
        const sources = await sourceManager.getSources();
        res.json({
            mode: META_MODE,
            sources
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. META SYNC (Refined for Phase 9)
app.post('/api/sources/meta/sync', async (req, res) => {
    const { source } = req.body;

    // Logic: In Mock Mode, we always inject demo data if no specific ID is provided
    if (META_MODE === 'mock') {
        console.log('[worker][meta] Running in MOCK mode. Injecting test data...');
        const demoItem = {
            id: `mock_${Date.now()}`,
            text: `[MOCK] Test feedback from ${source || 'instagram'} - ${new Date().toLocaleTimeString()}`,
            from: { name: "Mock User" },
            permalink_url: "https://mock.link"
        };
        await metaConnector.saveRawFeedback(source || 'instagram', demoItem);
        return res.json({ status: 'OK', message: "Mock data injected into buffer." });
    }

    // In LIVE mode, we expect tokens from connected_sources table or request
    try {
        // [Stub] Fetch token from sourceManager...
        res.status(501).json({ error: 'NOT_IMPLEMENTED', message: "Live mode requires App Review/Valid Tokens." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 7. GET META STATUS (Audit/Processing stats)
app.get('/api/sources/meta/status', (req, res) => {
    const sql = `
        SELECT 
            status, 
            COUNT(*) as count,
            AVG(attempts) as avg_attempts,
            MAX(last_sync_at) as last_sync
        FROM raw_feedbacks 
        GROUP BY status
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ stats: rows, mode: META_MODE });
    });
});

// 8. OAUTH STUBS (For future Live integration)
app.get('/api/auth/meta', (req, res) => {
    res.json({
        auth_url: "https://www.facebook.com/v18.0/dialog/oauth?client_id=STUB&redirect_uri=STUB",
        state: "INITIATED"
    });
});

app.get('/api/auth/meta/callback', async (req, res) => {
    // [STUB] Handle code exchange
    res.json({ message: "OAuth Callback received (Stub)" });
});

app.listen(PORT, () => {
    console.log(`Serveur "InsightAI Pro" lancé sur http://localhost:${PORT}`);
});
