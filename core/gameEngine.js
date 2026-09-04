// core/gameEngine.js
console.log("🎮 Dedicated Game Engine Initialized");

const worldPlayers = new Map();

export function handleGameWorld(io) {
    // '/world' pipeline (Bilkul alag server ki tarah kaam karega)
    const worldNamespace = io.of('/world');

    worldNamespace.on('connection', (socket) => {
        
        socket.on('join-world', (data) => {
            socket.join(data.gameRoomId);
            
            // Player ka Open World Data
            worldPlayers.set(socket.id, {
                uid: data.uid,
                name: data.name,
                room: data.gameRoomId,
                x: 0, // Center of map
                y: 0,
                action: 'idle'
            });

            console.log(`🌍 Player Joined World: ${data.name}`);

            // Naye player ko uske room ke baaki players ki details bhejo
            const roomData = [];
            for (const [sId, p] of worldPlayers.entries()) {
                if (p.room === data.gameRoomId) roomData.push(p);
            }
            worldNamespace.to(data.gameRoomId).emit('world-state', roomData);
        });

        // 🚀 LIVE MOVEMENT ENGINE
        socket.on('move', (data) => {
            const player = worldPlayers.get(socket.id);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.action = 'run';
                
                // Baaki sabko live location bhejo (Bina kisi delay ke)
                socket.to(player.room).emit('player-moved', { 
                    uid: player.uid, x: player.x, y: player.y, action: 'run' 
                });
            }
        });

        // ⚔️ ACTION ENGINE (Jump, Attack, Skill)
        socket.on('action', (data) => {
            const player = worldPlayers.get(socket.id);
            if (player) {
                socket.to(player.room).emit('player-action', { 
                    uid: player.uid, action: data.action 
                });
            }
        });

        socket.on('disconnect', () => {
            const player = worldPlayers.get(socket.id);
            if (player) {
                worldNamespace.to(player.room).emit('player-left', { uid: player.uid });
                worldPlayers.delete(socket.id);
            }
        });
    });
}

