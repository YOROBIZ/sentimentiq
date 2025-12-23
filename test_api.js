const http = require('http');

console.log('--- Démarrage des Tests Automatisés InsightAI Pro ---\n');

function testEndpoint(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const status = res.statusCode;
                if (status >= 200 && status < 300) {
                    console.log(`✅ [${method}] ${path} - OK (${status})`);
                    // Check logic based on path
                    if (path === '/api/trends') {
                        try {
                            const json = JSON.parse(data);
                            console.log(`   -> Trends found: ${json.length}`);
                        } catch (e) { console.log('   -> Invalid JSON'); }
                    }
                    resolve(true);
                } else {
                    console.log(`❌ [${method}] ${path} - FAILED (${status})`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`❌ [${method}] ${path} - Erreur Connexion: ${e.message}`);
            resolve(false);
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    // 1. Test GET Insights
    await testEndpoint('/api/insights');

    // 2. Test GET Trends
    await testEndpoint('/api/trends');

    // 3. Test GET Export
    await testEndpoint('/api/export');

    // 4. Test POST Analyse (Test d'intégration IA)
    const testFeedback = {
        customer_name: "TestBot",
        content: "Ceci est un test automatisé. Le service est excellent."
    };
    await testEndpoint('/api/analyze', 'POST', testFeedback);

    console.log('\n--- Fin des tests ---');
}

// Wait for server to be likely ready (if running via automation) or just run
setTimeout(runTests, 1000);
