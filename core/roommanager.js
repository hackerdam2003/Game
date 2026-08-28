// core/roomManager.js

// Global storage for active custom rooms
export const activeRooms = new Map(); 

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // 🛡️ 1. Create Private Team
    socket.on('createRoom', (data) => {
        activeRooms.set(data.roomCode, {
            code: data.roomCode,
            leaderId: socket.id,
            allowWorld: data.allowWorld,
            players: [socket.id]
        });

        const player = connectedPlayers.get(socket.id);
        if (player) {
            player.status = 'in-party';
            player.room = data.roomCode;
        }

        socket.join(data.roomCode); // Add to Socket.io room for team chat
        console.log(`🛡️ Room [${data.roomCode}] Created by Leader: ${socket.id} | Allow World: ${data.allowWorld}`);
    });

    // ⚙️ 2. Update Toggle (Leader changes World Player setting)
    socket.on('updateRoomSettings', (data) => {
        const room = activeRooms.get(data.room);
        if (room && room.leaderId === socket.id) {
            room.allowWorld = data.allowWorld;
            console.log(`⚙️ Room [${data.room}] Toggle Updated -> Allow World: ${data.allowWorld}`);
        }
    });

    // 🏁 3. Start Team Race
    socket.on('startTeamMatch', (data) => {
        const room = activeRooms.get(data.roomCode);
        
        if (room && room.leaderId === socket.id) {
            console.log(`🏁 Leader started match for Room: ${data.roomCode}`);
            
            // Get all players currently in this team
            const teamPlayers = Array.from(connectedPlayers.values()).filter(p => p.room === data.roomCode);
            
            if (room.allowWorld) {
                // THE AUTO-PULL TRIGGER:
                // Agar toggle ON hai, toh in doston ko 'searching' me daal do.
                // Humara matchmaker.js inko uthayega aur bache hue slots duniya se bhar dega!
                teamPlayers.forEach(p => {
                    p.status = 'searching';
                    p.searchStartTime = Date.now(); // Timer start for Phase fallback
                });
                console.log(`🌍 Team [${data.roomCode}] sent to Global Matchmaking!`);
            } else {
                // STRICTLY PRIVATE RACE:
                // Toggle OFF hai, toh duniya se koi nahi aayega. Seedha doston ke beech race start!
                const matchId = "RACE_" + data.roomCode;
                teamPlayers.forEach(p => {
                    p.status = 'in-match';
                    p.room = matchId;
                });
                
                // Signal bhej do race start karne ka
                io.to(data.roomCode).emit('matchFound', { matchId: matchId });
                console.log(`🔒 Private Race started for Room [${data.roomCode}]`);
            }
        }
    });
}
