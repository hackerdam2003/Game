// core/matchmaker.js

/**
 * MATH FORMULA: Haversine Formula
 * Yeh 2 Lat/Long ke beech ka exact distance (Kilometers) nikalta hai.
 */
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999; // Agar location na ho toh max distance
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * THE ATOMIC 1:1 ENGINE (Aapka Master Logic)
 * Yeh function server.js me har 2 second me chalega.
 */
export function runMatchmaking(connectedPlayers, io) {
    // Sirf un logon ko filter karo jo Idle/Searching state me hain
    const searchingPlayers = Array.from(connectedPlayers.values()).filter(p => p.status === 'searching');
    
    // Agar 2 se kam log hain, toh match nahi ban sakta
    if(searchingPlayers.length < 2) return;

    // Separate Boys and Girls for STRICT 1:1 RATIO
    const boys = searchingPlayers.filter(p => p.gender === 'Boy');
    const girls = searchingPlayers.filter(p => p.gender === 'Girl');

    // Loop through Boys to find their exact Match
    for (let boy of boys) {
        if (boy.status !== 'searching') continue; // Agar iska match pehle ban gaya ho

        let bestMatch = null;
        let bestScore = Infinity;
        const waitTime = Date.now() - boy.searchStartTime; // Kitne time se wait kar raha hai

        for (let girl of girls) {
            if (girl.status !== 'searching') continue;

            const distance = getDistance(boy.location?.lat, boy.location?.lng, girl.location?.lat, girl.location?.lng);
            const ageDiff = Math.abs((boy.age || 20) - (girl.age || 20));

            // -----------------------------------------------------
            // THE 3-PHASE FALLBACK SYSTEM
            // -----------------------------------------------------
            if (waitTime < 5000) {
                // PHASE 1 (0-5s): Perfect Nearest Match (Distance matters heavily)
                // Filter: Location paas honi chahiye (e.g., under 100km)
                if (distance < 100) {
                    const matchScore = distance + (ageDiff * 10); // Age difference pe penalty
                    if (matchScore < bestScore) {
                        bestScore = matchScore;
                        bestMatch = girl;
                    }
                }
            } 
            else if (waitTime < 10000) {
                // PHASE 2 (5-10s): Global Expand, Nearest Age Locked
                // Filter: Location filter hata diya, sirf Age difference par dhyan denge
                const matchScore = ageDiff; 
                if (matchScore < bestScore) {
                    bestScore = matchScore;
                    bestMatch = girl;
                }
            } 
            else {
                // PHASE 3 (10s+): Absolute Fallback
                // Filter: Koi filter nahi. Jo pehli ladki khali mili, use utha lo. (Gender Ratio Locked)
                bestMatch = girl;
                break; 
            }
        }

        // -----------------------------------------------------
        // THE ACTION: MATCH FOUND!
        // -----------------------------------------------------
        if (bestMatch) {
            // Joda ban gaya (1 Boy + 1 Girl)
            const matchId = "RACE_" + Math.random().toString(36).substring(2,8);
            
            // Unka status lock kar do
            boy.status = 'in-match';
            bestMatch.status = 'in-match';
            boy.room = matchId;
            bestMatch.room = matchId;

            console.log(`✅ MATCH CREATED: ${boy.id} (Boy) 🤝 ${bestMatch.id} (Girl) -> [${matchId}] | WaitTime: ${waitTime}ms`);

            // Socket ko join karwao (Humein socket ID ke zariye IO command bhejna hai)
            io.sockets.sockets.get(boy.id)?.join(matchId);
            io.sockets.sockets.get(bestMatch.id)?.join(matchId);

            // Dono clients ko screen change karne ka signal bhejo
            io.to(matchId).emit('matchFound', { matchId: matchId });
        }
    }
}
