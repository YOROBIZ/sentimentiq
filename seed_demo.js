const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'src', 'data', 'insights.db');
const db = new sqlite3.Database(dbPath);

const feedbacks = [
    // --- 10 POSITIVE ---
    { name: "Sophie Martin", content: "Un séjour absolument magnifique ! Le spa est incroyable.", sentiment: "POSITIVE", conf: 0.95, keys: "séjour, magnifique, spa" },
    { name: "Jean Dupont", content: "Personnel très accueillant et chambre très propre. Je recommande.", sentiment: "POSITIVE", conf: 0.92, keys: "personnel, accueillant, propre" },
    { name: "Lucas Bernard", content: "La vue sur la mer depuis la suite est à couper le souffle.", sentiment: "POSITIVE", conf: 0.98, keys: "vue, mer, suite" },
    { name: "Emma Petit", content: "Petit déjeuner copieux et délicieux avec beaucoup de choix frais.", sentiment: "POSITIVE", conf: 0.89, keys: "petit déjeuner, délicieux, choix" },
    { name: "Thomas Robert", content: "Service de conciergerie au top, ils ont réservé nos billets rapidement.", sentiment: "POSITIVE", conf: 0.90, keys: "conciergerie, top, billets" },
    { name: "Chloé Richard", content: "Le lit est d'un confort absolu, j'ai dormi comme un bébé.", sentiment: "POSITIVE", conf: 0.94, keys: "lit, confort, sommeil" },
    { name: "Inès Durand", content: "Tout était parfait, de l'arrivée au départ. Une expérience 5 étoiles.", sentiment: "POSITIVE", conf: 0.97, keys: "parfait, expérience, 5 étoiles" },
    { name: "Hugo Lefebvre", content: "J'ai adoré la décoration du lobby, très moderne et chic.", sentiment: "POSITIVE", conf: 0.85, keys: "décoration, lobby, moderne" },
    { name: "Manon Moreau", content: "Merci pour le surclassement ! Geste très apprécié.", sentiment: "POSITIVE", conf: 0.99, keys: "surclassement, geste, merci" },
    { name: "Alexandre Simon", content: "Emplacement idéal en plein centre, tout est accessible à pied.", sentiment: "POSITIVE", conf: 0.88, keys: "emplacement, centre, accessible" },

    // --- 8 NEUTRAL ---
    { name: "Camille Laurent", content: "Hôtel correct, sans plus. Le prix est un peu élevé pour la prestation.", sentiment: "NEUTRAL", conf: 0.60, keys: "correct, prix, prestation" },
    { name: "Nicolas Michel", content: "La chambre était prête mais un peu petite à mon goût.", sentiment: "NEUTRAL", conf: 0.55, keys: "chambre, petite" },
    { name: "Léa Garcia", content: "Petit déjeuner  standard, rien d'exceptionnel mais fait le job.", sentiment: "NEUTRAL", conf: 0.58, keys: "petit déjeuner, standard" },
    { name: "Antoine David", content: "Décoration un peu vieillotte mais l'hôtel est calme.", sentiment: "NEUTRAL", conf: 0.62, keys: "décoration, vieillotte, calme" },
    { name: "Julie Bertrand", content: "Le personnel est poli mais pas très chaleureux.", sentiment: "NEUTRAL", conf: 0.50, keys: "personnel, poli, chaleureux" },
    { name: "Mathieu Roux", content: "Bien pour une nuit de passage, mais pas pour des vacances.", sentiment: "NEUTRAL", conf: 0.52, keys: "passage, vacances" },
    { name: "Sarah Vincent", content: "Le restaurant était fermé, dommage, mais il y a des options autour.", sentiment: "NEUTRAL", conf: 0.45, keys: "restaurant, fermé, options" },
    { name: "Kevin Fournier", content: "Ascenseur un peu lent, sinon ça va.", sentiment: "NEUTRAL", conf: 0.48, keys: "ascenseur, lent" },

    // --- 7 NEGATIVE (Focus Pain Points) ---
    { name: "Paul Morel", content: "Impossible de dormir à cause du bruit de la rue. Isolation zéro (noise).", sentiment: "NEGATIVE", conf: 0.95, keys: "dormir, bruit, rue, noise" },
    { name: "Céline Girardin", content: "La salle de bain était sale, il y avait des cheveux dans la baignoire (dirty).", sentiment: "NEGATIVE", conf: 0.98, keys: "salle de bain, sale, cheveux, dirty" },
    { name: "Romain Bonnet", content: "Le room service est arrivé avec 1h de retard et c'était froid (late).", sentiment: "NEGATIVE", conf: 0.92, keys: "room service, retard, froid, late" },
    { name: "Aurélie Francois", content: "Le réceptionniste était impoli et agressif lors du check-out (rude).", sentiment: "NEGATIVE", conf: 0.96, keys: "réceptionniste, impoli, agressif, rude" },
    { name: "Maxime Dubois", content: "Le Wifi ne marchait pas dans la chambre, impossible de travailler (wifi).", sentiment: "NEGATIVE", conf: 0.99, keys: "wifi, marche pas, travailler" },
    { name: "Elodie Blanc", content: "Problème de paiement, on m'a débité deux fois ! Remboursez-moi (payment).", sentiment: "NEGATIVE", conf: 0.97, keys: "problème, paiement, débité, payment" },
    { name: "Pierre Guerin", content: "Il y avait une odeur d'égout insupportable dans le couloir (smell).", sentiment: "NEGATIVE", conf: 0.93, keys: "odeur, égout, couloir, smell" }
];

// Helper to get random date in last 30 days
function getRandomDate() {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - Math.floor(Math.random() * 30));
    return past.toISOString();
}

db.serialize(() => {
    console.log("🧹 Cleaning Database...");
    db.run("DELETE FROM feedbacks");
    db.run("DELETE FROM sqlite_sequence WHERE name='feedbacks'"); // Reset Auto Increment

    console.log("🌱 Seeding 25 Entries...");
    const stmt = db.prepare("INSERT INTO feedbacks (customer_name, content, sentiment, confidence, key_phrases, created_at) VALUES (?, ?, ?, ?, ?, ?)");

    feedbacks.forEach(f => {
        const date = getRandomDate();
        stmt.run(f.name, f.content, f.sentiment, f.conf, f.keys, date);
    });

    stmt.finalize();
    console.log("✅ Seeding Complete!");
});

db.close();
