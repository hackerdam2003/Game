// game-logic/physicsSync.js
import { validateMovement } from './antiCheat.js';

export function handlePhysicsSync(socket, io, connectedPlayers) {
    socket.on('syncPosition', (data) => {
        const player = connectedPlayers.get(socket.id);
        
        if (player && player.room) {
            // 🛡️ THE GATEKEEPER CHECK: Pehle movement verify karo
            const isValid = validateMovement(player, data.position);

            if (isValid) {
                // Agar movement legal hai, tabhi room ke baaki players ko bhejo
                socket.to(player.room).emit('updatePhysics', {
                    id: socket.id,
                    position: data.position,
                    velocity: data.velocity,
                    rotation: data.rotation,
                    timestamp: Date.now()
                });
            } else {
                // 🚨 HACKER DETECTED: Illegal movement roko aur wapas pichhe phek do
                socket.emit('forceTeleport', player.lastPosition);
            }
        }
    });
}
