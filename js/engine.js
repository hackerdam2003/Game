// js/engine.js
console.log("🎮 [Game Engine] Open World Core Loaded!");

const urlParams = new URLSearchParams(window.location.search);
const gameRoomId = urlParams.get('roomId') || "GLOBAL-ROOM";

let myUid = window.localStorage.getItem('temp_uid') || "UID_" + Math.floor(Math.random()*9999);
let myName = window.localStorage.getItem('temp_name') || "Racer";
const players = {}; 

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (err) { console.warn("Fullscreen API skipped"); }

    overlay.style.display = 'none';
    hud.style.display = 'block';
    
    // Auto-Init Voice System
    if(window.initVoiceSystem) window.initVoiceSystem();

    startGameEngine();
};

function startGameEngine() {
    window.gameSocket.emit('join-world', { gameRoomId, uid: myUid, name: myName });

    window.gameSocket.on('world-state', (serverPlayers) => {
        serverPlayers.forEach(p => { players[p.uid] = p; });
        if (!players[myUid]) players[myUid] = { uid: myUid, name: myName, x: 500, y: 500 };
        updateTeamHUD();
    });

    window.gameSocket.on('player-moved', (data) => {
        if (!players[data.uid]) {
            players[data.uid] = { uid: data.uid, name: "Player", x: data.x, y: data.y };
            updateTeamHUD(); // New player joined, update list
        }
        players[data.uid].x = data.x;
        players[data.uid].y = data.y;
    });

    window.gameSocket.on('player-left', (data) => {
        delete players[data.uid];
        updateTeamHUD();
    });

    setupJoystick();
    requestAnimationFrame(renderLoop);
}

function updateTeamHUD() {
    const container = document.getElementById('team-hud-list');
    container.innerHTML = '';
    
    for (const uid in players) {
        const p = players[uid];
        const isMe = uid === myUid;
        container.innerHTML += `
            <div class="hud-profile" style="border-color: ${isMe ? '#3b82f6' : '#10b981'}">
                <span style="font-size: 16px;">${isMe ? '👦' : '🧑‍🤝‍🧑'}</span>
                <div style="color: white;">
                    <div style="font-size: 11px; font-weight: bold;">${p.name} ${isMe ? '(You)' : ''}</div>
                    <div class="hp-bar" style="width: 70px;"><div class="hp-fill"></div></div>
                </div>
            </div>
        `;
    }
}

// --- JOYSTICK LOGIC ---
let moveVector = { x: 0, y: 0 };
let speed = 6; 

function setupJoystick() {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    let isDragging = false;
    let center = { x: 0, y: 0 };

    base.addEventListener('touchstart', (e) => {
        isDragging = true;
        const rect = base.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        handleTouch(e);
    });
    base.addEventListener('touchmove', (e) => { if(isDragging) handleTouch(e); });
    base.addEventListener('touchend', () => {
        isDragging = false;
        knob.style.transform = `translate(0px, 0px)`;
        moveVector = { x: 0, y: 0 };
    });

    function handleTouch(e) {
        const touch = e.touches[0];
        let dx = touch.clientX - center.x;
        let dy = touch.clientY - center.y;
        const maxDist = 45;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        moveVector = { x: dx/maxDist, y: dy/maxDist };
    }
}

// --- RENDER LOOP (CANVAS) ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Camera Offset logic (So map moves with player)
let camX = 0, camY = 0;

function renderLoop() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const myPlayer = players[myUid];
    if (myPlayer) {
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            myPlayer.x += moveVector.x * speed;
            myPlayer.y += moveVector.y * speed;
            window.gameSocket.emit('move', { x: myPlayer.x, y: myPlayer.y });
        }
        // Center camera on my player
        camX = myPlayer.x - canvas.width / 2;
        camY = myPlayer.y - canvas.height / 2;
    }

    ctx.save();
    ctx.translate(-camX, -camY); // Move camera

    // 1. Draw Ground / Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for(let i=-2000; i<2000; i+=80) { ctx.beginPath(); ctx.moveTo(i,-2000); ctx.lineTo(i,2000); ctx.stroke(); }
    for(let i=-2000; i<2000; i+=80) { ctx.beginPath(); ctx.moveTo(-2000,i); ctx.lineTo(2000,i); ctx.stroke(); }

    // 2. Draw Environment (Houses & Showroom)
    drawEnvironment(ctx);

    // 3. Draw Players (Advanced Humanoid)
    for (const uid in players) {
        drawCharacter(ctx, players[uid], uid === myUid);
    }

    ctx.restore();
    requestAnimationFrame(renderLoop);
}

function drawEnvironment(ctx) {
    // --- Safe House ---
    ctx.fillStyle = '#451a03'; // House Wall
    ctx.fillRect(200, 100, 250, 200);
    ctx.fillStyle = '#000'; // Door
    ctx.fillRect(300, 220, 60, 80);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 20px Arial';
    ctx.fillText("Safe House", 325, 90);

    // --- Premium Car Showroom ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(700, 100, 400, 250);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(700, 100, 400, 250);
    
    // Display Car 1 inside Showroom
    ctx.fillStyle = '#ef4444'; // Red Sports Car
    ctx.fillRect(750, 180, 120, 60); 
    ctx.fillStyle = '#000'; // Wheels
    ctx.fillRect(770, 170, 20, 15); ctx.fillRect(830, 170, 20, 15);
    ctx.fillRect(770, 235, 20, 15); ctx.fillRect(830, 235, 20, 15);
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 24px Arial';
    ctx.fillText("Premium Cars (Buy with Coins)", 900, 80);
}

function drawCharacter(ctx, p, isMe) {
    // UID & Name Tag
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - 50);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px Arial';
    ctx.fillText(p.uid.substring(0,8), p.x, p.y - 38);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 20, 18, 8, 0, 0, Math.PI*2); ctx.fill();

    // Body (Torso)
    ctx.fillStyle = isMe ? '#3b82f6' : '#10b981';
    ctx.fillRect(p.x - 12, p.y - 15, 24, 30);

    // Head
    ctx.fillStyle = '#fcd34d'; // Skin tone
    ctx.beginPath(); ctx.arc(p.x, p.y - 25, 14, 0, Math.PI*2); ctx.fill();

    // Hands
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath(); ctx.arc(p.x - 18, p.y - 5, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 18, p.y - 5, 6, 0, Math.PI*2); ctx.fill();

    // Foot
    ctx.fillStyle = '#1e293b'; // Shoes
    ctx.fillRect(p.x - 12, p.y + 15, 10, 12);
    ctx.fillRect(p.x + 2, p.y + 15, 10, 12);

    // Weapon (Sword in right hand)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(p.x + 16, p.y - 35, 4, 35); // Sword blade
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(p.x + 12, p.y - 5, 12, 4); // Sword hilt
}
