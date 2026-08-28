// game-logic/physicsSync.js

export function handlePhysicsSync(socket, io, connectedPlayers) {
    socket.on('syncPosition', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.room) {
            socket.to(player.room).emit('updatePhysics', {
                id: socket.id,
                position: data.position,
                velocity: data.velocity,
                rotation: data.rotation,
                timestamp: Date.now()
            });
        }
    });
}
