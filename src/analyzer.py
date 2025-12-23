import sys
import json
import re

def analyze_text(text):
    # Dictionnaire de mots clés (Lexique simplifié pour la démo)
    positive_words = {"excellent", "parfait", "incroyable", "merci", "adore", "top", "super", "génial", "bon", "rapide", "efficace", "propre"}
    negative_words = {"déçu", "problème", "lent", "mauvais", "horrible", "cher", "jamais", "pire", "sale", "bruit", "froid", "attente"}
    
    text_lower = text.lower()
    words = re.findall(r'\w+', text_lower)
    
    # Calcul du score
    score = 0
    pos_count = 0
    neg_count = 0
    
    for word in words:
        if word in positive_words:
            score += 1
            pos_count += 1
        elif word in negative_words:
            score -= 1
            neg_count += 1
            
    # Détermination du sentiment
    sentiment = "NEUTRAL"
    confidence = 0.50
    
    if score > 0:
        sentiment = "POSITIVE"
        confidence = 0.70 + (min(pos_count, 5) * 0.05)
    elif score < 0:
        sentiment = "NEGATIVE"
        confidence = 0.70 + (min(neg_count, 5) * 0.05)
        
    # Extraction de thèmes (Key phrase extraction naif)
    themes = []
    if any(w in text_lower for w in ["chambre", "lit", "vue", "propreté"]):
        themes.append("Hébergement")
    if any(w in text_lower for w in ["repas", "manger", "restaurant", "déjeuner", "diner"]):
        themes.append("Restauration")
    if any(w in text_lower for w in ["service", "accueil", "personnel", "staff"]):
        themes.append("Service Client")
    if any(w in text_lower for w in ["prix", "tarif", "facture", "argent"]):
        themes.append("Tarification")
        
    if not themes:
        themes.append("Général")

    result = {
        "sentiment": sentiment,
        "confidence": round(min(confidence, 0.99), 2),
        "keyPhrases": ", ".join(themes)
    }
    
    return result

if __name__ == "__main__":
    # Récupérer l'argument depuis la ligne de commande (Node.js envoie le texte)
    try:
        input_text = sys.argv[1]
        analysis = analyze_text(input_text)
        print(json.dumps(analysis))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
