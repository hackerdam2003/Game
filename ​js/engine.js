// js/engine.js

console.log("🎮 [Engine] Phaser Script Loaded!");

const config = {
    type: Phaser.AUTO,
    parent: 'game-viewport', // Matches the div class in game.html
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false 
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    transparent: true
};

// Start Engine
const game = new Phaser.Game(config);

// ---------------------------------------------------------
// Global Game State Variables
// ---------------------------------------------------------
let localPlayer;
let otherPlayers = {};
let isRaceActive = false; // Jab tak Host Start nahi dabayega, yeh false rahega
let lastEmitTime = 0;

// Movement & Steering Flags
let isSteeringLeft = false;
let isSteeringRight = false;
const FORWARD_SPEED = -200; // Negative Y means moving UP the track
const STEER_SPEED = 200;

// ---------------------------------------------------------
// 1. PRELOAD ASSETS
// ---------------------------------------------------------
function preload() {
    console.log("🎮 [Engine] Preloading Assets...");
    // Future me yahan aapki car.png aayegi
    // this.load.image('car', '../assets/vehicles/car.png');
}

// ---------------------------------------------------------
// 2. CREATE SCENE & MULTIPLAYER SETUP
// ---------------------------------------------------------
function create() {
    console.log("🎮 [Engine] Scene Created. Connecting Logic...");
    const scene = this;

    // Track Setup (Width 800, Height 10000 - Moving Upwards)
    this.physics.world.setBounds(0, -10000, window.innerWidth, 10000 + window.innerHeight);
    
    // Create Local Player Placeholder (Blue Box)
    // Jab images aayengi, isko this.physics.add.sprite me badal denge
    localPlayer = this.add.rectangle(window.innerWidth / 2, window.innerHeight - 150, 40, 70, 0x3b82f6);
    this.physics.add.existing(localPlayer);
    localPlayer.body.setCollideWorldBounds(true);

    // Camera Setup (Follow Local Player)
    this.cameras.main.startFollow(localPlayer, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, -10000, window.innerWidth, 10000 + window.innerHeight);

    // Group for Opponents
    this.otherPlayersGroup = this.add.group();

    // -----------------------------------------------------
    // HUD MOBILE CONTROLS INTEGRATION
    // -----------------------------------------------------
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    if (btnLeft && btnRight) {
        // Left Button
        btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); isSteeringLeft = true; });
        btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); isSteeringLeft = false; });
        btnLeft.addEventListener('mousedown', () => isSteeringLeft = true);
        btnLeft.addEventListener('mouseup', () => isSteeringLeft = false);

        // Right Button
        btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); isSteeringRight = true; });
        btnRight.addEventListener('touchend', (e) => { e.preventDefault(); isSteeringRight = false; });
        btnRight.addEventListener('mousedown', () => isSteeringRight = true);
        btnRight.addEventListener('mouseup', () => isSteeringRight = false);
    }

    // Keyboard Fallback (For PC Testing)
    this.cursors = this.input.keyboard.createCursorKeys();

    // -----------------------------------------------------
    // SOCKET.IO MULTIPLAYER SYNC
    // -----------------------------------------------------
    // Note: window.socket is initialized in game.html
    const socket = window.socket;

    if (socket) {
        // Race Start Signal from Server (Host pressed Start)
        socket.on('gameStarting', () => {
            console.log("🏁 [Engine] GO GO GO! Race Started!");
            isRaceActive = true;
        });

        // Other players position sync
        socket.on('updatePlayerPosition', (data) => {
            if (data.playerId === socket.id) return; // Ignore own sync
            
            if (otherPlayers[data.playerId]) {
                // Smooth Interpolation can be added here later
                otherPlayers[data.playerId].setPosition(data.position.x, data.position.y);
            } else {
                // Create New Opponent (Red Box)
                const newOpponent = scene.add.rectangle(data.position.x, data.position.y, 40, 70, 0xef4444);
                scene.physics.add.existing(newOpponent);
                otherPlayers[data.playerId] = newOpponent;
            }
        });

        // 🚨 ANTI-CHEAT RUBBER-BANDING (Server rejected movement)
        socket.on('forceTeleport', (safePosition) => {
            console.warn("🚨 [Anti-Cheat] Server pulled you back!");
            localPlayer.setPosition(safePosition.x, safePosition.y);
        });

        // Player Disconnect
        socket.on('playerLeft', (playerId) => {
            if (otherPlayers[playerId]) {
                otherPlayers[playerId].destroy();
                delete otherPlayers[playerId];
            }
        });
    }
}

// ---------------------------------------------------------
// 3. MAIN GAME LOOP (60 FPS)
// ---------------------------------------------------------
function update(time, delta) {
    if (!isRaceActive || !localPlayer) return;

    // 1. AUTO-FORWARD MOVEMENT (Racing logic)
    localPlayer.body.setVelocityY(FORWARD_SPEED);

    // 2. STEERING LOGIC (Mobile HUD + Keyboard)
    localPlayer.body.setVelocityX(0); // Reset X velocity

    if (isSteeringLeft || this.cursors.left.isDown) {
        localPlayer.body.setVelocityX(-STEER_SPEED);
    } else if (isSteeringRight || this.cursors.right.isDown) {
        localPlayer.body.setVelocityX(STEER_SPEED);
    }

    // 3. SYNC TO SERVER (Send position to backend 10 times per second to save bandwidth)
    if (window.socket && time > lastEmitTime + 100) { // 100ms interval
        window.socket.emit('playerMove', {
            x: localPlayer.x,
            y: localPlayer.y
        });
        lastEmitTime = time;
    }
}
