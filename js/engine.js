// js/engine.js
console.log("🎮 [Game Engine] Client Core Loaded!");

// 🛑 NAYA: Connect strictly to the '/world' pipeline
const gameSocket = io('/world'); 

const urlParams = new URLSearchParams(window.location.search);
const gameRoomId = urlParams.get('roomId') || "GLOBAL-ROOM";
let myUid = null;
let myName = null;

const players = {}; 

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    // Landscape Mode Lock Try
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (err) { console.warn("Fullscreen/Orientation API error"); }

    overlay.style.display = 'none';
    hud.style.display = 'block';
    
    // Local storage ya session se data nikalna
    myUid = window.localStorage.getItem('temp_uid') || "UID_" + Math.floor(Math.random()*9999);
    myName = window.localStorage.getItem('temp_name') || "Racer";
    document.getElementById('player-name-hud').innerText = myName;

    startGameEngine();
};

function startGameEngine() {
    // 1. Join The Game World
    gameSocket.emit('join-world', { gameRoomId, uid: myUid, name: myName });

    gameSocket.on('world-state', (serverPlayers) => {
        serverPlayers.forEach(p => { players[p.uid] = p; });
        if (!players[myUid]) players[myUid] = { uid: myUid, name: myName, x: window.innerWidth/2, y: window.innerHeight/2 };
    });

    gameSocket.on('player-moved', (data) => {
        if (!players[data.uid]) players[data.uid] = { uid: data.uid, name: "Player", x: data.x, y: data.y };
        players[data.uid].x = data.x;
        players[data.uid].y = data.y;
    });

    gameSocket.on('player-left', (data) => {
        delete players[data.uid];
    });

    setupJoystick();
    requestAnimationFrame(renderLoop);
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

function renderLoop() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Open World Grid Background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for(let i=0; i<canvas.width; i+=60) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=60) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    const myPlayer = players[myUid];
    if (myPlayer && (moveVector.x !== 0 || moveVector.y !== 0)) {
        myPlayer.x += moveVector.x * speed;
        myPlayer.y += moveVector.y * speed;
        gameSocket.emit('move', { x: myPlayer.x, y: myPlayer.y });
    }

    for (const uid in players) {
        const p = players[uid];
        const isMe = uid === myUid;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 25, 20, 10, 0, 0, Math.PI * 2); ctx.fill();

        // Player Dot (Character base)
        ctx.fillStyle = isMe ? '#3b82f6' : '#ef4444';
        ctx.beginPath(); ctx.arc(p.x, p.y, 25, 0, Math.PI * 2); ctx.fill();

        // Name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isMe ? "You" : p.name, p.x, p.y - 35);
    }

    requestAnimationFrame(renderLoop);
}

// Button Events
document.getElementById('btn-attack').addEventListener('touchstart', () => gameSocket.emit('action', { action: 'attack' }));
