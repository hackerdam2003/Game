// js/network.js

console.log("📡 [Network] Module initialized!");

/**
 * Listeners setup for the live race
 * @param {Object} scene - Phaser Scene reference
 * @param {Object} socket - Socket.io instance
 * @param {Object} localPlayer - Phaser Sprite/Rect for local player
 * @param {Object} otherPlayers - Dictionary tracking opponents
 */
export function initializeRaceNetwork(scene, socket, localPlayer, otherPlayers) {
    if (!socket) {
        console.error("❌ [Network] Socket not found!");
        return;
    }

    // 1. Race Start Signal from Host/Server
    socket.on('gameStarting', () => {
        console.log("🏁 [Network] Server says GO!");
        window.isRaceActive = true; // Enables the update() loop in engine.js
        
        // Hide waiting UI and show controls
        const waitingOverlay = document.getElementById('waiting-overlay');
        const drivingControls = document.getElementById('driving-controls');
        
        if (waitingOverlay) waitingOverlay.style.display = "none";
        if (drivingControls) drivingControls.style.display = "flex";
    });

    // 2. Opponent Movement Sync
    socket.on('updatePlayerPosition', (data) => {
        if (data.playerId === socket.id) return; // Don't sync with yourself
        
        if (otherPlayers[data.playerId]) {
            // Update existing opponent's position
            otherPlayers[data.playerId].setPosition(data.position.x, data.position.y);
        } else {
            // Spawn new opponent dynamically (Placeholder Red Box)
            console.log(`🏎️ [Network] New opponent spawned: ${data.playerId}`);
            const newOpponent = scene.add.rectangle(data.position.x, data.position.y, 40, 70, 0xef4444);
            scene.physics.add.existing(newOpponent);
            otherPlayers[data.playerId] = newOpponent;
        }
    });

    // 3. Anti-Cheat Rubber-banding (From core/antiCheat.js)
    socket.on('forceTeleport', (safePosition) => {
        console.warn("🚨 [Network Anti-Cheat] Server detected invalid speed. Correcting position!");
        localPlayer.setPosition(safePosition.x, safePosition.y);
    });

    // 4. Opponent Disconnects or Leaves Match
    socket.on('playerLeft', (playerId) => {
        if (otherPlayers[playerId]) {
            console.log(`👋 [Network] Opponent disconnected: ${playerId}`);
            otherPlayers[playerId].destroy(); // Remove car from screen
            delete otherPlayers[playerId];
        }
    });
}

/**
 * Emit local player's position to the server
 */
export function emitMovement(socket, x, y) {
    if (!socket) return;
    socket.emit('playerMove', { x: x, y: y });
}
