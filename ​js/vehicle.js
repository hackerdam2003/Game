// js/vehicle.js

console.log("🏎️ [Vehicles] Stats & Config Module Loaded!");

// ==========================================
// 1. Vehicle Stats Registry
// ==========================================
// Yahan hum decide karenge ki kaunsi gadi kitni tez bhaagegi aur mudegi
export const VEHICLE_STATS = {
    'Padal': {
        forwardSpeed: -150,  // Slowest (Paidal chalna)
        steerSpeed: 200,     // Normal handling
        width: 20,           // Chhota hitbox
        height: 20,
        color: 0x10b981      // Green box (Jab tak character image nahi aati)
    },
    'Bike': {
        forwardSpeed: -350,  // Fast speed
        steerSpeed: 450,     // Super sharp turning (Patli gadi)
        width: 25,           // Patla hitbox
        height: 55,
        color: 0xfbbf24      // Yellow box
    },
    'Car': {
        forwardSpeed: -500,  // Top Speed!
        steerSpeed: 250,     // Mudne me thodi bhari
        width: 45,           // Bada hitbox
        height: 80,
        color: 0x3b82f6      // Blue box
    }
};

// ==========================================
// 2. Helper Functions
// ==========================================

/**
 * Get stats safely. Returns 'Padal' if vehicle name is missing/wrong.
 */
export function getVehicleData(vehicleName) {
    return VEHICLE_STATS[vehicleName] || VEHICLE_STATS['Padal'];
}

/**
 * Applies size, color, and saves stats directly into the Phaser physics body
 */
export function applyVehicleAppearance(playerObj, vehicleName) {
    const stats = getVehicleData(vehicleName);
    
    // Update Hitbox Size & Shape
    playerObj.setSize(stats.width, stats.height);
    playerObj.setDisplaySize(stats.width, stats.height); 
    
    // Update Color (Placeholder UI)
    playerObj.setFillStyle(stats.color);
    
    // Save stats directly into the player object so the update() loop can read it instantly
    playerObj.vehicleStats = stats;
}
