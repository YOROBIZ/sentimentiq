# 🏗️ Frontend Architecture Audit (Vanilla JS)

## 1. Stack & Structure
*   **Framework**: Vanilla JavaScript (ES6+). Aucune dépendance externe (No React/Vue).
*   **CSS**: Vanilla CSS (`style.css`), pas de préprocesseur.
*   **Structure Fichiers**:
    *   `index.html`: Layout principal (Header + Main Container + Sidebar).
    *   `app.js`: Logique complète (Fetch, Event Listeners, DOM Manipulation).
    *   `style.css`: Styles Glassmorphism + Animations CSS.

## 2. Data Flow & Endpoints
Actuellement utilisé :
*   `GET /api/insights`: Récupère **tous** les feedbacks (filtrable par `?sentiment=`).
*   `GET /api/trends`: Récupère le Top 5 des mots-clés globaux (algorithme simple).
*   `POST /api/analyze`: Envoie un nouveau feedback pour analyse.

**⚠️ Manquant (Product Pack V2)** :
*   `GET /api/trends/history`: Pas encore branché (Graphique absent).
*   `GET /api/insights/keywords`: Pas encore branché (Pain Points non ciblés).
*   `GET /api/alerts`: Pas encore branché (Pas de notification de crise).

## 3. Rendering Logic
*   **Bubbles**: Générées via `createBubble(item)`.
    *   **Coloring**: Classes CSS `.pos`, `.neg`, `.neu` basées strictement sur `item.sentiment`.
    *   **Positioning**: Randomisé au chargement dans `#bubbles-layer`.
*   **Zoom**: Appliqué uniquement sur `<div id="bubbles-layer">` via `transform: scale()`. UI (Sidebar/Header) reste fixe.
*   **Tooltip**: `div#insight-tooltip` positionné en absolu au clic. Contenu dynamique via `showDetails()`.

## 3b. Physics Engine (Globule & Billiard Mode)
Le positionnement CSS `top/left` est remplacé par un moteur physique custom (`requestAnimationFrame`).
*   **State**: Chaque bulle a un état `{x, y, vx, vy, mass}`.
*   **Loop**:
    1.  Mise à jour positions (Velocity + Friction).
    2.  Détection Collisions (Murs + Bulles O(N²)).
    3.  Rendu via `transform: translate3d`.
*   **Interaction**: Drag & Throw implémenté via `PointerEvents`. On calcule l'impulsion de lancer basée sur les derniers mouvements du curseur.

## 4. Gap Analysis (V1 vs V2)

| Feature V2 | État Actuel | Action Requise |
| :--- | :--- | :--- |
| **Severity Score** | Absent | Modifier `showDetails` pour parser `item.severity` et afficher un badge (1-5). |
| **Context Context Tags** | Absent | Modifier `showDetails` pour afficher `reason_tags` (chips rouges) et `positive_tags` (chips vertes). |
| **Trends History** | Liste statique | Remplacer la liste par un mini-graphique ou stats 7j via `/api/trends/history`. |
| **Pain Points** | Absent | Ajouter une section "Alertes" dans la Sidebar appelant `/api/insights/keywords?sentiment=NEGATIVE`. |

## 5. Recommandations (Quick Wins)
1.  **Ne pas ajouter Chart.js** pour l'instant (lourd). Utiliser des barres de progression CSS simples pour l'historique 7j.
2.  **Tooltip Upgrade**: C'est le point d'info principal. Ajouter les tags ici a le plus d'impact visuel immédiat.
3.  **Sidebar "Pain Points"**: Remplacer la section "Nouvelle Analyse" (qui prend trop de place) ou l'optimiser pour afficher le Top 5 Pain Points.
