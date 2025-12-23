# 🐘 InsightAI Pro - Database V2 Design

Ce dossier contient la spécification de la couche de données pour la version "Production" de l'application.

## 📐 Architecture du Modèle

Nous avons choisi de **découpler** la donnée brute (Feedback) de son interprétation (Analysis).

### Key Decision: 1-to-N Relationship
> "Un avis client est immuable. Son analyse par une IA change avec le temps."

Au lieu d'ajouter des colonnes `sentiment` directement dans la table `feedbacks`, nous avons créé une table dédiée `analysis_results`.

**Pourquoi ?**
1.  **Model Versioning** : Nous pouvons stocker plusieurs analyses pour le même feedback (ex: Comparer `v1.0` vs `v2.0`).
2.  **Auditability** : On garde la trace de *quel* modèle a produit *quel* résultat.
3.  **Re-compute** : Si on change le moteur IA, on ne perd pas l'historique, on rajoute juste de nouvelles lignes.

## 📜 Schéma

### `feedbacks`
*   Source de vérité.
*   Contient le texte brut (`raw_content`) et les métadonnées (`hotel_id`, `source`).
*   **PK**: UUID v4.

### `analysis_results`
*   Résultat d'une inférence.
*   **FK**: `feedback_id`.
*   **Composite Unique Key**: `(feedback_id, model_provider, model_version)` -> Empêche les doublons d'analyse.
*   **Types Riches** : Utilisation de `ENUM` pour le sentiment et `TEXT[]` (Array) pour les mots-clés.

## 🚀 Quick Start (PSQL)

```bash
# 1. Créer la database
createdb insight_ai_v2

# 2. Appliquer le schéma
psql -d insight_ai_v2 -f schema.sql

# 3. Injecter les données de test
psql -d insight_ai_v2 -f seed.sql
```
