const http = require('http');

function get(path) {
    return new Promise((resolve) => {
        http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(JSON.parse(data)));
        });
    });
}

async function testFilters() {
    console.log("Testing Filters...");

    // 1. All
    const all = await get('/api/insights');
    console.log(`ALL: ${all.length} items`);

    // 2. Positive
    const pos = await get('/api/insights?sentiment=POSITIVE');
    console.log(`POSITIVE: ${pos.length} items`);
    const posErrors = pos.filter(i => i.sentiment !== 'POSITIVE');
    if (posErrors.length > 0) console.error("❌ Error: Negative items found in Positive filter");
    else console.log("✅ Positive Filter OK");

    // 3. Negative
    const neg = await get('/api/insights?sentiment=NEGATIVE');
    console.log(`NEGATIVE: ${neg.length} items`);
    const negErrors = neg.filter(i => i.sentiment !== 'NEGATIVE');
    if (negErrors.length > 0) console.error("❌ Error: Positive items found in Negative filter");
    else console.log("✅ Negative Filter OK");
}

testFilters();
