// game-logic/antiCheat.js

// 🚨 SERVER-SIDE ANTI-CHEAT
// Updated to match the combined vector speeds (Forward + Steering) from vehicle.js
const MAX_SPEEDS = {
    'Padal': 250,  // (150 fwd + 200 steer ka diagonal calculation)
    'Bike': 600,   // (350 fwd + 450 steer)
    'Car': 600     // (500 fwd + 250 steer)
};

export function validateMovement(player, newPosition) {
    const now = Date.now();
    
    // Naya player hai, pehli movement hai
    if (!player.lastPosition) {
        player.lastPosition = newPosition;
        player.lastMoveTime = now;
        return true; 
    }

    // Time gap aur distance calculate karo (in seconds)
    const timeDelta = (now - player.lastMoveTime) / 1000; 
    
    // Lag spike protection: Agar client ne ekdum se 2 packets ek sath bhej diye (0 second gap)
    if (timeDelta <= 0) return true;

    const dx = newPosition.x - player.lastPosition.x;
    const dy = newPosition.y - player.lastPosition.y;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy); // Exact Euclidean distance

    // Vehicle ke hisab se kitna distance allowed tha?
    const maxAllowedDistance = MAX_SPEEDS[player.vehicle || 'Padal'] * timeDelta;

    // THE ANTI-CHEAT GATEKEEPER
    // 25% extra buffer diya hai taaki mobile network wale lag ke karan ban na ho
    if (distanceMoved > maxAllowedDistance * 1.25) {
        console.warn(`🚨 ANTI-CHEAT ALERT: ${player.id} is hacking! (Moved: ${distanceMoved.toFixed(2)}px, Allowed: ${(maxAllowedDistance * 1.25).toFixed(2)}px)`);
        return false; // Movement Reject kar do (Server Rubber-banding trigger karega)
    }

    // Movement sahi hai, nayi position save kar lo
    player.lastPosition = newPosition;
    player.lastMoveTime = now;
    return true; // Movement Accept
}
