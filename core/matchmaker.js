// core/matchmaker.js

/**
 * MATH FORMULA: Haversine Formula
 * Yeh 2 Lat/Long ke beech ka exact distance (Kilometers) nikalta hai.
 */
function getDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
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
 * THE ATOMIC 1:1 ENGINE (Master Logic)
 */
export function runMatchmaking(connectedPlayers, io) {
    // Sirf un logon ko filter karo jo Idle/Searching state me hain
    const searchingPlayers = Array.from(connectedPlayers.values()).filter(p => p.status === 'searching');
    
    if(searchingPlayers.length < 2) return;

    // Separate Boys and Girls for STRICT 1:1 RATIO
    const boys = searchingPlayers.filter(p => p.gender === 'Boy');
    const girls = searchingPlayers.filter(p => p.gender === 'Girl');

    for (let boy of boys) {
        if (boy.status !== 'searching') continue;

        let bestMatch = null;
        let bestScore = Infinity;
        const waitTime = Date.now() - boy.searchStartTime;

        for (let girl of girls) {
            if (girl.status !== 'searching') continue;

            const distance = getDistance(boy.location?.lat, boy.location?.lng, girl.location?.lat, girl.location?.lng);
            const ageDiff = Math.abs((boy.age || 20) - (girl.age || 20));

            // THE 3-PHASE FALLBACK SYSTEM
            if (waitTime < 5000) {
                // PHASE 1 (0-5s): Perfect Nearest Match (under 100km)
                if (distance < 100) {
                    const matchScore = distance + (ageDiff * 10);
                    if (matchScore < bestScore) {
                        bestScore = matchScore;
                        bestMatch = girl;
                    }
                }
            } 
            else if (waitTime < 10000) {
                // PHASE 2 (5-10s): Global Expand, Nearest Age Locked
                const matchScore = ageDiff; 
                if (matchScore < bestScore) {
                    bestScore = matchScore;
                    bestMatch = girl;
                }
            } 
            else {
                // PHASE 3 (10s+): Absolute Fallback (Any available match)
                bestMatch = girl;
                break; 
            }
        }

        // -----------------------------------------------------
        // THE ACTION: MATCH FOUND!
        // -----------------------------------------------------
        if (bestMatch) {
            // Uniform Room ID Format matches frontend expectations
            const matchId = "RU-" + Math.floor(1000 + Math.random() * 9000);
            
            // Status Lock
            boy.status = 'in-match';
            bestMatch.status = 'in-match';
            boy.room = matchId;
            bestMatch.room = matchId;

            console.log(`✅ MATCH CREATED: ${boy.name || boy.id} (Host) 🤝 ${bestMatch.name || bestMatch.id} (Client) -> [${matchId}] | Wait: ${waitTime}ms`);

            // 🛠️ FIX 1: Modern Socket.io Force Join Room
            io.in(boy.id).socketsJoin(matchId);
            io.in(bestMatch.id).socketsJoin(matchId);

            // 🛠️ FIX 2: Individual Emits with Role Assignment
            // Boy gets isHost = true (He gets the Start Race button)
            io.to(boy.id).emit('matchFound', { matchId: matchId, isHost: true });
            
            // Girl gets isHost = false (She waits for the Host to start)
            io.to(bestMatch.id).emit('matchFound', { matchId: matchId, isHost: false });
        }
    }
}

