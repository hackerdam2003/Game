// js/traps.js

console.log("💣 [Traps] Weapons & Obstacles Module Loaded!");

// ==========================================
// 1. Initialize Traps System
// ==========================================
export function initializeTraps(scene, socket) {
    // Phaser group banayenge saare traps store karne ke liye
    scene.trapsGroup = scene.physics.add.group();

    if (socket) {
        // Jab server bataye ki kisi aur ne trap drop kiya hai
        socket.on('trapDropped', (data) => {
            // Khud ka drop kiya hua trap ignore karo (wo pehle hi render ho chuka hai)
            if (data.ownerId !== socket.id) {
                renderTrap(scene, data.x, data.y, data.trapId);
            }
        });
    }
}

// ==========================================
// 2. Setup Physics Collision
// ==========================================
export function setupTrapCollisions(scene, localPlayer) {
    // Agar local player kisi bhi trap se takraye, toh penalty trigger karo
    scene.physics.add.overlap(localPlayer, scene.trapsGroup, (player, trap) => {
        triggerTrapPenalty(player, trap, scene);
    });
}

// ==========================================
// 3. Drop Trap (Local Action via Button)
// ==========================================
export function dropTrapLocal(scene, socket, player) {
    // Gadi ke thoda pichhe trap spawn karna (Y coordinate me thoda add karenge kyunki gadi upar ja rahi hai)
    const trapX = player.x;
    const trapY = player.y + 80; 
    const trapId = 'trap_' + socket.id + '_' + Date.now();

    // Screen par turant render karo
    renderTrap(scene, trapX, trapY, trapId);

    // Server ko batao taaki sabko dikhe
    if (socket) {
        socket.emit('dropTrap', { x: trapX, y: trapY, trapId: trapId });
    }
    console.log("💣 Dropped a Trap!");
}

// ==========================================
// Helper: Render Trap on Canvas
// ==========================================
function renderTrap(scene, x, y, trapId) {
    // Placeholder for Kil/Spikes (A small black box for now)
    // Jab assets aayenge: scene.add.sprite(x, y, 'kil');
    const trap = scene.add.rectangle(x, y, 20, 20, 0x1e293b); 
    
    scene.physics.add.existing(trap);
    trap.body.setImmovable(true);
    trap.name = trapId; 
    
    // Add to group for collision detection
    scene.trapsGroup.add(trap);
}

// ==========================================
// Helper: The Penalty (Spin & Slow down)
// ==========================================
function triggerTrapPenalty(player, trap, scene) {
    // Trap ko screen se hata do taaki baar-baar hit na ho
    trap.destroy();

    console.warn("💥 BUSTED! You hit a trap!");

    // Global stun flag on karo (player.js isko read karega)
    window.isStunned = true; 

    // Visual Effect (Gadi laal hogi aur ghoomegi)
    player.setTint(0xef4444); 
    player.body.setVelocityY(0); // Forward speed 0
    player.body.setAngularVelocity(500); // Tezi se ghoomegi (Spin out)

    // 1.5 Second baad wapas normal kar do
    setTimeout(() => {
        window.isStunned = false;
        player.clearTint();
        player.setAngle(0); // Gadi wapas seedhi karo
        player.body.setAngularVelocity(0); // Ghoomna band
    }, 1500);
}
