const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.VERCEL
    ? path.resolve('/tmp', 'insights.db')
    : path.resolve(__dirname, 'data', 'insights.db');

// Assurer que le dossier data existe
const fs = require('fs');
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.message);
    } else {
        console.log('Connecté à la base de données SQLite.');
    }
});

db.serialize(() => {
    // Création de la table feedbacks
    db.run(`CREATE TABLE IF NOT EXISTS feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        content TEXT,
        sentiment TEXT,
        confidence REAL,
        key_phrases TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // [NEW] Table de staging pour Meta (Phase 9 - Resiliency)
    db.run(`CREATE TABLE IF NOT EXISTS raw_feedbacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        external_id TEXT UNIQUE,
        customer_name TEXT,
        content TEXT,
        permalink TEXT,
        status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, PROCESSED, FAILED
        lock_id TEXT, -- Pour empêcher plusieurs workers de traiter
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        next_retry_at DATETIME,
        ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        analyzed_at DATETIME,
        raw_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // [NEW] Table de gestion des sources (Phase 9)
    db.run(`CREATE TABLE IF NOT EXISTS connected_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT, -- 'instagram', 'facebook'
        user_id TEXT,
        scopes TEXT, -- JSON list
        access_token TEXT,
        token_type TEXT, -- short_lived, long_lived
        expires_at DATETIME,
        oauth_state TEXT DEFAULT 'INITIATED', -- INITIATED, CALLBACK_RECEIVED, CONNECTED, EXPIRED, ERROR
        last_sync_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Tables "feedbacks", "raw_feedbacks" et "connected_sources" prêtes.');

    // Auto-seed demo data on Vercel or if database is empty
    db.get('SELECT COUNT(*) as count FROM feedbacks', (err, row) => {
        if (err) {
            console.error('Error checking feedbacks:', err);
            return;
        }

        if (row.count === 0) {
            console.log('🌱 Seeding demo data...');
            const demoFeedbacks = [
                { name: "Sophie Martin", content: "Un séjour absolument magnifique ! Le spa est incroyable.", sentiment: "POSITIVE", conf: 0.95, keys: "séjour, magnifique, spa" },
                { name: "Jean Dupont", content: "Personnel très accueillant et chambre très propre. Je recommande.", sentiment: "POSITIVE", conf: 0.92, keys: "personnel, accueillant, propre" },
                { name: "Lucas Bernard", content: "La vue sur la mer depuis la suite est à couper le souffle.", sentiment: "POSITIVE", conf: 0.98, keys: "vue, mer, suite" },
                { name: "Emma Petit", content: "Petit déjeuner copieux et délicieux avec beaucoup de choix frais.", sentiment: "POSITIVE", conf: 0.89, keys: "petit déjeuner, délicieux, choix" },
                { name: "Thomas Robert", content: "Service de conciergerie au top, ils ont réservé nos billets rapidement.", sentiment: "POSITIVE", conf: 0.90, keys: "conciergerie, top, billets" },
                { name: "Chloé Richard", content: "Le lit est d'un confort absolu, j'ai dormi comme un bébé.", sentiment: "POSITIVE", conf: 0.94, keys: "lit, confort, sommeil" },
                { name: "Camille Laurent", content: "Hôtel correct, sans plus. Le prix est un peu élevé pour la prestation.", sentiment: "NEUTRAL", conf: 0.60, keys: "correct, prix, prestation" },
                { name: "Nicolas Michel", content: "La chambre était prête mais un peu petite à mon goût.", sentiment: "NEUTRAL", conf: 0.55, keys: "chambre, petite" },
                { name: "Paul Morel", content: "Impossible de dormir à cause du bruit de la rue. Isolation zéro.", sentiment: "NEGATIVE", conf: 0.95, keys: "dormir, bruit, rue, noise" },
                { name: "Céline Girardin", content: "La salle de bain était sale, il y avait des cheveux dans la baignoire.", sentiment: "NEGATIVE", conf: 0.98, keys: "salle de bain, sale, cheveux, dirty" },
                { name: "Romain Bonnet", content: "Le room service est arrivé avec 1h de retard et c'était froid.", sentiment: "NEGATIVE", conf: 0.92, keys: "room service, retard, froid, late" },
                { name: "Maxime Dubois", content: "Le Wifi ne marchait pas dans la chambre, impossible de travailler.", sentiment: "NEGATIVE", conf: 0.99, keys: "wifi, marche pas, travailler" }
            ];

            const stmt = db.prepare("INSERT INTO feedbacks (customer_name, content, sentiment, confidence, key_phrases, created_at) VALUES (?, ?, ?, ?, ?, ?)");

            demoFeedbacks.forEach(f => {
                const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
                stmt.run(f.name, f.content, f.sentiment, f.conf, f.keys, date);
            });

            stmt.finalize(() => {
                console.log('✅ Demo data seeded successfully!');
            });
        } else {
            console.log(`📊 Database already contains ${row.count} feedbacks.`);
        }
    });
});

module.exports = db;
