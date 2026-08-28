// game-logic/antiCheat.js

// Har vehicle ki maximum allow speed (Pixels per second)
const MAX_SPEEDS = {
    'Padal': 150,
    'Bike': 300,
    'Car': 500
};

export function validateMovement(player, newPosition) {
    const now = Date.now();
    
    // Naya player hai, pehli movement hai
    if (!player.lastPosition) {
        player.lastPosition = newPosition;
        player.lastMoveTime = now;
        return true; 
    }

    // Time gap aur distance calculate karo
    const timeDelta = (now - player.lastMoveTime) / 1000; // in seconds
    const dx = newPosition.x - player.lastPosition.x;
    const dy = newPosition.y - player.lastPosition.y;
    const distanceMoved = Math.sqrt(dx * dx + dy * dy);

    // Vehicle ke hisab se kitna distance allowed tha?
    const maxAllowedDistance = MAX_SPEEDS[player.vehicle || 'Padal'] * timeDelta;

    // THE ANTI-CHEAT GATEKEEPER
    // Agar allowed se 20% jyada move kiya, toh hacker hai!
    if (distanceMoved > maxAllowedDistance * 1.2) {
        console.warn(`🚨 ANTI-CHEAT ALERT: ${player.id} is moving too fast! (Speed Hack)`);
        return false; // Movement Reject kar do
    }

    // Movement sahi hai, save kar lo
    player.lastPosition = newPosition;
    player.lastMoveTime = now;
    return true; // Movement Accept
}
