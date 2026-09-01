// core/roomManager.js

// Global storage for active custom rooms
export const activeRooms = new Map(); 

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // 🛡️ 1. Create Private Team
    socket.on('createRoom', (data) => {
        activeRooms.set(data.roomCode, {
            code: data.roomCode,
            leaderId: socket.id,
            allowWorld: data.allowWorld || false,
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

    // 🤝 2. Join Private Team (Naya Event doston ke liye)
    socket.on('joinRoom', (data) => {
        const room = activeRooms.get(data.roomCode);
        if (room) {
            // Max 4 players limit (Aap isko badha sakte hain)
            if (room.players.length >= 4) {
                socket.emit('roomError', { message: "Room is currently full!" });
                return;
            }

            room.players.push(socket.id);
            const player = connectedPlayers.get(socket.id);
            if (player) {
                player.status = 'in-party';
                player.room = data.roomCode;
            }

            socket.join(data.roomCode);
            console.log(`🤝 Player ${socket.id} joined Room [${data.roomCode}]`);
            
            // Sabko batao ki naya dost party me aagaya
            io.to(data.roomCode).emit('playerJoinedRoom', { 
                playerId: socket.id, 
                playerCount: room.players.length 
            });
        } else {
            socket.emit('roomError', { message: "Party not found or closed!" });
        }
    });

    // ⚙️ 3. Update Toggle (Leader changes World Player setting)
    socket.on('updateRoomSettings', (data) => {
        const room = activeRooms.get(data.room);
        if (room && room.leaderId === socket.id) {
            room.allowWorld = data.allowWorld;
            console.log(`⚙️ Room [${data.room}] Toggle Updated -> Allow World: ${data.allowWorld}`);
        }
    });

    // 🏁 4. Start Team Race
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
                const matchId = "RU-" + Math.floor(1000 + Math.random() * 9000); // Standardize ID formatting
                
                teamPlayers.forEach(p => {
                    p.status = 'in-match';
                    p.room = matchId;
                    
                    // Force join naye game room me
                    io.in(p.id).socketsJoin(matchId);

                    // 🛠️ THE FIX: Server bata raha hai ki Host kon hai aur Client kon
                    const isLeader = (p.id === room.leaderId);
                    io.to(p.id).emit('matchFound', { 
                        matchId: matchId, 
                        isHost: isLeader // Leader ko Host power, baaki doston ko sirf wait permission
                    });
                });
                
                console.log(`🔒 Private Race started for Room [${data.roomCode}]`);
            }
        }
    });
}
