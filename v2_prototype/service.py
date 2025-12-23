from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import time
from textblob import TextBlob # Simulated AI Model

# --- CONFIGURATION ---
VERSION = "v2.0.1" # Quality Patch
MODEL_VERSION = "textblob-lite-v1"
START_TIME = time.time() # Boot timestamp

app = FastAPI(
    title="InsightAI Engine",
    description="Microservice d'analyse sémantique dédié.",
    version=VERSION
)

# --- STANDARD ERROR MODEL ---
class APIError(BaseModel):
    error_code: str
    message: str
    details: Optional[str] = None

# --- DATA MODELS (Contract Strict) ---
class AnalysisRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=2000, description="Le texte client à analyser")
    request_id: str = Field(..., description="ID unique de la requête pour tracing")

    @validator('text')
    def validate_text_content(cls, v):
        if not v.strip():
            raise ValueError("Le texte ne peut pas être vide")
        return v

class AnalysisResponse(BaseModel):
    # Payload
    score: float = Field(..., ge=-1.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    sentiment: str = Field(..., regex="^(POSITIVE|NEUTRAL|NEGATIVE)$")
    keywords: List[str]
    
    # Metadata (Strict Contract)
    model_version: str
    api_version: str
    latency_ms: float
    request_id: str

    # Contextual Insights (Upgrade)
    reason_tags: Optional[List[str]] = []
    positive_tags: Optional[List[str]] = []
    severity: Optional[int] = Field(None, ge=1, le=5)

# --- DOMAIN LEXICON ---
# Simple dictionary mapping categories to keywords
DOMAIN_LEXICON = {
    "wifi": ["wifi", "connexion", "internet", "réseau", "signal"],
    "noise": ["bruit", "noise", "musique", "voisins", "sonore", "calme"],
    "cleanliness": ["propre", "sale", "dirty", "clean", "ménage", "poussière", "cheveux", "tache"],
    "staff": ["personnel", "staff", "accueil", "réception", "service", "rude", "aimable", "poli"],
    "comfort": ["lit", "bed", "confort", "oreiller", "matelas"],
    "price": ["prix", "tarif", "cher", "expensive", "solde", "rapport"],
    "location": ["emplacement", "location", "centre", "vue", "plage", "métro"]
}

# Critical keywords that boost severity if sentiment is negative
CRITICAL_KEYWORDS = {"dirty", "sale", "rude", "agressif", "smell", "odeur", "punaises", "bedbugs", "vol", "thief", "payment", "débité"}

# --- BUSINESS LOGIC ---
def analyze_text(text: str):
    """
    Simule une inférence de modèle lourd + Post-processing contextuel.
    """
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity
    
    if polarity > 0.1: sentiment = "POSITIVE"
    elif polarity < -0.1: sentiment = "NEGATIVE"
    else: sentiment = "NEUTRAL"
    
    # Heuristic: Confidence = 1 - Subjectivity
    confidence = round(1.0 - subjectivity, 2)
    
    # Keyword Extraction (Base)
    raw_keywords = blob.noun_phrases
    if not raw_keywords:
        stop = {'the', 'and', 'was', 'for', 'that', 'with', 'les', 'des', 'une', 'pour', 'mais', 'pas', 'dans', 'très', 'est'}
        words = [w.lower() for w in text.split() if w.lower() not in stop and len(w) > 3]
        keywords = list(set(words))[:5]
    else:
        keywords = list(set([w.lower() for w in raw_keywords if len(w)>3]))[:5]

    # --- 1️⃣ & 2️⃣ CONTEXT-AWARE TAGGING ---
    reason_tags = []
    positive_tags = []
    text_lower = text.lower()
    
    for category, terms in DOMAIN_LEXICON.items():
        # Check if any term of the category exists in the text
        if any(term in text_lower for term in terms):
            if polarity < -0.1: # Negative Context
                reason_tags.append(f"{category}_issue")
            elif polarity >= 0.1: # Positive Context
                positive_tags.append(f"good_{category}")
            # Neutral context ignored for tags to reduce noise

    # --- 4️⃣ SEVERITY SCORING (1-5) ---
    # Base severity on polarity magnitude (only for negative)
    severity = 1
    if sentiment == "NEGATIVE":
        abs_score = abs(polarity)
        if abs_score > 0.7: severity = 4
        elif abs_score > 0.4: severity = 3
        else: severity = 2
        
        # Boost if critical keywords present
        if any(crit in text_lower for crit in CRITICAL_KEYWORDS):
            severity = min(5, severity + 1)
    
    return {
        "score": round(polarity, 2),
        "confidence": confidence,
        "sentiment": sentiment,
        "keywords": keywords,
        "reason_tags": reason_tags,
        "positive_tags": positive_tags,
        "severity": severity
    }

# --- ENDPOINTS ---
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "api_version": VERSION,
        "model_version": MODEL_VERSION,
        "uptime_seconds": round(time.time() - START_TIME, 2)
    }

@app.post("/analyze", response_model=AnalysisResponse, responses={400: {"model": APIError}, 500: {"model": APIError}})
async def analyze_feedback(request: AnalysisRequest):
    start_time = time.time()
    
    try:
        # Inference
        result = analyze_text(request.text)
        
        # Calculate Latency
        latency = (time.time() - start_time) * 1000
        
        return {
            **result,
            "model_version": MODEL_VERSION,
            "api_version": VERSION,
            "latency_ms": round(latency, 2),
            "request_id": request.request_id
        }
    except Exception as e:
        # Standardized Error Response
        return JSONResponse(
            status_code=500,
            content={
                "error_code": "INTERNAL_ERROR", 
                "message": "Erreur lors de l'analyse", 
                "details": str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 InsightAI Engine v{VERSION} starting on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
