// core/roommanager.js

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // 🚨 NEW: ONE-CLICK GLOBAL MATCH (Koi ek click karega, sab join honge!)
    socket.on('startMatchmaking', (data) => {
        console.log(`🚨 GLOBAL MATCH INITIATED BY: ${data.uid || socket.id}`);

        // Ek naya aur common Room ID banega sabke liye
        const gameRoomId = 'GLOBAL_RACE_' + Math.floor(Math.random() * 999999);
        const hostUid = data.uid || socket.id; // Jisne click kiya wo Host banega
        
        let playerCount = 0;

        // Server par jitne bhi log zinda (connected) hain, sabko pakdo
        for (const [sId, playerObj] of connectedPlayers.entries()) {
            
            playerCount++;
            
            // Sabke phone (socket) par force-join ka signal bhejo
            io.to(sId).emit('matchFound', { 
                gameRoomId: gameRoomId, 
                hostUid: hostUid 
            });
            
            console.log(`➡️ Pushed ${playerObj.gameName || sId} into the Global Match!`);
        }

        console.log(`🔥 TOTAL ${playerCount} PLAYERS TELEPORTED TO MATCH: ${gameRoomId}`);
    });

    // ==========================================
    // (Aapka purana Party / Invite ka code neeche safe hai)
    socket.on('createPartyRoom', (data) => { /* ... */ });
    socket.on('sendPartyInvite', (data) => { /* ... */ });
    socket.on('acceptPartyInvite', (data) => { /* ... */ });
    socket.on('leavePartyRoom', (data) => { /* ... */ });
}
