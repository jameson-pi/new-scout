const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: { 'X-TBA-Auth-Key': process.env.NEXT_PUBLIC_TBA_API_KEY || '' }
        }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                console.log(`${url} -> ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data)); } catch(e) { resolve([]); }
                } else { resolve([]); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

(async () => {
    const teams2026cle = await get('https://www.thebluealliance.com/api/v3/event/2026txcle/teams/simple');
    console.log('2026txcle teams count:', Array.isArray(teams2026cle) ? teams2026cle.length : teams2026cle);
    if (Array.isArray(teams2026cle) && teams2026cle.length > 0) {
        console.log('Sample:', JSON.stringify(teams2026cle.slice(0,3)));
    }

    const teams2026man = await get('https://www.thebluealliance.com/api/v3/event/2026txman/teams/simple');
    console.log('2026txman teams count:', Array.isArray(teams2026man) ? teams2026man.length : teams2026man);

    process.exit(0);
})();

