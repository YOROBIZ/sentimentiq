# ✅ Checklist Frontend Product Pack

Cette checklist guide l'intégration des fonctionnalités V2 dans l'interface Vanilla JS existante.

## 1. Tooltip Enrichie (Priorité 1)
- [ ] Modifier `showDetails(item)` dans `app.js`.
- [ ] Afficher Badge Sévérité (si `severity > 3` -> Rouge vif).
- [ ] Afficher Chips `reason_tags` (Rouge) et `positive_tags` (Vert).
- [ ] Fallback élégant si les tags sont vides (Backward Compatibility).

## 2. Sidebar "Pain Points" (Priorité 2)
- [ ] Créer une fonction `fetchPainPoints()`.
- [ ] Appeler `GET /api/insights/keywords?sentiment=NEGATIVE`.
- [ ] Créer un conteneur HTML `<div id="pain-points-list">` dans la sidebar.
- [ ] Rendre la liste : Terme + Count (ex: "Wifi (12)").

## 3. Sidebar "Alerts" (Priorité 3)
- [ ] Créer une fonction `checkAlerts()`.
- [ ] Appeler `GET /api/alerts?threshold=40`.
- [ ] Si `data.length > 0`, afficher un bandeau/badge "Warning" dans le header ou la sidebar.

## 4. Historique Trends (Bonus)
- [ ] Modifier `fetchTrends()` pour utiliser `/api/trends/history` SI le switch "7 Jours" est activé (bouton à créer).
- [ ] Afficher simple Sparkline CSS ou liste enrichie (+/- évolution).
