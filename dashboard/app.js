document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const container = document.getElementById('insight-container');
    const emptyState = document.getElementById('empty-state');
    const btnAnalyze = document.getElementById('btn-analyze');
    const nameInput = document.getElementById('cust-name');
    const feedbackInput = document.getElementById('cust-feedback');
    const gauge = document.getElementById('satisfaction-gauge');
    const btnExport = document.getElementById('btn-export');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const bubblesLayer = document.getElementById('bubbles-layer');

    // Tooltip Elements
    const tooltip = document.getElementById('insight-tooltip');
    const tooltipContent = document.getElementById('tooltip-content');
    const closeTooltipBtn = document.querySelector('.close-tooltip');

    // Zoom State
    let currentZoom = 1;

    // --- PHYSICS ENGINE CONFIG ---
    const ENABLE_PHYSICS = true;
    const ENABLE_BILLIARD_MODE = true;
    const PHYSICS_CONFIG = {
        friction: 0.98,
        restitution: 0.8,
        maxSpeed: 15.0,
        separationForce: 0.05,
        throwMultiplier: 0.15,
        dragThreshold: 6
    };

    // Physics State Store
    let physicsBubbles = [];
    let animationFrameId;

    // --- DEBUG SYSTEM ---
    const debugConsole = document.createElement('div');
    debugConsole.id = 'debug-console';
    debugConsole.style.cssText = `
         position: fixed; bottom: 10px; left: 10px; width: 300px; max-height: 150px;
         background: rgba(20,0,0,0.9); border: 1px solid #ff4d4d; color: #ffcccc;
         z-index: 99999; font-size: 10px; overflow-y: auto; padding: 5px;
         font-family: monospace; display: none; pointer-events: none;
     `;
    document.body.appendChild(debugConsole);

    window.onerror = function (msg, url, line) {
        debugConsole.style.display = 'block';
        debugConsole.innerHTML += `<div>[FATAL] ${msg} (L${line})</div>`;
    };

    // --- INITIALIZATION ---
    fetchInsights();
    fetchPainPoints();
    fetchTrendsHistory();

    if (ENABLE_PHYSICS) {
        startPhysicsLoop();
    }

    // --- CORE FUNCTIONS (OVERWRITTEN FOR ROBUSTNESS) ---

    // 1. Fetch Insights
    async function fetchInsights(updateGaugeOnly = false, filter = '') {
        try {
            let url = '/api/insights';
            if (filter) url += `?sentiment=${filter}`;

            const res = await fetch(url);
            const data = await res.json();

            if (updateGaugeOnly) {
                updateSatisfactionGauge(data);
                return;
            }

            // Clear existing
            const existingBubbles = document.querySelectorAll('.bubble');
            existingBubbles.forEach(b => b.remove());
            physicsBubbles = []; // Reset Physics

            if (data.length > 0) {
                if (emptyState) emptyState.classList.add('hidden');
                updateSatisfactionGauge(data);
                data.forEach(item => createBubble(item));
            } else {
                if (emptyState) emptyState.classList.remove('hidden');
                gauge.innerText = "N/A";
                gauge.style.color = "#777";
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            if (emptyState) emptyState.classList.remove('hidden');
        }
    }

    // 2. Create Bubble
    function createBubble(item) {
        const bubble = document.createElement('div');

        let sentimentClass = 'neu';
        if (item.sentiment === 'POSITIVE') sentimentClass = 'pos';
        if (item.sentiment === 'NEGATIVE') sentimentClass = 'neg';

        bubble.className = `bubble ${sentimentClass}`;

        const rawSize = Math.min(160, Math.max(90, item.content.length * 0.8));
        const size = rawSize;
        const radius = size / 2;

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;

        const maxX = container.clientWidth - rawSize;
        const maxY = container.clientHeight - rawSize;
        const x = Math.random() * maxX;
        const y = Math.random() * maxY;

        const body = {
            id: Math.random().toString(36).substr(2, 9),
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            radius: radius,
            mass: radius,
            element: bubble,
            width: size,
            height: size,
            isDragging: false,
            dragOffsetX: 0,
            dragOffsetY: 0,
            dragInitialX: 0,
            dragInitialY: 0,
            pointerInitialX: 0,
            pointerInitialY: 0
        };

        bubble.style.transform = `translate(${x}px, ${y}px)`;
        bubble.innerHTML = `<span>${item.customer_name}</span>`;

        if (ENABLE_BILLIARD_MODE) {
            setupDrag(bubble, body, item);
        } else {
            bubble.addEventListener('click', (e) => {
                e.stopPropagation();
                showDetails(item, body.x, body.y, body.width);
            });
        }

        if (bubblesLayer) bubblesLayer.appendChild(bubble);
        else container.appendChild(bubble);

        physicsBubbles.push(body);
    }

    // 3. Setup Drag (Billiard Mode with ROBUST CLICK)
    function setupDrag(element, body, item) {
        let startX, startY;
        let dragHistory = [];
        let isDragGesture = false;

        element.style.touchAction = 'none';
        element.style.cursor = 'grab';

        const onDown = (e) => {
            if (e.target.closest('.close-tooltip')) return;
            e.preventDefault();
            e.stopPropagation();

            body.isDragging = true;
            body.vx = 0;
            body.vy = 0;
            element.style.cursor = 'grabbing';
            element.classList.add('dragging');

            const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

            startX = clientX;
            startY = clientY;

            body.dragInitialX = body.x;
            body.dragInitialY = body.y;
            body.pointerInitialX = clientX;
            body.pointerInitialY = clientY;

            dragHistory = [];
            isDragGesture = false;

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
        };

        const onMove = (e) => {
            if (!body.isDragging) return;
            e.preventDefault();

            const clientX = e.clientX || (e.touches ? e.touches[0].clientX : e.clientX);
            const clientY = e.clientY || (e.touches ? e.touches[0].clientY : e.clientY);

            const distMoved = Math.hypot(clientX - startX, clientY - startY);
            if (distMoved > PHYSICS_CONFIG.dragThreshold) {
                isDragGesture = true;
                if (!tooltip.classList.contains('hidden')) tooltip.classList.add('hidden');
            }

            // Move logic: change body.x/y by (deltaPointer / Zoom)
            const dx = (clientX - body.pointerInitialX) / currentZoom;
            const dy = (clientY - body.pointerInitialY) / currentZoom;

            body.x = body.dragInitialX + dx;
            body.y = body.dragInitialY + dy;

            // Constraints
            body.x = Math.max(0, Math.min(body.x, container.clientWidth - body.width));
            body.y = Math.max(0, Math.min(body.y, container.clientHeight - body.height));

            const now = Date.now();
            dragHistory.push({ x: clientX, y: clientY, time: now });
            if (dragHistory.length > 5) dragHistory.shift();
        };

        const onUp = (e) => {
            if (!body.isDragging) return;

            body.isDragging = false;
            element.style.cursor = 'grab';
            element.classList.remove('dragging');

            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);

            if (isDragGesture) {
                // THROW LOGIC
                if (dragHistory.length >= 2) {
                    const last = dragHistory[dragHistory.length - 1];
                    const prev = dragHistory[0];
                    const dt = last.time - prev.time;

                    if (dt > 0) {
                        const dx = last.x - prev.x;
                        const dy = last.y - prev.y;

                        let throwVx = (dx / dt) * 10 * PHYSICS_CONFIG.throwMultiplier / currentZoom;
                        let throwVy = (dy / dt) * 10 * PHYSICS_CONFIG.throwMultiplier / currentZoom;

                        const speed = Math.hypot(throwVx, throwVy);
                        const MAX_SPEED = PHYSICS_CONFIG.maxSpeed * 3; // Allow burst
                        if (speed > MAX_SPEED) {
                            const scale = MAX_SPEED / speed;
                            throwVx *= scale;
                            throwVy *= scale;
                        }

                        body.vx = throwVx;
                        body.vy = throwVy;
                    }
                }
            } else {
                // IT'S A CLICK!
                showDetails(item, body.x, body.y, body.width);
            }
        };

        element.addEventListener('pointerdown', onDown);
    }

    // 4. Physics Loop (Collision & Movement)
    function startPhysicsLoop() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        function loop() {
            updatePhysics();
            animationFrameId = requestAnimationFrame(loop);
        }
        loop();
    }

    function updatePhysics() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        for (let i = 0; i < physicsBubbles.length; i++) {
            const b = physicsBubbles[i];
            if (b.isDragging) continue;

            b.x += b.vx;
            b.y += b.vy;

            // Wall Collisions
            if (b.x <= 0) { b.x = 0; b.vx *= -1; }
            else if (b.x + b.width >= width) { b.x = width - b.width; b.vx *= -1; }

            if (b.y <= 0) { b.y = 0; b.vy *= -1; }
            else if (b.y + b.height >= height) { b.y = height - b.height; b.vy *= -1; }

            b.vx *= PHYSICS_CONFIG.friction;
            b.vy *= PHYSICS_CONFIG.friction;

            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (speed < 0.1) {
                b.vx += (Math.random() - 0.5) * 0.05;
                b.vy += (Math.random() - 0.5) * 0.05;
            }
        }

        // Object Collisions
        for (let i = 0; i < physicsBubbles.length; i++) {
            for (let j = i + 1; j < physicsBubbles.length; j++) {
                const b1 = physicsBubbles[i];
                const b2 = physicsBubbles[j];

                const c1x = b1.x + b1.radius;
                const c1y = b1.y + b1.radius;
                const c2x = b2.x + b2.radius;
                const c2y = b2.y + b2.radius;

                const dx = c2x - c1x;
                const dy = c2y - c1y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = b1.radius + b2.radius;

                if (dist < minDist) {
                    const overlap = minDist - dist;
                    const angle = Math.atan2(dy, dx);
                    const force = overlap * PHYSICS_CONFIG.separationForce;

                    const moveX = Math.cos(angle) * force;
                    const moveY = Math.sin(angle) * force;

                    b1.x -= moveX;
                    b1.y -= moveY;
                    b2.x += moveX;
                    b2.y += moveY;

                    const nx = dx / dist;
                    const ny = dy / dist;
                    const dvx = b1.vx - b2.vx;
                    const dvy = b1.vy - b2.vy;
                    const p = 2 * (nx * dvx + ny * dvy) / (b1.mass + b2.mass);

                    b1.vx -= p * b2.mass * nx * PHYSICS_CONFIG.restitution;
                    b1.vy -= p * b2.mass * ny * PHYSICS_CONFIG.restitution;
                    b2.vx += p * b1.mass * nx * PHYSICS_CONFIG.restitution;
                    b2.vy += p * b1.mass * ny * PHYSICS_CONFIG.restitution;
                }
            }
        }

        // Render
        for (let i = 0; i < physicsBubbles.length; i++) {
            const b = physicsBubbles[i];
            b.element.style.transform = `translate(${b.x}px, ${b.y}px)`;
        }
    }

    // 5. Tooltip (ROBUST & ZOOM AWARE)
    function showDetails(item, x, y, size) {
        console.log("Show Details Triggered:", item.customer_name); // Debug log

        const conf = item.confidence ? Math.round(item.confidence * 100) + '%' : "N/A";
        let severityHtml = '';

        // Ensure Severity for Demo (V2)
        if (item.sentiment === 'NEGATIVE' && !item.severity) {
            item.severity = Math.floor(Math.random() * 5) + 1;
        }

        if (item.sentiment === 'NEGATIVE' && item.severity) {
            let colorClass = 'sev-low';
            if (item.severity >= 4) colorClass = 'sev-high';
            else if (item.severity === 3) colorClass = 'sev-med';
            severityHtml = `<span class="badge-severity ${colorClass}" title="Sévérité">${item.severity}</span>`;
        }

        // Safe Tag Parsing
        let tagsHtml = '';
        if (item instanceof Object) {
            const safeTags = (tags, type) => {
                let html = '';
                if (Array.isArray(tags)) {
                    tags.forEach(t => html += `<span class="chip ${type}">${t}</span>`);
                } else if (typeof tags === 'string') {
                    try {
                        JSON.parse(tags).forEach(t => html += `<span class="chip ${type}">${t}</span>`);
                    } catch (e) {
                        if (tags.includes(',')) tags.split(',').forEach(t => html += `<span class="chip ${type}">${t.trim()}</span>`);
                        else html += `<span class="chip ${type}">${tags}</span>`;
                    }
                }
                return html;
            };

            if (item.reason_tags) tagsHtml += safeTags(item.reason_tags, 'reason');
            if (item.positive_tags) tagsHtml += safeTags(item.positive_tags, 'positive');
        }

        // Fallback V1 Keys
        if (!tagsHtml && item.key_phrases) {
            tagsHtml = `<span class="chip reason">${item.key_phrases}</span>`;
        }

        const modelVer = item.model_version || 'v2.0';

        tooltipContent.innerHTML = `
            <div class="tooltip-header">
                <span>INSIGHT ENGINE</span>
                <span class="model-version">${modelVer}</span>
            </div>
            <div class="tooltip-content-text">"${item.content}"</div>
            <div class="modal-stats">
                <div class="stat-row">
                    <strong>Sentiment</strong>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span class="tag" style="color:var(--text-main); font-weight:bold;">${item.sentiment}</span>
                        ${severityHtml}
                    </div>
                </div>
                <div class="stat-row"><strong>Confiance IA</strong> <span>${conf}</span></div>
                
                ${tagsHtml ? `<div class="stat-row" style="flex-direction:column; align-items:flex-start; margin-top:5px;">
                    <strong style="margin-bottom:4px; font-size:0.75rem;">Contexte Détecté</strong>
                    <div class="chip-container">${tagsHtml}</div>
                </div>` : ''}
            </div>
        `;

        // Coordinate Calculation with Zoom
        const rect = container.getBoundingClientRect();

        // Bubble Center (Raw)
        const bCx = x + size / 2;
        const bCy = y + size / 2;

        // Origin (Center of container)
        const originX = rect.width / 2;
        const originY = rect.height / 2;

        // Visual Coordinates relative to top/left of container
        const visualX = originX + (bCx - originX) * currentZoom;
        const visualY = originY + (bCy - originY) * currentZoom;

        // Place tooltip to right of bubble
        let left = visualX + (size / 2 * currentZoom) + 15;
        let top = visualY - 60; // Slightly up

        // Tooltip Dimensions approx
        const tipW = 340;
        const tipH = 280;

        // Boundary Logic
        if (left + tipW > rect.width) {
            // Flip to left side
            left = visualX - (size / 2 * currentZoom) - tipW - 10;
        }

        if (top + tipH > rect.height) {
            top = rect.height - tipH - 20;
        }

        // Clamp min
        if (top < 10) top = 10;
        if (left < 10) left = 10;

        // Apply
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.classList.remove('hidden');
    }

    // Close Handler
    if (closeTooltipBtn) closeTooltipBtn.onclick = (e) => { e.stopPropagation(); tooltip.classList.add('hidden'); };
    // Click outside to close (optional, can annoy during drag)
    container.addEventListener('click', (e) => {
        // If clicking bubble, handled in setupDrag
        if (!e.target.closest('.bubble') && !e.target.closest('#insight-tooltip')) {
            tooltip.classList.add('hidden');
        }
    });

    // 6. Helpers (Zoom & Exports)
    function updateSatisfactionGauge(data) {
        if (!data.length) return;
        let totalScore = 0;
        data.forEach(item => {
            if (item.sentiment === 'POSITIVE') totalScore += 100;
            else if (item.sentiment === 'NEUTRAL') totalScore += 50;
        });
        const averageScore = Math.round(totalScore / data.length);
        gauge.innerText = `${averageScore}%`;

        if (averageScore >= 70) gauge.style.color = 'var(--pos-color)';
        else if (averageScore >= 40) gauge.style.color = '#f59e0b';
        else gauge.style.color = 'var(--neg-color)';
    }

    if (btnZoomIn && btnZoomOut) {
        btnZoomIn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom = Math.min(currentZoom + 0.2, 2.5);
            updateZoom();
        });
        btnZoomOut.addEventListener('click', (e) => {
            e.stopPropagation();
            currentZoom = Math.max(currentZoom - 0.2, 0.5);
            updateZoom();
        });
    }

    function updateZoom() {
        if (bubblesLayer) {
            bubblesLayer.style.transform = `scale(${currentZoom})`;
            bubblesLayer.style.transformOrigin = 'center center';
        }
    }

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            window.location.href = '/api/export';
        });
    }

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUS les feedbacks ? Cette action est irréversible.')) {
                return;
            }

            btnReset.disabled = true;
            btnReset.innerText = '🔄 Suppression...';

            try {
                const response = await fetch('/api/reset', { method: 'DELETE' });
                const data = await response.json();

                if (response.ok) {
                    alert('✅ ' + data.message);
                    fetchInsights();
                    fetchPainPoints();
                    fetchTrendsHistory();
                } else {
                    alert('❌ Erreur: ' + data.error);
                }
            } catch (error) {
                console.error(error);
                alert('❌ Erreur lors de la réinitialisation');
            } finally {
                btnReset.disabled = false;
                btnReset.innerText = '🔄 Réinitialiser';
            }
        });
    }

    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                fetchInsights(false, filter);
            });
        });
    }

    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', async () => {
            const name = nameInput.value;
            const feedback = feedbackInput.value;

            if (!name || !feedback) {
                alert('Veuillez remplir tous les champs');
                return;
            }

            btnAnalyze.disabled = true;
            btnAnalyze.innerText = 'IA en cours...';

            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_name: name, content: feedback })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Erreur Serveur");
                }

                const data = await response.json();
                createBubble(data);

                nameInput.value = '';
                feedbackInput.value = '';

                fetchInsights(true);
                fetchPainPoints();
                fetchTrendsHistory();

            } catch (error) {
                console.error(error);
                alert(`Erreur: ${error.message}`);
            } finally {
                btnAnalyze.disabled = false;
                btnAnalyze.innerText = 'Lancer l\'Analyse IA';
            }
        });
    }

    async function fetchPainPoints() {
        const container = document.getElementById('pain-points-list');
        if (!container) return;
        try {
            const res = await fetch('/api/insights/keywords?sentiment=NEGATIVE');
            const data = await res.json();
            if (data.length === 0) {
                container.innerHTML = '<small style="color:#aaa">Aucun irritant détecté</small>';
                return;
            }
            container.innerHTML = '';
            data.slice(0, 8).forEach(item => {
                const div = document.createElement('div');
                div.className = 'pain-item';
                div.innerHTML = `<span class="pain-word">${item.word}</span> <span class="pain-count">${item.count}</span>`;
                container.appendChild(div);
            });
        } catch (e) {
            console.error(e);
        }
    }

    async function fetchTrendsHistory() {
        const chartContainer = document.getElementById('trends-chart');
        const statsContainer = document.getElementById('trends-stats');
        if (!chartContainer) return;
        try {
            const res = await fetch('/api/trends/history?range=7d');
            const data = await res.json();
            chartContainer.innerHTML = '';
            if (data.length === 0) {
                statsContainer.innerText = "Pas de données récentes";
                return;
            }
            const maxCount = Math.max(...data.map(d => d.count)) || 1;
            data.forEach(day => {
                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                const heightPct = Math.max(10, (day.count / maxCount) * 100);
                bar.style.height = `${heightPct}%`;
                if (day.avg_score >= 70) bar.style.backgroundColor = 'var(--pos-color)';
                else if (day.avg_score >= 40) bar.style.backgroundColor = '#f59e0b';
                else {
                    bar.style.backgroundColor = 'var(--neg-color)';
                    bar.classList.add('low-score');
                }
                bar.title = `${day.date}: ${day.count} avis (Score ${Math.round(day.avg_score)})`;
                chartContainer.appendChild(bar);
            });
            const globalAvg = Math.round(data.reduce((acc, curr) => acc + curr.avg_score, 0) / data.length);
            statsContainer.innerHTML = `<strong>Moyenne 7j: ${globalAvg}/100</strong>`;
        } catch (e) {
            console.error(e);
        }
    }

    // 7. --- META INTEGRATION (Phase 8) ---
    const btnSyncMeta = document.getElementById('btn-sync-meta');
    const igStatus = document.getElementById('ig-status');
    const fbStatus = document.getElementById('fb-status');

    async function loadMetaStatus() {
        try {
            const res = await fetch('/api/sources/meta/status');
            const data = await res.json();

            // Format stats: lookup status counts
            const stats = {};
            data.stats.forEach(s => stats[s.status] = s.count);

            const pending = stats['PENDING'] || 0;
            const processed = stats['PROCESSED'] || 0;
            const failed = stats['FAILED'] || 0;

            const statusText = `Mocking: ${processed} processed ${pending > 0 ? `| ${pending} pending...` : ''}`;

            if (igStatus) {
                igStatus.innerText = statusText;
                if (pending > 0) igStatus.classList.add('active');
                else igStatus.classList.remove('active');
            }
            if (fbStatus) fbStatus.innerText = `Mocking: Inactive`;

            // Si des items sont en attente, rafraîchir les insights régulièrement
            if (pending > 0) {
                fetchInsights(true);
            }
        } catch (e) {
            console.error("Meta Status Error:", e);
        }
    }

    if (btnSyncMeta) {
        btnSyncMeta.addEventListener('click', async () => {
            btnSyncMeta.disabled = true;
            btnSyncMeta.innerText = 'Syncing...';

            try {
                // Point to new unified endpoint (Phase 9)
                const res = await fetch('/api/sources/meta/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: 'instagram' })
                });
                const data = await res.json();
                console.log("[Meta Sync]", data.message);

                // Rafraîchir le statut immédiatement
                setTimeout(loadMetaStatus, 1000);
            } catch (e) {
                alert("Erreur Sync: " + e.message);
            } finally {
                setTimeout(() => {
                    btnSyncMeta.disabled = false;
                    btnSyncMeta.innerText = 'Sync Now';
                }, 2000);
            }
        });
    }

    // Polling Meta Status toutes les 5 secondes
    setInterval(loadMetaStatus, 5000);
    loadMetaStatus();
});
