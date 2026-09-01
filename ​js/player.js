// js/player.js

console.log("🏎️ [Player] Physics & Logic Module Loaded!");

// ---------------------------------------------------------
// Player Physics Constants
// ---------------------------------------------------------
const FORWARD_SPEED = -250; // Negative Y means moving UP the track
const STEER_SPEED = 300;    // Left/Right turning speed

/**
 * Creates and configures the local player's car
 * @param {Object} scene - Phaser Scene
 * @param {number} x - Spawn X coordinate
 * @param {number} y - Spawn Y coordinate
 */
export function createLocalPlayer(scene, x, y) {
    // Blue Box Placeholder (Jab assets aayenge tab 'scene.add.sprite' ban jayega)
    const player = scene.add.rectangle(x, y, 40, 70, 0x3b82f6);
    scene.physics.add.existing(player);
    
    // Physics Configuration
    player.body.setCollideWorldBounds(true); // Track ke bahar na jaye
    player.body.setBounce(0.2); // Diwar se takrane par halka sa bounce
    player.body.setDrag(50); // Friction (phislan kam karne ke liye)
    
    return player;
}

/**
 * Creates and configures an opponent's car
 * @param {Object} scene - Phaser Scene
 * @param {number} x - Spawn X coordinate
 * @param {number} y - Spawn Y coordinate
 */
export function createOpponent(scene, x, y) {
    // Red Box Placeholder for Enemies
    const opponent = scene.add.rectangle(x, y, 40, 70, 0xef4444);
    scene.physics.add.existing(opponent);
    
    // Opponents ki movement server control karega, isliye unki physics simple rakhte hain
    opponent.body.setCollideWorldBounds(true);
    
    return opponent;
}

/**
 * Handles the steering and driving mechanics every frame (60 FPS)
 * @param {Object} player - Local player game object
 * @param {Object} cursors - Phaser keyboard cursors
 * @param {Object} touchState - Mobile on-screen button state { left: bool, right: bool }
 */
export function updatePlayerMovement(player, cursors, touchState) {
    if (!player || !player.body) return;

    // 1. AUTO-FORWARD RACING LOGIC
    player.body.setVelocityY(FORWARD_SPEED);

    // 2. STEERING LOGIC (Reset lateral movement first)
    player.body.setVelocityX(0);

    // Combine Keyboard and Mobile Touch inputs
    const isMovingLeft = touchState.left || (cursors && cursors.left.isDown);
    const isMovingRight = touchState.right || (cursors && cursors.right.isDown);

    if (isMovingLeft) {
        player.body.setVelocityX(-STEER_SPEED);
    } else if (isMovingRight) {
        player.body.setVelocityX(STEER_SPEED);
    }
}

