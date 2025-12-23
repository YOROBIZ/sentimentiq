// Large demo dataset generator for SentimentIQ
// Generates 75-100 feedbacks with ~75% positive sentiment

const positiveTemplates = [
    { name: "Sophie Martin", content: "Un séjour absolument magnifique ! Le spa est incroyable.", keys: "séjour, magnifique, spa" },
    { name: "Jean Dupont", content: "Personnel très accueillant et chambre très propre. Je recommande.", keys: "personnel, accueillant, propre" },
    { name: "Lucas Bernard", content: "La vue sur la mer depuis la suite est à couper le souffle.", keys: "vue, mer, suite" },
    { name: "Emma Petit", content: "Petit déjeuner copieux et délicieux avec beaucoup de choix frais.", keys: "petit déjeuner, délicieux, choix" },
    { name: "Thomas Robert", content: "Service de conciergerie au top, ils ont réservé nos billets rapidement.", keys: "conciergerie, top, billets" },
    { name: "Chloé Richard", content: "Le lit est d'un confort absolu, j'ai dormi comme un bébé.", keys: "lit, confort, sommeil" },
    { name: "Inès Durand", content: "Tout était parfait, de l'arrivée au départ. Une expérience 5 étoiles.", keys: "parfait, expérience, 5 étoiles" },
    { name: "Hugo Lefebvre", content: "J'ai adoré la décoration du lobby, très moderne et chic.", keys: "décoration, lobby, moderne" },
    { name: "Manon Moreau", content: "Merci pour le surclassement ! Geste très apprécié.", keys: "surclassement, geste, merci" },
    { name: "Alexandre Simon", content: "Emplacement idéal en plein centre, tout est accessible à pied.", keys: "emplacement, centre, accessible" },
    { name: "Marie Rousseau", content: "Le restaurant de l'hôtel est excellent. Service impeccable.", keys: "restaurant, excellent, service" },
    { name: "Pierre Bonnet", content: "Piscine magnifique avec une eau toujours propre.", keys: "piscine, magnifique, propre" },
    { name: "Julie Martin", content: "Le personnel a été aux petits soins pendant tout le séjour.", keys: "personnel, petits soins, séjour" },
    { name: "Marc Leroy", content: "Climatisation efficace, parfait pour la canicule.", keys: "climatisation, efficace, canicule" },
    { name: "Nathalie Blanc", content: "Literie de qualité exceptionnelle. Meilleur sommeil de ma vie.", keys: "literie, qualité, sommeil" },
    { name: "Olivier Fernandez", content: "Le bar de l'hôtel propose des cocktails vraiment créatifs.", keys: "bar, cocktails, créatifs" },
    { name: "Pauline Roux", content: "Service en chambre rapide et les plats étaient encore chauds.", keys: "service, rapide, chaud" },
    { name: "Vincent Girard", content: "Salle de fitness bien équipée avec des machines récentes.", keys: "fitness, équipée, machines" },
    { name: "Sandrine Mercier", content: "Les serviettes sont d'une douceur incroyable.", keys: "serviettes, douceur, qualité" },
    { name: "David Perrin", content: "Check-in très fluide, on nous a donné nos clés en 2 minutes.", keys: "check-in, fluide, rapide" }
];

const neutralTemplates = [
    { name: "Camille Laurent", content: "Hôtel correct, sans plus. Le prix est un peu élevé pour la prestation.", keys: "correct, prix, prestation" },
    { name: "Nicolas Michel", content: "La chambre était prête mais un peu petite à mon goût.", keys: "chambre, petite" },
    { name: "Léa Garcia", content: "Petit déjeuner standard, rien d'exceptionnel mais fait le job.", keys: "petit déjeuner, standard" },
    { name: "Antoine David", content: "Décoration un peu vieillotte mais l'hôtel est calme.", keys: "décoration, vieillotte, calme" },
    { name: "Julie Bertrand", content: "Le personnel est poli mais pas très chaleureux.", keys: "personnel, poli, chaleureux" },
    { name: "Mathieu Roux", content: "Bien pour une nuit de passage, mais pas pour des vacances.", keys: "passage, vacances" },
    { name: "Sarah Vincent", content: "Le restaurant était fermé, dommage, mais il y a des options autour.", keys: "restaurant, fermé, options" },
    { name: "Kevin Fournier", content: "Ascenseur un peu lent, sinon ça va.", keys: "ascenseur, lent" }
];

const negativeTemplates = [
    { name: "Paul Morel", content: "Impossible de dormir à cause du bruit de la rue. Isolation zéro.", keys: "dormir, bruit, rue, noise" },
    { name: "Céline Girardin", content: "La salle de bain était sale, il y avait des cheveux dans la baignoire.", keys: "salle de bain, sale, cheveux, dirty" },
    { name: "Romain Bonnet", content: "Le room service est arrivé avec 1h de retard et c'était froid.", keys: "room service, retard, froid, late" },
    { name: "Aurélie Francois", content: "Le réceptionniste était impoli et agressif lors du check-out.", keys: "réceptionniste, impoli, agressif, rude" },
    { name: "Maxime Dubois", content: "Le Wifi ne marchait pas dans la chambre, impossible de travailler.", keys: "wifi, marche pas, travailler" },
    { name: "Elodie Blanc", content: "Problème de paiement, on m'a débité deux fois ! Remboursez-moi.", keys: "problème, paiement, débité, payment" },
    { name: "Pierre Guerin", content: "Il y avait une odeur d'égout insupportable dans le couloir.", keys: "odeur, égout, couloir, smell" },
    { name: "Christine Lopez", content: "La clim ne fonctionnait pas et il faisait 30 degrés dans la chambre.", keys: "clim, fonctionne pas, chaleur" }
];

// Generate 75-100 feedbacks: ~75% positive, ~15% neutral, ~10% negative
function generateDemoDataset() {
    const total = 75 + Math.floor(Math.random() * 26); // 75-100
    const positiveCount = Math.floor(total * 0.75);
    const neutralCount = Math.floor(total * 0.15);
    const negativeCount = total - positiveCount - neutralCount;

    const dataset = [];

    for (let i = 0; i < positiveCount; i++) {
        const template = positiveTemplates[Math.floor(Math.random() * positiveTemplates.length)];
        dataset.push({
            ...template,
            name: `${template.name.split(' ')[0]} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}.`,
            sentiment: 'POSITIVE',
            conf: 0.85 + Math.random() * 0.14
        });
    }

    for (let i = 0; i < neutralCount; i++) {
        const template = neutralTemplates[Math.floor(Math.random() * neutralTemplates.length)];
        dataset.push({
            ...template,
            name: `${template.name.split(' ')[0]} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}.`,
            sentiment: 'NEUTRAL',
            conf: 0.45 + Math.random() * 0.25
        });
    }

    for (let i = 0; i < negativeCount; i++) {
        const template = negativeTemplates[Math.floor(Math.random() * negativeTemplates.length)];
        dataset.push({
            ...template,
            name: `${template.name.split(' ')[0]} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}.`,
            sentiment: 'NEGATIVE',
            conf: 0.85 + Math.random() * 0.14
        });
    }

    return dataset;
}

module.exports = { generateDemoDataset };
