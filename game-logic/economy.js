// game-logic/economy.js

// Backend Map for Trap Cooldowns
const trapCooldowns = new Map();

export function handleEconomyAndTraps(socket, io, connectedPlayers) {
    
    // 🪤 DROP TRAP EVENT (Costs 5 Coins)
    socket.on('dropTrap', async (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || player.status !== 'in-match') return;

        const now = Date.now();
        const lastTrap = trapCooldowns.get(socket.id) || 0;

        // 1. SPAM FILTER: 3 Second Cooldown on Traps
        if (now - lastTrap < 3000) {
            socket.emit('economyError', { message: "Trap on Cooldown!" });
            return;
        }

        console.log(`🛡️ Validating Trap for ${socket.id}...`);

        try {
            // YAHAN BACKEND FIREBASE CALL AAYEGA 
            // (Hum isko aage setup karenge "firebase-admin" library se)
            // Abhi ke liye hum assume kar rahe hain ki uske paas 5 coins hain:
            const hasEnoughCoins = true; // Replace with Real Firebase check

            if (hasEnoughCoins) {
                // Paise kaat liye
                console.log(`🪙 5 Coins deducted from ${socket.id} for dropping Kil.`);
                trapCooldowns.set(socket.id, now);

                // Game me sabko batao ki Kil gir chuki hai (Taaki baaki logon ki tyre panchar ho)
                io.to(player.room).emit('trapSpawned', {
                    x: data.x,
                    y: data.y,
                    owner: socket.id,
                    type: 'kil'
                });
                
                socket.emit('economySuccess', { message: "-5 🪙 Kil Dropped!" });
            } else {
                socket.emit('economyError', { message: "Not enough HFC Coins!" });
            }
        } catch (error) {
            console.error("Economy Database Error:", error);
        }
    });

    // 🏁 MATCH END REWARDS
    socket.on('matchFinished', async (data) => {
        // Agar yeh player jeeta hai
        if (data.isWinner) {
            console.log(`🏆 Player ${socket.id} WON! Adding 50 🪙 HFC Coins...`);
            // Firebase Admin SDK se seedha wallet me +50 coins add honge
        }
    });
}
